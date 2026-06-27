# Desk — Voice-first conversational agent ("Talk to Desk") · design spec

_Date: 2026-06-27 · Status: approved, building_

## Goal
Turn Desk's existing single-shot voice mode into a **voice-first conversational assistant**: you talk, a local LLM understands, and it creates tasks / goals / habits / stickies (and more) for you — confirming before it commits. Voice is the **primary** way to add things; the GUI stays for browsing and editing. It must feel like a calm, beautiful conversation, and run **100% on-device**.

This leans into Desk's core differentiator (private, local AI) and evolves the working voice seed (`mic → Whisper → model → action → execute`) rather than starting over.

## Locked decisions
| Decision | Choice |
|---|---|
| LLM | **`qwen2.5:7b`** via Ollama (default; user can switch to `3b` for speed in Settings) |
| Speech-to-text | **`Xenova/whisper-small.en`** (more accurate than base; auto-downloads on first use) |
| Commit model | **Confirm before commit** — every create shows a "yes?" preview (clickable *and* voice-answerable) |
| Hands-free | **Yes** — a "keep listening" mode (Phase 2), plus tap-to-talk |
| Look | **Visually striking + immersive** — a dedicated Talk-to-Desk surface, INSTRUMENT language |

## UX / visual design
A dedicated **Talk-to-Desk** surface (full overlay, calm dark INSTRUMENT canvas + ambient fluid):
- **Voice orb (centerpiece):** a reactive halo/blob that breathes when idle and pulses with live mic amplitude while listening (driven by Web-Audio RMS → the existing WebGL/fluid). State colors: orange = listening, dim = thinking, soft = idle.
- **Transcript:** elegant chat bubbles — your speech vs. Desk's reply — with **action chips** ("✓ Task · Email Sam · Fri 3pm").
- **Confirm preview card:** when Qwen proposes a create, a card shows the parsed item (e.g. **Goal · Read 12 books · by Dec 31**) with **Yes / No** — answerable by click *or* by voice ("yes" / "no" / "change the date to…"). Nothing writes to state until confirmed.
- **Hands-free indicator (Phase 2):** a persistent soft pulsing ring; stop word ("done") or Esc ends it.
- **The buddy** is present at the edge as the listener, reacting via its existing moods.
- Honors `prefers-reduced-motion` (orb still + instant transitions).

## Architecture
```
mic ──▶ Whisper (small.en, local) ──▶ transcript
                                         │
                                         ▼
                              Qwen 7b (Ollama, local)
                     returns structured { reply, actions[], needsConfirm }
                                         │
                                ┌────────┴─────────┐
                            confirm gate        (chit-chat → just reply)
                                │ yes
                                ▼
                     tool registry → existing app fns
        (addTaskTo · createGoal · addHabit · addSticky · setFocusTask · setView …)
                                │
                                ▼
                     render + Undo toast + transcript chip
```

- **Model layer (main.js):** swap Whisper to `whisper-small.en`; default `aiCfg.ollamaModel = 'qwen2.5:7b'` (already configurable via the Settings → Voice & AI page). No new IPC needed for Phase 1 — reuse `voiceAsk({schema, messages})`.
- **Intent schema (renderer):** replace the 4-action schema with a richer one returning an **actions array** so one utterance can do several things:
  ```
  { reply:string, actions:[ { tool, ...args } ], confirm:boolean }
  ```
  Tools (Phase 1): `add_task {title,due?,list?}`, `add_goal {name,target?,unit?,deadline?}`, `add_habit {name,emoji?,schedule?}`, `add_sticky {text}`, `start_focus {task?}`, `go {view|workspace}`, `none`.
- **Tool registry (renderer):** `{ tool → execute(args) }` wrapping the functions that already exist (`addTaskTo`, `parseQuickDue`, goal-add, habit-add, `addSticky`, `setFocusTask`+`startPause`, `setView`/`setWorld`). Each returns a human summary for the transcript chip.
- **Confirm gate:** parsed actions render as preview cards; **Yes** executes + shows Undo; **No** / a correction re-prompts Qwen with the correction appended to `messages`.
- **Conversation state:** keep the running `messages` array (already supported) for multi-turn context; cap to a token budget; inject a compact data context (active workspace, open tasks, goals, habits, today's date).

## Phasing
- **Phase 1 (this build):** the Talk-to-Desk surface + reactive voice orb + transcript; Whisper small.en + Qwen 7b; the actions-array schema + tool registry for **add task / goal / habit / sticky** (+ focus + navigate); the **yes-confirm** preview + Undo. Tap-to-talk.
- **Phase 2:** hands-free "keep listening" loop (stop word/Esc); streaming replies; multi-step tool chains; query tools ("what's overdue?"); spoken corrections; voice answering the confirm.

## Honest constraints
- `qwen2.5:7b` ≈ 4.7 GB, ~8 GB free RAM, ~2–5 s/reply on Apple Silicon. Default 7b for accuracy; `3b` is a one-setting switch for snappier turns. Built model-agnostic.
- Small local models can mis-pick tools — keep tools few + sharply described, and the **confirm gate + Undo** are the safety net (never silent destructive writes).
- Mac-app only (needs Whisper + Ollama). The web/PWA shows "runs in the Desk app."

## Verification
- Preview: the surface renders, orb reacts to mic, schema parse → confirm card → execute creates the right item; reduced-motion honored.
- Electron: `whisper-small.en` transcribes; `qwen2.5:7b` returns valid actions; "add a task to email Sam Friday 3pm and a goal to read 12 books" → two confirm cards → both created on Yes; Undo restores.
- Then ship to the Mac app + sync into the repo.

## Scope (YAGNI)
- **In:** voice-first add for task/goal/habit/sticky + focus/navigate; reactive orb; transcript; yes-confirm + Undo; Qwen 7b + small.en.
- **Out (Phase 2+):** hands-free loop, streaming, multi-step chains, query/answer tools, voice-driven editing of existing items, non-English speech.
