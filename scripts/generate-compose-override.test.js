#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const GENERATOR = path.join(__dirname, "generate-compose-override.js");
const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-test-"));

let pass = 0;
let fail = 0;

function cleanup() {
  fs.rmSync(tmpdir, { recursive: true, force: true });
}

process.on("exit", () => {
  cleanup();
});
process.on("SIGINT", () => {
  process.exit(1);
});

function incPass(desc) {
  console.log("  PASS: " + desc);
  pass++;
}

function incFail(desc, detail) {
  console.log("  FAIL: " + desc);
  if (detail) console.log("    " + detail);
  fail++;
}

function runGenerator(configPath, outputPath) {
  try {
    const result = execFileSync(process.execPath, [GENERATOR, configPath, outputPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (e) {
    return {
      code: e.status != null ? e.status : 1,
      stdout: e.stdout || "",
      stderr: e.stderr || "",
    };
  }
}

function assertRC(expected, desc, configContent) {
  const configPath = path.join(tmpdir, "config.env");
  const outputPath = path.join(tmpdir, "out.yml");
  if (configContent !== null) {
    fs.writeFileSync(configPath, configContent, "utf8");
  }
  const { code, stderr } = runGenerator(configPath, outputPath);
  if (code === expected) {
    incPass(desc);
  } else {
    incFail(desc + " (expected exit " + expected + ", got " + code + ")", "stderr: " + stderr);
  }
}

function assertEnv(config, key, value, desc) {
  const configPath = path.join(tmpdir, "config.env");
  const outputPath = path.join(tmpdir, "out.yml");
  fs.writeFileSync(configPath, config, "utf8");
  const { code, stderr } = runGenerator(configPath, outputPath);
  if (code !== 0) {
    incFail(desc + " (generator exited " + code + ")", "stderr: " + stderr);
    return;
  }
  const output = fs.readFileSync(outputPath, "utf8");
  const expected = '      - "' + key + "=" + value + '"';
  if (output.includes(expected)) {
    incPass(desc);
  } else {
    incFail(desc + " (expected env '" + key + "=" + value + "' not found)", "Output:\n" + output);
  }
}

function assertVolume(config, expected, desc) {
  const configPath = path.join(tmpdir, "config.env");
  const outputPath = path.join(tmpdir, "out.yml");
  fs.writeFileSync(configPath, config, "utf8");
  const { code, stderr } = runGenerator(configPath, outputPath);
  if (code !== 0) {
    incFail(desc + " (generator exited " + code + ")", "stderr: " + stderr);
    return;
  }
  const output = fs.readFileSync(outputPath, "utf8");
  const expectedLine = '      - "' + expected + '"';
  if (output.includes(expectedLine)) {
    incPass(desc);
  } else {
    incFail(desc + " (expected volume '" + expected + "' not found)", "Output:\n" + output);
  }
}

function assertOutputContains(config, expectedLine, desc) {
  const configPath = path.join(tmpdir, "config.env");
  const outputPath = path.join(tmpdir, "out.yml");
  fs.writeFileSync(configPath, config, "utf8");
  const { code, stderr } = runGenerator(configPath, outputPath);
  if (code !== 0) {
    incFail(desc + " (generator exited " + code + ")", "stderr: " + stderr);
    return;
  }
  const output = fs.readFileSync(outputPath, "utf8");
  if (output.includes(expectedLine)) {
    incPass(desc);
  } else {
    incFail(desc + " (expected line not found)", "Output:\n" + output);
  }
}

console.log("=== generate-compose-override.js tests ===");
console.log("");

// --- TZ ---
console.log("--- TZ ---");
assertEnv("TZ=Europe/Berlin", "TZ", "Europe/Berlin", "sets TZ environment variable");
assertEnv("TZ=UTC", "TZ", "UTC", "supports UTC timezone");

// --- env: prefix ---
console.log("--- env: prefix ---");
assertEnv("env:EDITOR=vim", "EDITOR", "vim", "strips env: prefix");
assertEnv(
  "env:NODE_ENV=production",
  "NODE_ENV",
  "production",
  "supports env: values with underscores",
);
assertOutputContains(
  'env:QUOTED=he said "hi" \\ path',
  '      - "QUOTED=he said \\"hi\\" \\\\ path"',
  "escapes quotes and backslashes in env: values",
);
assertRC(1, "rejects bare env: without key name", "env:=value");

// --- SSH_PRIVATE_KEY ---
console.log("--- SSH_PRIVATE_KEY ---");
fs.writeFileSync(path.join(tmpdir, "id_ed25519"), "ssh private key content", "utf8");
assertVolume(
  "SSH_PRIVATE_KEY=" + tmpdir + "/id_ed25519",
  tmpdir + "/id_ed25519:/home/node/.ssh/id_ed25519:ro",
  "mounts private key to .ssh/id_ed25519",
);
fs.writeFileSync(path.join(tmpdir, "id_rsa"), "rsa key content", "utf8");
assertVolume(
  "SSH_PRIVATE_KEY=" + tmpdir + "/id_rsa",
  tmpdir + "/id_rsa:/home/node/.ssh/id_rsa:ro",
  "uses source basename for target path (id_rsa)",
);
assertRC(1, "rejects missing SSH key file", "SSH_PRIVATE_KEY=/nonexistent/key");

// --- SSH_PUBLIC_KEY ---
console.log("--- SSH_PUBLIC_KEY ---");
fs.writeFileSync(path.join(tmpdir, "id_ed25519.pub"), "ssh public key content", "utf8");
assertVolume(
  "SSH_PUBLIC_KEY=" + tmpdir + "/id_ed25519.pub",
  tmpdir + "/id_ed25519.pub:/home/node/.ssh/id_ed25519.pub:ro",
  "mounts public key to .ssh/id_ed25519.pub",
);
assertRC(1, "rejects missing SSH public key file", "SSH_PUBLIC_KEY=/nonexistent/key.pub");

// --- Project mounts ---
console.log("--- Project mounts ---");
fs.mkdirSync(path.join(tmpdir, "my-project"), { recursive: true });
assertVolume(
  "my-project=" + tmpdir + "/my-project",
  tmpdir + "/my-project:/workspace/my-project",
  "project mount under /workspace",
);
assertVolume(
  "sub=" + tmpdir + "/my-project",
  tmpdir + "/my-project:/workspace/sub",
  "configurable target folder name",
);

// --- Relative project paths ---
console.log("--- Relative project paths ---");
fs.mkdirSync(path.join(tmpdir, "config-root", "project-dir"), { recursive: true });
fs.mkdirSync(path.join(tmpdir, "host-project"), { recursive: true });
const relConfigPath = path.join(tmpdir, "config-root", "config.env");
const relOutputPath = path.join(tmpdir, "out.yml");
fs.writeFileSync(relConfigPath, "rel=../host-project", "utf8");
const relResult = runGenerator(relConfigPath, relOutputPath);
if (relResult.code !== 0) {
  incFail(
    "resolves project paths relative to the config file directory (generator exited " +
      relResult.code +
      ")",
    "stderr: " + relResult.stderr,
  );
} else {
  const output = fs.readFileSync(relOutputPath, "utf8");
  const expected = '      - "' + path.resolve(tmpdir, "host-project") + ':/workspace/rel"';
  if (output.includes(expected)) {
    incPass("resolves project paths relative to the config file directory");
  } else {
    incFail(
      "resolves project paths relative to the config file directory (expected mount not found)",
      "Output:\n" + output,
    );
  }
}

// --- Duplicate project names ---
console.log("--- Duplicates ---");
assertRC(1, "rejects duplicate project names", "dup=/tmp\ndup=/tmp");

// --- Invalid project name ---
console.log("--- Invalid names ---");
fs.mkdirSync(path.join(tmpdir, "test"), { recursive: true });
assertRC(1, "rejects project name with spaces", "bad name=" + tmpdir + "/test");

// --- Empty config ---
console.log("--- Empty config ---");
assertRC(0, "empty config exits 0", "# just a comment\n\n");
const emptyOutput = fs.readFileSync(path.join(tmpdir, "out.yml"), "utf8");
if (emptyOutput.includes("# No overrides configured")) {
  incPass("empty config produces comment");
} else {
  incFail("empty config should produce '# No overrides configured'", "Output:\n" + emptyOutput);
}

// --- env: hint on stderr ---
console.log("--- env: hint ---");
const hintConfigPath = path.join(tmpdir, "config.env");
const hintOutputPath = path.join(tmpdir, "out.yml");
fs.writeFileSync(hintConfigPath, "NODE_ENV=development", "utf8");
const hintResult = runGenerator(hintConfigPath, hintOutputPath);
if (hintResult.code === 1 && hintResult.stderr.includes("use 'env:NODE_ENV=development'")) {
  incPass("suggests env: prefix when value looks like a simple string");
} else {
  incFail("expected hint about env: prefix", "stderr: " + hintResult.stderr);
}

// --- Missing config file ---
console.log("--- Missing config file ---");
assertRC(1, "missing config file exits 1", null);

// --- No sections when empty ---
console.log("--- Sections omitted correctly ---");
assertRC(0, "empty generator", "# just a comment\n\n");
const sectionsOutput = fs.readFileSync(path.join(tmpdir, "out.yml"), "utf8");
const hasServices = sectionsOutput.includes("services:");
const hasEnvironment = sectionsOutput.includes("environment:");
const hasVolumes = sectionsOutput.includes("volumes:");
if (hasServices) {
  incFail("services section present when empty");
} else if (hasEnvironment) {
  incFail("environment section present when empty");
} else if (hasVolumes) {
  incFail("volumes section present when empty");
} else {
  incPass("no services/environment/volumes sections in empty output");
}

console.log("");
console.log("=== Results: " + pass + " passed, " + fail + " failed ===");
if (fail > 0) process.exit(1);
