# Contributing to Desk

Thanks for your interest! Desk is intentionally small and dependency-light. Please keep that spirit.

## The golden rule: `app/index.html` is the source of truth

The entire web app is one file: **`app/index.html`** (vanilla JS, no build step). Edit it directly and refresh the browser — that's the whole dev loop.

After editing it, sync the copies the desktop app and PWA use:

```bash
cd desktop && npm run sync
```

This copies `app/index.html` + sprites into `desktop/app/` and regenerates `pwa/index.html`. **Never hand-edit `desktop/app/index.html` or `pwa/index.html`** — they are generated.

## Layout

| Path | What | Edit? |
|---|---|---|
| `app/index.html` | the web app | ✅ source of truth |
| `app/sprite-*.png` | buddy sprite sheets (5×5) | ✅ |
| `desktop/main.js` · `preload.js` · `*-preload.js` | Electron main + bridges | ✅ |
| `desktop/app/companion.html` | the buddy renderer | ✅ |
| `desktop/app/index.html` · `pwa/index.html` | generated bundles | ❌ run `npm run sync` |
| `widgets/*.jsx` | Übersicht widgets | ✅ |
| `extension/*` | Chrome now-playing companion | ✅ |

## Dev

- **Web app:** open `app/index.html` (or serve the folder).
- **macOS app:** `cd desktop && npm install && npm start`.
- **No frameworks, no bundler.** Keep it vanilla. New visual work should match the existing "INSTRUMENT" design language (dark canvas `#0D0D0F`, ink `#F2F1ED`, signal orange `#FF4A1C`; Archivo / Spline Sans Mono / Hanken Grotesk).

## Principles

1. **Calm over loud** — subtle motion, quiet sound, nothing that nags.
2. **Local-first** — no servers, no accounts, no telemetry. AI stays on-device.
3. **Restraint is a feature** — prefer not adding over adding. A small thing that works beats a big thing that almost does.

## Before you publish your fork

Set your name in `LICENSE` (replace `<YOUR NAME>`).
