#!/bin/zsh
set -eo pipefail

echo "Starting entrypoint initialization..."

# Source OpenCode environment if available
if [ -f "/home/node/.opencode/env" ]; then
    echo "Sourcing OpenCode environment..."
    source "/home/node/.opencode/env"
fi

# ensure history directory/file exist so zsh doesn't choke
if [ -n "$HISTFILE" ]; then
    mkdir -p "$(dirname "$HISTFILE")" || true
    touch "$HISTFILE" || true
    # keep history owned by the runtime user when possible
    chown "$(id -u)":"$(id -g)" "$HISTFILE" || true
fi

# Display startup message
echo ""
echo "============================================="
echo "OpenCode Development Environment Ready!"
echo "============================================="
workspace_root="${WORKSPACE_ROOT:-/workspace}"
echo "Container: ${HOSTNAME:-unknown}"
echo "Workspace root: ${workspace_root}"

project_count=0
if [ -d "$workspace_root" ]; then
    while IFS= read -r project_dir; do
        project_name="$(basename "$project_dir")"
        echo "- ${project_name}: ${project_dir}"
        project_count=$((project_count + 1))
    done < <(find "$workspace_root" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort)
fi

if [ "$project_count" -eq 0 ]; then
    echo "No project mounts found under ${workspace_root}."
    echo "Hint: generate docker-compose.projects.yml from projects.env and run with both compose files."
    echo "Hint: cp projects.env.example projects.env"
fi
echo ""
echo "OpenCode $(opencode --version)"
echo "Node     $(node --version | sed 's/^v//')"
echo "npm      $(npm --version)"
echo "Python   $(python3 --version | awk '{print $2}')"
echo "============================================="
echo ""

# Execute the main container command (keeps container alive)
exec "$@"
