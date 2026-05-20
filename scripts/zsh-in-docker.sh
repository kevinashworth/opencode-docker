#!/bin/sh

# Inspired by https://github.com/deluan/zsh-in-docker

set -e

THEME=default
PLUGINS=""

while getopts ":t:p:" opt; do
    case ${opt} in
        t)  THEME=$OPTARG
            ;;
        p)  PLUGINS="${PLUGINS}$OPTARG "
            ;;
        \?)
            echo "Invalid option: $OPTARG" 1>&2
            ;;
        :)
            echo "Invalid option: $OPTARG requires an argument" 1>&2
            ;;
    esac
done
shift $((OPTIND -1))

echo
echo "Installing Oh-My-Zsh with:"
echo "  THEME   = $THEME"
echo "  PLUGINS = $PLUGINS"
echo

is_url() {
    case "$1" in
        http://*|https://*) return 0 ;;
        *) return 1 ;;
    esac
}

cd /tmp

# Install On-My-Zsh
if [ ! -d "$HOME"/.oh-my-zsh ]; then
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

# Install URL-based plugins into custom plugins dir
for plugin in $PLUGINS; do
    if is_url "$plugin"; then
        plugin_name=$(basename "$plugin")
        git clone --depth 1 "$plugin" "$HOME"/.oh-my-zsh/custom/plugins/"$plugin_name"
    fi
done

# Handle themes
if is_url "$THEME"; then
    theme_repo=$(basename "$THEME")
    THEME_DIR="$HOME/.oh-my-zsh/custom/themes/$theme_repo"
    git clone --depth 1 "$THEME" "$THEME_DIR"
    theme_name=$(cd "$THEME_DIR"; ls *.zsh-theme | head -1)
    theme_name="${theme_name%.zsh-theme}"
    THEME="$theme_repo/$theme_name"
fi

# Install powerlevel10k theme assets if no other theme was specified.
# Root .zshrc itself is managed separately by Dockerfile.
if [ "$THEME" = "default" ]; then
    git clone --depth 1 https://github.com/romkatv/powerlevel10k "$HOME"/.oh-my-zsh/custom/themes/powerlevel10k
fi
