// Desk — Momentum (habits & streak) widget for Übersicht.
// Reads ~/Library/Application Support/desk/desk-widgets.json.  Drag it anywhere (it remembers), or edit top/left below.

export const refreshFrequency = 15000;

export const command = `cat "$HOME/Library/Application Support/desk/desk-widgets.json" 2>/dev/null || echo '{}'`;

export const className = `
  top: 40px;
  left: 274px;
  width: 230px;
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
  .sub { font-size: 12px; color: #8B8B86; }
  .dots { display: flex; gap: 5px; margin-top: 11px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,0.12); }
  .dot.on { background: #FF4A1C; }
  .bar { height: 6px; border-radius: 99px; background: rgba(255,255,255,0.08); overflow: hidden; margin-top: 12px; }
  .fill { height: 100%; background: #FF4A1C; border-radius: 99px; }
  .row { display: flex; justify-content: space-between; font-family: ui-monospace, 'SF Mono', monospace; font-size: 10px; color: #8B8B86; margin-top: 8px; letter-spacing: 0.03em; }
`;

// Drag-to-move: translate Übersicht's wrapper and remember the offset (survives the refresh re-render).
const POS_KEY = 'deskMomentumPos';
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
  const m = d.momentum || {};
  const streak = m.streak || 0;
  const sched = m.schedToday || 0;
  const done = m.doneToday || 0;
  const week = m.weekPct || 0;
  const synced = !!d.ts;
  const dots = [];
  for (let i = 0; i < Math.min(sched, 8); i++) dots.push(<div key={i} className={'dot' + (i < done ? ' on' : '')} />);
  return (
    <div ref={wireDrag}>
      <div className="k">Momentum</div>
      <div className="main">{ streak > 0 ? <span>{streak}<span className="u"> day streak</span></span> : (synced ? 'Start today' : '—') }</div>
      <div className="sub">{ sched > 0 ? ('Habits today ' + done + '/' + sched) : (synced ? 'No habits yet' : 'Open Desk to sync') }</div>
      { sched > 0 ? <div className="dots">{dots}</div> : null }
      <div className="bar"><div className="fill" style={{ width: week + '%' }} /></div>
      <div className="row"><span>This week</span><span>{week}%</span></div>
    </div>
  );
};
