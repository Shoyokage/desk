// Desk — Focus widget for Übersicht (live countdown).
// Reads ~/Library/Application Support/desk/desk-widgets.json.  Drag it anywhere (it remembers), or edit top/left below.

export const refreshFrequency = 1000;

export const command = `cat "$HOME/Library/Application Support/desk/desk-widgets.json" 2>/dev/null || echo '{}'`;

export const className = `
  top: 40px;
  left: 524px;
  width: 206px;
  box-sizing: border-box;
  padding: 16px 18px;
  background: rgba(20,20,22,0.74);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 20px;
  box-shadow: 0 18px 50px -18px rgba(0,0,0,0.72);
  color: #F2F1ED;
  font-family: 'Hanken Grotesk', -apple-system, system-ui, sans-serif;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  .k { font-family: ui-monospace, 'SF Mono', monospace; font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4A1C; display: flex; align-items: center; gap: 7px; }
  .pulse { width: 7px; height: 7px; border-radius: 50%; background: #FF4A1C; }
  .main { font-weight: 700; font-size: 34px; letter-spacing: -0.02em; line-height: 1.05; margin: 13px 0 5px; font-variant-numeric: tabular-nums; }
  .idle { color: #8B8B86; }
  .sub { font-size: 12px; color: #8B8B86; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

// Drag-to-move: translate Übersicht's wrapper and remember the offset (survives the refresh re-render).
const POS_KEY = 'deskFocusPos';
const wireDrag = (el) => {
  if (!el) return;
  const wrap = el.parentElement;
  if (!wrap || wrap.__deskDragWired) return;
  wrap.__deskDragWired = true;
  try { const s = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); if (s) { wrap.style.transform = 'translate(' + s.x + 'px,' + s.y + 'px)'; wrap.__x = s.x; wrap.__y = s.y; } } catch (e) {}
  let drag = false, sx = 0, sy = 0, bx = 0, by = 0;
  wrap.style.cursor = 'grab';
  wrap.addEventListener('pointerdown', (e) => {
    drag = true; sx = e.clientX; sy = e.clientY; bx = wrap.__x || 0; by = wrap.__y || 0;
    wrap.style.cursor = 'grabbing'; try { wrap.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault();
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag) return; const x = bx + (e.clientX - sx), y = by + (e.clientY - sy);
    wrap.style.transform = 'translate(' + x + 'px,' + y + 'px)'; wrap.__x = x; wrap.__y = y;
  });
  const end = () => { if (!drag) return; drag = false; wrap.style.cursor = 'grab'; try { localStorage.setItem(POS_KEY, JSON.stringify({ x: wrap.__x || 0, y: wrap.__y || 0 })); } catch (_) {} };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
};

export const render = ({ output }) => {
  let d = {};
  try { d = JSON.parse(output); } catch (e) {}
  const f = d.focus || {};
  const running = !!f.running && f.endTs > 0;
  const remaining = running ? (f.endTs - Date.now()) / 1000 : 0;
  const live = running && remaining > 0;
  return (
    <div ref={wireDrag}>
      <div className="k">{ live ? <div className="pulse" /> : null }Focus</div>
      <div className={ live ? 'main' : 'main idle' }>{ live ? fmt(remaining) : (running ? 'Done' : '—') }</div>
      <div className="sub">{ live ? (f.label || 'Deep focus') : 'No session running' }</div>
    </div>
  );
};
