# OpenCode Docker

Docker-based OpenCode development environment with zsh tooling, persistent OpenCode state, and unlimited project mounts.

## Prerequisites

1. Docker Desktop (macOS) or Docker Engine + Compose plugin.
2. Docker daemon running.
3. Host directories for the projects you want mounted.

## First Run

1. Create your configuration file.

```sh
cp config.env.example config.env
```

2. Edit `config.env` and add the projects you want mounted.

3. Generate the Compose override and validate the merged config.

```sh
npm run compose:config
```

4. Start the container.

```sh
npm run up
```

5. Open a shell in the running container.

```sh
npm run shell
```

## Configuration

All configuration lives in a single **`config.env`** file (gitignored). A generator script reads it and produces `docker-compose.override.yml` (also gitignored), which is merged with `docker-compose.yml` at runtime.

You rarely need to run `npm run config:generate` directly — it runs automatically before `up`, `rebuild`, and `compose:config`.

If you run Docker Compose manually, use both files together:

```sh
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

## Build and Rebuild Behavior

- `npm run up`: Starts containers and uses the current local image. Builds only if the image is missing.
- `npm run rebuild`: Forces an image rebuild and then starts containers (`up -d --build`).
- Use `npm run rebuild` after changing `Dockerfile`, `entrypoint.sh`, dotfiles copied into the image, or installed tooling.
- Use `npm run up` and `npm run down` for normal daily start/stop cycles when the image does not need to change.

## Config File Format

In `config.env`, each non-comment line is a `key=value` entry. The generator recognizes four categories:

### Timezone

```text
TZ=Europe/Berlin
```

Sets the container runtime timezone. Defaults to `America/New_York` (from the Dockerfile) if unset.

### SSH Credentials

```text
SSH_PRIVATE_KEY=~/.ssh/opencode/id_ed25519
SSH_PUBLIC_KEY=~/.ssh/opencode/id_ed25519.pub
```

Mounts dedicated SSH keys into the container (both `:ro`). The target path mirrors the source filename — `~/.ssh/id_rsa` becomes `/home/node/.ssh/id_rsa`, `~/.ssh/opencode/id_ed25519` becomes `/home/node/.ssh/id_ed25519`.

**Use dedicated, scoped keys only** — do not mount your personal `~/.ssh`.

### SSH known_hosts policy

This project requires host trust to be stored in `/home/node/.ssh/known_hosts`.

If SSH reports it cannot write `known_hosts`, fix only the SSH directory and known_hosts file (do not use recursive `chown` because mounted key files are read-only):

```sh
docker compose exec -u root opencode sh -lc 'mkdir -p /home/node/.ssh && chown node:node /home/node/.ssh && touch /home/node/.ssh/known_hosts && chown node:node /home/node/.ssh/known_hosts && chmod 700 /home/node/.ssh && chmod 600 /home/node/.ssh/known_hosts'
```

#### Troubleshooting

If `npm run shell` shows permission errors for `/home/node/.ssh` or `/home/node/.ssh/known_hosts`, run the command above once, then restart the container:

```sh
npm run down && npm run up
```

### Custom Environment Variables

Any line starting with `env:` is injected as a runtime environment variable (the prefix is stripped):

```text
env:EDITOR=vim
env:NODE_ENV=development
```

The `env:` prefix distinguishes environment variables from project mount entries, which use the same `name=value` syntax but point to host directories.

### Project Mounts

Everything else is treated as a project mount:

```text
container_folder_name=/absolute/or/relative/host/path
```

Example:

```text
my-app=/Users/fizzbuzz/my-app
api=../api
ui=../my-ui
```

Generated mounts become:

- `/workspace/my-app`
- `/workspace/api`
- `/workspace/ui`

### Validation

The generator validates:

- The config file exists (create it from `config.env.example` if missing).
- Empty lines and comments are ignored.
- Duplicate project names are rejected.
- Invalid project names are rejected.
- Missing host paths or SSH key files are rejected.

On startup, the entrypoint prints project directories under `/workspace`.

The TUI theme is set in `dotconfig/opencode/tui.json`; available themes are in `dotconfig/opencode/themes/`.

## Core Commands

```sh
npm run config:generate     # regenerate docker-compose.override.yml only
npm run test:config         # run the generator test suite (22 tests)
npm run compose:config      # regenerate override + validate merged compose config
npm run up                  # regenerate override + start (detached)
npm run rebuild             # regenerate override + rebuild image + start
npm run shell               # open zsh in the running container
npm run logs                # tail container logs
npm run down                # stop and remove containers
npm run down:volumes        # stop and remove containers AND DELETE ALL persistent volumes (data loss!)
```

## Security Model

### Isolation by Design

This container starts with no access to your host dotfiles — no SSH keys, no `.gitconfig`, no personal credentials. That's intentional.

If your workflow needs git or SSH authentication inside the container, you opt into it explicitly through `config.env` using a dedicated, scoped key created specifically for this environment. Do not mount your personal `~/.ssh`.

### Runtime User Model

The container runs as non-root uid/gid `1000` from the base `node:24` image (the upstream `node` user).

This follows the official Docker Node guidance for non-root operation: <https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#non-root-user>

This keeps day-to-day shell usage non-root while still allowing predictable ownership for mounted files and Docker volumes.

The `linuxbrew` user in the Dockerfile is separate from runtime. It exists only so Homebrew can be installed and managed as a non-root user during image build.

Runtime state and config live under `/home/node`.

### How to Override Isolation by Design

If you must enable git or SSH authentication inside the container, set `SSH_PRIVATE_KEY` (and optionally `SSH_PUBLIC_KEY`) in `config.env` to point to a dedicated key created specifically for this environment:

```text
SSH_PRIVATE_KEY=~/.ssh/opencode/id_ed25519
SSH_PUBLIC_KEY=~/.ssh/opencode/id_ed25519.pub
```

The keys are mounted with `:ro` to prevent the container from modifying them. Keep them narrowly scoped and separate from your personal workstation identity.

If you also need a custom `.gitconfig`, mount it by adding a volume entry to `docker-compose.override.yml` directly (the generator does not produce arbitrary file mounts).

## Container Naming

- This setup does not pin a global `container_name`, so Docker Compose auto-generates names and avoids cross-project naming conflicts.
- If you want an explicit stack namespace, set `COMPOSE_PROJECT_NAME` in your environment before running commands.

## Persistent Volumes

- `opencode_home` -> `/home/node/.opencode`
- `opencode_data` -> `/home/node/.local/share/opencode`
- `opencode_state` -> `/home/node/.local/state/opencode`
- `zsh_history` -> `/home/node/.zsh-history` (history file lives at `/home/node/.zsh-history/.zsh_history`)

See [DEVELOPMENT.md](DEVELOPMENT.md) for versioning and release instructions.

## Non-goals

- No assumptions about sibling repos.
- No project-specific names baked in.
- No fixed cap on number of mounted projects.
