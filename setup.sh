#!/usr/bin/env bash
# Desk — one-shot setup for the macOS app + local Voice & AI.
# Safe to re-run. Installs nothing without telling you.
set -e

echo "→ Desk setup"
echo

# --- Node check ---
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js not found. Install it from https://nodejs.org (18+), then re-run."
  exit 1
fi
echo "✓ Node $(node -v)"

# --- Ollama (optional, for Voice & AI) ---
if command -v ollama >/dev/null 2>&1; then
  echo "✓ Ollama installed"
else
  if command -v brew >/dev/null 2>&1; then
    read -r -p "Install Ollama (local AI) via Homebrew now? [y/N] " ans
    [[ "$ans" =~ ^[Yy]$ ]] && brew install ollama || echo "  skipped — install later from https://ollama.com"
  else
    echo "• Ollama not found. For Voice & AI, install it from https://ollama.com (optional)."
  fi
fi

# --- Pull the default model (optional) ---
if command -v ollama >/dev/null 2>&1; then
  read -r -p "Pull the default model 'qwen2.5:7b' (~4.7GB) now? [y/N] " ans
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    ( ollama serve >/dev/null 2>&1 & ) ; sleep 2
    ollama pull qwen2.5:7b || echo "  couldn't pull — run 'ollama pull qwen2.5:7b' later"
  fi
fi

# --- Desktop app deps ---
echo
echo "→ Installing the macOS app dependencies (desktop/)…"
( cd "$(dirname "$0")/desktop" && npm install )

echo
echo "✓ Done."
echo "  • Run the app:    cd desktop && npm start"
echo "  • Web app only:   open app/index.html"
echo "  • Connect AI:     Desk ▾ menu → Voice & AI… → Test connection"
