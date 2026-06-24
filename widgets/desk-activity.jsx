// Desk — Activity (6-month habit heatmap) widget for Übersicht.
// Reads ~/Library/Application Support/desk/desk-widgets.json (the `heat` array: 182 day-levels, -1=future, 0..4).
// Move it: edit top/left below. Sits under the today/momentum/focus row by default.

export const refreshFrequency = 15000;

export const command = `cat "$HOME/Library/Application Support/desk/desk-widgets.json" 2>/dev/null || echo '{}'`;

export const className = `
  top: 190px;
  left: 40px;
  width: 690px;
  box-sizing: border-box;
  padding: 16px 20px 18px;
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
  .head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
  .head h3 { font-weight: 600; font-size: 14px; margin: 0; letter-spacing: -0.01em; }
  .legend { display: flex; align-items: center; gap: 6px; font-family: ui-monospace, 'SF Mono', monospace; font-size: 9.5px; color: #56564F; letter-spacing: 0.04em; }
  .legend i { width: 11px; height: 11px; border-radius: 3px; display: inline-block; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07); }
  .legend i[data-l="1"] { background: rgba(255,74,28,0.30); border-color: transparent; }
  .legend i[data-l="2"] { background: rgba(255,74,28,0.52); border-color: transparent; }
  .legend i[data-l="3"] { background: rgba(255,74,28,0.75); border-color: transparent; }
  .legend i[data-l="4"] { background: #FF4A1C; border-color: transparent; }
  .heat { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 1fr); grid-auto-columns: 1fr; gap: 3px; width: 100%; }
  .cell { aspect-ratio: 1; border-radius: 3px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07); }
  .cell[data-l="1"] { background: rgba(255,74,28,0.30); border-color: transparent; }
  .cell[data-l="2"] { background: rgba(255,74,28,0.52); border-color: transparent; }
  .cell[data-l="3"] { background: rgba(255,74,28,0.75); border-color: transparent; }
  .cell[data-l="4"] { background: #FF4A1C; border-color: transparent; }
  .cell.future { opacity: 0.3; }
  .empty { font-size: 12px; color: #8B8B86; padding: 26px 0; text-align: center; }
`;

// Drag-to-move: Übersicht has no native drag, so we translate its wrapper element
// and remember the offset in localStorage (survives the 15s refresh re-render).
const POS_KEY = 'deskActivityPos';
const wireDrag = (el) => {
  if (!el) return;
  const wrap = el.parentElement;          // Übersicht's className wrapper (carries top/left + the card chrome)
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
  const heat = Array.isArray(d.heat) ? d.heat : [];
  const synced = !!d.ts;
  // Fall back to an empty 26x7 skeleton when Desk hasn't synced yet.
  const cells = (heat.length ? heat : new Array(26 * 7).fill(0)).map((lvl, i) => {
    const future = lvl < 0;
    return <div key={i} className={'cell' + (future ? ' future' : '')} data-l={future ? 0 : lvl} />;
  });
  return (
    <div ref={wireDrag}>
      <div className="head">
        <h3>Activity — last 6 months</h3>
        <div className="legend">
          Less <i data-l="1" /><i data-l="2" /><i data-l="3" /><i data-l="4" /> More
        </div>
      </div>
      <div className="heat">{cells}</div>
      { !synced ? <div className="empty">Open Desk to sync your activity</div> : null }
    </div>
  );
};
