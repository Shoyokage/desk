// Desk — Today widget for Übersicht.  Reads ~/Library/Application Support/desk/desk-widgets.json
// Drag it anywhere (it remembers), or edit top/left in `className` below.

export const refreshFrequency = 15000;

export const command = `cat "$HOME/Library/Application Support/desk/desk-widgets.json" 2>/dev/null || echo '{}'`;

export const className = `
  top: 40px;
  left: 40px;
  width: 214px;
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
  .k { font-family: ui-monospace, 'SF Mono', monospace; font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4A1C; }
  .main { font-weight: 700; font-size: 30px; letter-spacing: -0.02em; line-height: 1.05; margin: 13px 0 5px; }
  .main .u { font-size: 14px; color: #8B8B86; font-weight: 500; }
  .sub { font-size: 12px; color: #8B8B86; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hint { font-family: ui-monospace, 'SF Mono', monospace; font-size: 9px; color: #56564F; margin-top: 9px; }
`;

// Drag-to-move: translate Übersicht's wrapper and remember the offset (survives the refresh re-render).
const POS_KEY = 'deskTodayPos';
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
  const t = d.today || {};
  const due = t.due || 0;
  const synced = !!d.ts;
  return (
    <div ref={wireDrag}>
      <div className="k">Today{ d.section ? ' · ' + d.section : '' }</div>
      <div className="main">{ due > 0 ? <span>{due}<span className="u"> due</span></span> : 'All clear' }</div>
      <div className="sub">{ due > 0 ? (t.next || 'See your tasks') : 'Nothing due today' }</div>
      { synced ? null : <div className="hint">Open Desk to sync</div> }
    </div>
  );
};
