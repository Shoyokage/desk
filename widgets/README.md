# Desk — Übersicht widgets

Four desktop widgets that mirror your Desk day, rendered by [Übersicht](https://tracesof.net/uebersicht/):

| Widget | Shows |
|---|---|
| `desk-today.jsx` | what's due today + the active workspace |
| `desk-momentum.jsx` | current habit streak + today's progress |
| `desk-focus.jsx` | a live focus-session countdown |
| `desk-activity.jsx` | a 6-month habit "contribution" heatmap |

They read a small JSON snapshot the Desk macOS app writes to
`~/Library/Application Support/desk/desk-widgets.json` — so they only show real data while the **Desk app is running**.

## Install

1. Install [Übersicht](https://tracesof.net/uebersicht/) and launch it.
2. Copy the widgets into Übersicht's widgets folder:
   ```bash
   cp widgets/*.jsx ~/Library/Application\ Support/Übersicht/widgets/
   ```
3. **Grant Screen Recording permission** to Übersicht (System Settings → Privacy & Security → Screen Recording) — Übersicht needs it to draw on the desktop.
4. Open the **Desk** macOS app so it starts writing the data snapshot. Within ~15s the widgets fill in.

## Move them

Each widget is **draggable** — grab it and drop it anywhere; it remembers its spot. (If a widget won't grab, toggle Übersicht's interaction from its menubar icon.) You can also set a fixed position by editing `top` / `left` at the top of each `.jsx`.
