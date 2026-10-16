import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './floating-window.css';

// A document window that floats over the workspace without blocking it, so the trainee can keep
// working while they refer to it. Drag it by its title bar, resize it from the bottom-right corner,
// minimize it to its title bar, and click it to bring it in front of other windows. Escape closes it
// while focus is inside. Print prints only this window.
const MARGIN = 8;
const BASE_Z = 1100; // above CMOS screens (1000), below acronym tooltips (2000)
let topZ = BASE_Z;
let openCount = 0;
const nextZ = () => { topZ = topZ >= 1900 ? BASE_Z + 1 : topZ + 1; return topZ; };
const clamp = (value, low, high) => Math.min(Math.max(value, low), Math.max(low, high));
// Where a window may sit: at least 120 px of it stays on screen on either side.
const xRange = width => [120 - width, Math.max(window.innerWidth - 120, window.innerWidth - width - MARGIN)];

export default function FloatingWindow({ title, label = title, closeLabel = `Close ${label}`, onClose, className = '', titleClass = 'paper-toolbar', printable = false, printLabel = 'Print', onPrint, actions, children }) {
  const node = useRef(null);
  const drag = useRef(null);
  const [position, setPosition] = useState(null);
  const [z, setZ] = useState(nextZ);
  const [minimized, setMinimized] = useState(false);

  // Open toward the right, over the training panel, so the cargo bench stays in view; each new
  // window steps down and left of the last.
  useLayoutEffect(() => {
    const cascade = (openCount % 6) * 28;
    openCount += 1;
    const width = node.current?.offsetWidth || 0;
    setPosition({ x: clamp(window.innerWidth - width - 24 - cascade, MARGIN, window.innerWidth - width - MARGIN), y: clamp(24 + cascade, MARGIN, window.innerHeight - 120) });
    node.current?.focus({ preventScroll: true });
    return () => { openCount = Math.max(0, openCount - 1); };
  }, []);

  // Keep the title bar on screen when the browser window shrinks.
  useEffect(() => {
    const keepVisible = () => setPosition(p => p && { x: clamp(p.x, ...xRange(node.current?.offsetWidth || 0)), y: clamp(p.y, 0, window.innerHeight - 48) });
    window.addEventListener('resize', keepVisible);
    return () => window.removeEventListener('resize', keepVisible);
  }, []);

  const startDrag = event => {
    if (event.button !== 0 || event.target.closest('button, a, input, select')) return;
    drag.current = { dx: event.clientX - position.x, dy: event.clientY - position.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };
  const moveDrag = event => {
    if (!drag.current) return;
    const width = node.current?.offsetWidth || 0;
    setPosition({ x: clamp(event.clientX - drag.current.dx, ...xRange(width)), y: clamp(event.clientY - drag.current.dy, 0, window.innerHeight - 48) });
  };
  const endDrag = () => { drag.current = null; };
  // Arrow keys on the title bar move the window too.
  const keyMove = event => {
    const step = event.shiftKey ? 40 : 10;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (!delta || event.target !== event.currentTarget) return;
    event.preventDefault();
    setPosition(p => ({ x: clamp(p.x + delta[0], ...xRange(node.current?.offsetWidth || 0)), y: clamp(p.y + delta[1], 0, window.innerHeight - 48) }));
  };

  function print() {
    onPrint?.();
    const body = window.document.body;
    const done = () => { body.classList.remove('print-one'); node.current?.removeAttribute('data-print-target'); window.removeEventListener('afterprint', done); };
    body.classList.add('print-one');
    node.current?.setAttribute('data-print-target', '');
    window.addEventListener('afterprint', done);
    window.print();
    done();
  }

  return createPortal(<article ref={node} className={`floating-window ${minimized ? 'is-minimized' : ''} ${className}`} role="dialog" aria-label={label} tabIndex={-1}
    style={{ zIndex: z, left: position?.x ?? 0, top: position?.y ?? 0, visibility: position ? undefined : 'hidden' }}
    onPointerDown={() => { if (z !== topZ) setZ(nextZ()); }}
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <div className={`floating-titlebar no-print ${titleClass}`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
      tabIndex={0} aria-label={`${label} title bar. Drag, or use the arrow keys, to move the window.`} onKeyDown={keyMove}>
      <span className="floating-title"><span className="floating-grip" aria-hidden="true">⠿</span>{title}</span>
      <span className="floating-actions">
        {actions}
        {printable && <button type="button" className="print-button" onClick={print}>{printLabel}</button>}
        <button type="button" className="floating-minimize" aria-label={minimized ? `Restore ${label}` : `Minimize ${label}`} aria-pressed={minimized} onClick={() => setMinimized(value => !value)}>{minimized ? '▢' : '–'}</button>
        <button type="button" aria-label={closeLabel} onClick={onClose}>×</button>
      </span>
    </div>
    <div className="floating-body" hidden={minimized}>{children}</div>
  </article>, window.document.body);
}
