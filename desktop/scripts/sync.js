// Sync the canonical single-file web app (/app) into the Electron runtime bundle (/desktop/app)
// and regenerate the installable PWA (/pwa). Run after editing /app/index.html:  npm run sync
// All paths are repo-relative — no machine-specific paths.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');          // repo root
const SRC = path.join(ROOT, 'app');                     // canonical web app (source of truth)
const DEST = path.join(__dirname, '..', 'app');         // electron loads index.html from here
const PWA = path.join(ROOT, 'pwa');
const SPRITES = ['sprite-calm.png', 'sprite-crunch.png', 'sprite-music.png'];

function copy(from, to) {
  if (!fs.existsSync(from)) { console.warn('skip (missing): ' + path.relative(ROOT, from)); return; }
  fs.copyFileSync(from, to);
  console.log('copied ' + path.relative(ROOT, from) + ' -> ' + path.relative(ROOT, to));
}

// 1) bundle the web app for the desktop wrapper (the in-app buddy needs the sprites alongside index.html)
copy(path.join(SRC, 'index.html'), path.join(DEST, 'index.html'));
for (const s of SPRITES) copy(path.join(SRC, s), path.join(DEST, s));

// 2) regenerate the PWA: inject manifest + service-worker registration into the canonical HTML
const PWA_HEAD = [
  '  <link rel="manifest" href="manifest.webmanifest" />',
  '  <meta name="theme-color" content="#0D0D0F" />',
  '  <meta name="apple-mobile-web-app-capable" content="yes" />',
  '  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '  <meta name="apple-mobile-web-app-title" content="Desk" />',
  '  <link rel="apple-touch-icon" href="apple-touch-icon.png" />',
].join('\n');
const SW = "\n<script>if('serviceWorker' in navigator && location.protocol.startsWith('http')){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}</script>\n";

if (fs.existsSync(PWA)) {
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const vp = '<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />';
  if (html.indexOf(vp) >= 0) {
    html = html.replace(vp, vp + '\n' + PWA_HEAD).replace('</body>', SW + '</body>');
    fs.writeFileSync(path.join(PWA, 'index.html'), html);
    console.log('wrote pwa/index.html');
  } else {
    console.warn('viewport anchor not found — pwa/index.html not regenerated');
  }
  for (const s of SPRITES) copy(path.join(SRC, s), path.join(PWA, s));   // PWA in-app buddy needs sprites too
}

console.log('sync complete');
