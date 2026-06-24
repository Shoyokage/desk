# Setup

Desk runs three ways. Pick what you need — the web app needs nothing installed.

## 1. Web app (zero setup)

Open `app/index.html` in any modern browser. Done. Your data is saved locally in the browser (IndexedDB).

## 2. PWA (installable, offline)

```bash
cd pwa
python3 -m http.server 8080
# open http://localhost:8080 and use the browser's "Install" option
```

Regenerate the PWA after editing the app: `cd desktop && npm run sync`.

## 3. macOS app (menubar, buddy, widgets, local voice + AI)

**Requirements:** macOS · [Node.js](https://nodejs.org) 18+ · Apple-silicon recommended (for fast on-device AI).

```bash
cd desktop
npm install
npm start            # run in dev
# or build a double-clickable Desk.app:
npm run package      # output in desktop/dist/
```

The menubar (tray) icon gives you **Open Desk**, **Quick capture (⌥⌘Space)**, and a **Desk buddy** toggle.

---

## Voice & AI (optional, 100% on-device)

Desk turns speech into tasks privately — nothing leaves your machine.

- **Speech → text:** Whisper (`Xenova/whisper-base.en`) via `@huggingface/transformers`. It **auto-downloads (~40MB) on first use** and is cached. No setup needed.
- **Text → intent:** a local LLM via **[Ollama](https://ollama.com)**.

### Set up the LLM (one time)

```bash
# 1. Install Ollama
brew install ollama            # or download from https://ollama.com

# 2. Start it (Ollama usually runs as a background service after install)
ollama serve                   # if it isn't already running

# 3. Pull the default model (~0.8GB)
ollama pull gemma3:1b
```

Prefer a bigger/smaller model? Pull any chat model (e.g. `ollama pull gemma3:4b` or `llama3.2:3b`) and select it in step below.

### Connect Desk to it

Open Desk → click **`Desk ▾`** (top-left menu) → **Voice & AI…**:

- **Ollama host** — default `http://127.0.0.1:11434` (change if Ollama runs elsewhere).
- **Model** — default `gemma3:1b` (type any model you've pulled; the field suggests installed ones).
- **Test connection** — confirms Ollama is reachable and the model is installed.
- **Save.**

Then use voice with **⌥⌘V** (or the mic in the dock). Your choice is remembered.

> If "Test connection" fails: make sure `ollama serve` is running and you've pulled the model. The settings page tells you exactly which.

A convenience script is provided: `./setup.sh` (installs Ollama via Homebrew if missing, pulls the model, and runs `npm install` in `desktop/`).

---

## Übersicht widgets

Desktop widgets that mirror your day (today · momentum · focus · activity heatmap). See [`widgets/README.md`](widgets/README.md).

## Chrome "now playing" companion

Lets the buddy groove when music plays in Chrome. See [`extension/README.md`](extension/README.md).
