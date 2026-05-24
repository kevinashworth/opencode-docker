# OpenCode Docker

Docker-based OpenCode development environment with zsh tooling, persistent OpenCode state, and unlimited project mounts.

## Prerequisites

1. Docker Desktop (macOS) or Docker Engine + Compose plugin.
2. Docker daemon running.
3. Host directories for the projects you want mounted.

## First Run

1. Create your local project manifest.

```sh
cp projects.env.example projects.env
```

2. Edit `projects.env` and add the projects you want mounted.

3. Generate project mounts and validate compose config.

```sh
npm run compose:config
```

4. Start the container.

**Timezone Notice:**
By default, the container sets `TZ=America/New_York`. If you are in a different timezone, edit the `TZ` variable in the Dockerfile to match your local timezone (e.g., `Europe/Berlin`), or remove it for UTC.

On first startup, Docker Compose builds the image if it does not exist yet. If the image already exists locally, this command reuses it and does not force a rebuild. So after making changes to Dockerfile, run `npm run rebuild` then `npm run up`.

```sh
npm run up
```

5. Open a shell in the running container.

```sh
npm run shell
```

## Unlimited Project Mounts

This repo supports any number of projects. Project mounts are generated from `projects.env` into `docker-compose.projects.yml` automatically by most commands. You rarely need to run `npm run projects:generate` directly; use it only if you want to regenerate the file without starting containers or validating config.

If you want to run Docker Compose manually, use both compose files together:

```sh
docker compose -f docker-compose.yml -f docker-compose.projects.yml up -d
```

## Build and Rebuild Behavior

- `npm run up`: Starts containers and uses the current local image. Builds only if the image is missing.
- `npm run rebuild`: Forces an image rebuild and then starts containers (`up -d --build`).
- Use `npm run rebuild` after changing `Dockerfile`, `entrypoint.sh`, dotfiles copied into the image, or installed tooling.
- Use `npm run up` for normal daily start/stop cycles when the image does not need to change.

## Manifest Format

In `projects.env`, each non-comment line is:

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

## Behavior and Validation

The generator script validates:

- Empty lines and comments are ignored.
- Duplicate container folder names are rejected.
- Invalid folder names are rejected.
- Missing host paths are rejected.

On startup, the entrypoint prints project directories under `/workspace`.

The TUI theme is set in `dotconfig/opencode/tui.json`; available themes are in `dotconfig/opencode/themes/`.

### Custom Environment Variables

If you want to inject custom environment variables at container startup, create a file at `/home/node/.opencode/env` inside the container. This file will be sourced automatically by the entrypoint script.

## Core Commands

```sh
npm run projects:generate   # regenerate docker-compose.projects.yml only
npm run compose:config      # regenerate mounts + validate merged compose config
npm run up                  # regenerate mounts + start (detached)
npm run rebuild             # regenerate mounts + rebuild image + start
npm run shell               # open zsh in the running container
npm run logs                # tail container logs
npm run down                # stop and remove containers
npm run down:volumes        # stop and remove containers AND DELETE ALL persistent volumes (data loss!)
```

## Security Model

### Isolation by Design

This container intentionally has no access to your SSH keys, `.gitconfig`, `.env` files, or any other host dotfiles. That is the point.

OpenCode runs with exactly the tools and context you give it — nothing more. Your credentials, tokens, and personal configuration stay on your host. If a workflow requires git authentication inside the container, provision a dedicated key or token scoped only to that use case and mount it explicitly.

### Runtime User Model

The container runs as non-root uid/gid `1000` from the base `node:24` image (the upstream `node` user).

This follows the official Docker Node guidance for non-root operation: <https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#non-root-user>

This keeps day-to-day shell usage non-root while still allowing predictable ownership for mounted files and Docker volumes.

The `linuxbrew` user in the Dockerfile is separate from runtime. It exists only so Homebrew can be installed and managed as a non-root user during image build.

Runtime state and config live under `/home/node`.

### How to Override Isolation by Design

If you must enable git authentication inside the container, mount dedicated credentials created specifically for this environment. Do not mount your personal `~/.ssh` or `~/.gitconfig`.

```yaml
volumes:
  - /path/to/opencode-only/id_ed25519:/home/node/.ssh/id_ed25519:ro
  - /path/to/opencode-only/gitconfig:/home/node/.gitconfig:ro
```

The `:ro` flag prevents the container from modifying those mounted credentials. Keep them narrowly scoped and separate from your personal workstation identity.

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
