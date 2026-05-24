# Use node:24 as base image (newer glibc, upgraded per request)
FROM node:24

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    HOMEBREW_INSTALL_BADGE="☕️" \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    TZ=America/New_York

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    git \
    less \
    libdbus-1-3 \
    openssh-client \
    python3 \
    python3-pip \
    zsh \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for Homebrew
RUN useradd -m -s /bin/zsh linuxbrew && \
    usermod -aG sudo linuxbrew && \
    mkdir -p /home/linuxbrew/.linuxbrew && \
    chown -R linuxbrew: /home/linuxbrew/.linuxbrew

# Install Oh My Zsh assets, plugins, and theme
COPY scripts/zsh-in-docker.sh /tmp/zsh-in-docker.sh
USER 1000
RUN HOME=/home/node sh /tmp/zsh-in-docker.sh \
    -t https://github.com/romkatv/powerlevel10k \
    -p history \
    -p zoxide \
    -p https://github.com/zsh-users/zsh-autosuggestions \
    -p https://github.com/zsh-users/zsh-history-substring-search \
    -p https://github.com/zsh-users/zsh-syntax-highlighting
USER root

# Install Homebrew (Linuxbrew)
USER linuxbrew
RUN /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
USER root
RUN chown -R linuxbrew:linuxbrew /home/linuxbrew/.linuxbrew
ENV PATH="/home/linuxbrew/.linuxbrew/bin:${PATH}"
RUN git config --global --add safe.directory /home/linuxbrew/.linuxbrew/Homebrew

USER linuxbrew
RUN brew update && \
    brew install eza fzf lazygit zoxide anomalyco/tap/opencode && \
    brew cleanup -s
USER root

# OpenCode defaults in image (compose bind mount can still override at runtime)
RUN mkdir -p \
    /home/node/.config/opencode \
    /home/node/.opencode \
    /home/node/.local/share/opencode \
    /home/node/.local/state/opencode
COPY dotconfig/opencode/skills /home/node/.config/opencode/skills

# Runtime shell personalization (late so prompt tweaks rebuild fast)
COPY dotfiles/.p10k.zsh /home/node/.p10k.zsh
COPY dotfiles/.zshrc /home/node/.zshrc
RUN mkdir -p /home/node/.zsh-history && \
    touch /home/node/.zsh-history/.zsh_history && \
    chown -R node:node /home/node/.config /home/node/.opencode /home/node/.local /home/node/.p10k.zsh /home/node/.zshrc /home/node/.zsh-history

# Workspace setup
ENV WORKSPACE_ROOT=/workspace
WORKDIR /workspace
RUN mkdir -p /workspace

# Entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set zsh as default shell
SHELL ["/bin/zsh", "-c"]

# Run container as non-root by default
USER 1000

# Default command
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["zsh"]