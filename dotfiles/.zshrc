# Full runtime .zshrc for Docker image

# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

export TERM=xterm-256color

export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="powerlevel10k/powerlevel10k"
plugins=(
  history
  zoxide
  zsh-autosuggestions
  zsh-history-substring-search
  zsh-syntax-highlighting
)
source $ZSH/oh-my-zsh.sh

# See https://github.com/zsh-users/zsh-history-substring-search
bindkey "${terminfo[kcuu1]}" history-substring-search-up
bindkey "${terminfo[kcud1]}" history-substring-search-down
bindkey "^[[A" history-substring-search-up
bindkey "^[[B" history-substring-search-down

alias ls="eza"
alias la="eza -a"
alias ll="eza -l"
alias lla="eza -las modified"
alias llr="eza -alrs modified"

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh


# Ensure UTF-8 rendering in TTY/pager output.
export LESSCHARSET="utf-8"
export LESS="-RFX"

# store history in the mounted directory (see docker-compose)
export HISTFILE=/home/node/.zsh-history/.zsh_history
