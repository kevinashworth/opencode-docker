# Development Notes

## Testing

The `config.env` generator has a test suite:

```sh
npm run test:config
```

Tests use a temporary directory and clean up on exit (no side effects).

The generator is [`scripts/generate-compose-override.js`](scripts/generate-compose-override.js). The test file is [`scripts/generate-compose-override.test.js`](scripts/generate-compose-override.test.js). Both use Node.js built-in modules only (no external dependencies).

## Versioning

This project uses [Semantic Versioning](https://semver.org/) with [Conventional Commits](https://www.conventionalcommits.org/).

| Commit type        | SemVer bump |
| ------------------ | ----------- |
| `fix:`             | Patch       |
| `feat:`            | Minor       |
| `BREAKING CHANGE:` | Major       |

Commit messages are validated by commitlint on every `git commit`. The allowed types are `feat`, `fix`, `docs`, `style`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`, and `revert`.

### Creating a release (two-step workflow)

Releases use a two-step process to keep the version tag on `main` and prevent
the conventional-changelog from re-discovering already-released features
(see "Why this workflow?" below).

**Step 1 — Prepare on the feature branch**

Before opening a PR, bump the version and generate the changelog entry:

```sh
npm run release:prepare
```

This scans commits since the last tag, bumps `package.json`, writes a
CHANGELOG entry, and commits both. It does **not** create a tag or push.
It is also **blocked on `main`** — run it on your feature branch.

To preview the next version without writing anything:

```sh
npm run release:dry
```

**Step 2 — Tag on `main` after merge**

After the PR is merged (via merge commit), pull `main` and tag:

```sh
git checkout main && git pull
npm run release:tag
```

This reads the version from `package.json`, creates a local tag, and pushes
it to the remote. This is **blocked on feature branches** — run it on `main`.

**Why this workflow?**

The conventional-changelog plugin discovers new commits by running
`git log <last-tag>..HEAD`. If the last tag lives on a feature branch tip
that was later merged to `main`, that log range includes every commit from
the entire merged branch — including features from releases that were
already cut. Those features get duplicated into the next changelog entry.

By keeping tags on `main` (at merge commits), each new feature branch's
`git log <last-tag>..HEAD` resolves to exactly the commits on that branch.
The right features appear in the right release.
