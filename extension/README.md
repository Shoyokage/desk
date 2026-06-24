# Desk — "now playing" Chrome companion

A tiny, optional Chrome extension that detects media playing in Chrome (YouTube, Spotify web, etc.) and tells the Desk macOS app about it over **loopback only** (`http://127.0.0.1:7682`). Nothing leaves your machine.

With it running, the Desk app shows a now-playing bar, and the **desktop buddy grooves to music** 🎧 while a track plays.

## Install (unpacked)

1. Open `chrome://extensions` in Chrome.
2. Toggle **Developer mode** (top-right) on.
3. Click **Load unpacked** and select this `extension/` folder.
4. Make sure the **Desk** macOS app is running (it hosts the local `127.0.0.1:7682` bridge).

Play something in a Chrome tab — Desk picks it up.

## What it does / doesn't

- **Does:** read the title/artist/playing state of media in your Chrome tabs and POST it to `127.0.0.1:7682` on your own computer.
- **Doesn't:** make any external network request, collect analytics, or send anything off-device.

Fully optional — Desk works without it; you just won't get the music groove or the now-playing bar.
