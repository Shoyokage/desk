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

- **Speech → text:** Whisper (`Xenova/whisper-small.en`) via `@huggingface/transformers`. The packaged **DMG release bundles the model**, so voice works fully offline — no setup, no download. A from-source build **auto-downloads it (~240MB) on first use** and caches it, so the first voice use needs network once. (On a restricted network that blocks Hugging Face, use the bundled release instead.)
- **Text → intent:** a local LLM via **[Ollama](https://ollama.com)**.

### Set up the LLM (one time)

```bash
# 1. Install Ollama
brew install ollama            # or download from https://ollama.com

# 2. Start it (Ollama usually runs as a background service after install)
ollama serve                   # if it isn't already running

# 3. Pull the default model (~4.7GB)
ollama pull qwen2.5:7b
```

Prefer a lighter model for a low-RAM machine? Pull any chat model (e.g. `ollama pull qwen2.5:3b` or `llama3.2:3b`) and select it in the step below.

### Connect Desk to it

Open Desk → click **`Desk ▾`** (top-left menu) → **Voice & AI…**:

- **Ollama host** — default `http://127.0.0.1:11434` (change if Ollama runs elsewhere).
- **Model** — default `qwen2.5:7b` (type any model you've pulled; the field suggests installed ones).
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

---

## Backup & restore

**Export:** `Desk ▾ → Export…` saves your full state (tasks, pipeline, stickies, goals, habits, settings) to a single JSON file you can store anywhere — Dropbox, an external drive, an `~/Backups/` folder. The file is plain text and human-readable.

**Import:** `Desk ▾ → Import…` reads a previously-exported JSON file and replaces your current state with it. An `Undo` toast appears for ~6 seconds in case you imported the wrong file.

**Format:** the export wraps your state in `{kind:'desk-backup', exportedAt, appVersion, state:{...}}`. The `state` subtree is exactly what's written to IndexedDB, so future Desk versions (including v2) can import it.
