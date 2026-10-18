import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

// The paperwork as its own browser window, so it can sit beside CMOS (or on a second monitor)
// instead of on top of it. The window has its own document picker, so it stays useful on every
// CMOS screen and while a CMOS dialog is open.
const NAME = "cmos-paperwork";
const FEATURES = "popup,width=860,height=980,left=40,top=40";

// Open (or bring forward) the paperwork window. Must run inside a click handler so pop-up
// blockers allow it. Returns null when the browser blocked the window.
export function openPaperworkWindow() {
  const win = window.open("", NAME, FEATURES);
  if (!win) return null;
  win.focus();
  return win;
}

// Lets any CMOS screen or dialog offer a "Paperwork" button without threading props through.
export const PaperworkContext = createContext(null);

export function PaperworkButton({ className = "" }) {
  const open = useContext(PaperworkContext);
  if (!open) return null;
  return (
    <button
      type="button"
      className={`cmos-paperwork-button ${className}`}
      title="Open the paperwork in a separate window"
      onClick={() => open()}
    >
      Paperwork ↗
    </button>
  );
}

// Copy the app's styles into the window so documents look the same there.
function copyStyles(target) {
  target.head.querySelectorAll("[data-paperwork-style]").forEach((n) => n.remove());
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    const copy = node.cloneNode(true);
    if (copy.tagName === "LINK") copy.href = node.href;
    copy.setAttribute("data-paperwork-style", "");
    target.head.appendChild(copy);
  });
}

export default function PaperworkWindow({ win, documents, selectedId, onSelect, renderDocument, onPrint, onClose }) {
  const [root, setRoot] = useState(null);

  useEffect(() => {
    const doc = win.document;
    doc.title = "CMOS Paperwork · Training";
    copyStyles(doc);
    doc.body.className = "paperwork-window-body";
    let node = doc.getElementById("paperwork-root");
    if (!node) {
      node = doc.createElement("div");
      node.id = "paperwork-root";
      doc.body.appendChild(node);
    }
    setRoot(node);
    // The trainee may close the window themselves.
    const timer = window.setInterval(() => { if (win.closed) onClose(); }, 500);
    return () => window.clearInterval(timer);
  }, [win, onClose]);

  if (!root) return null;
  const current = documents.find((d) => d.id === selectedId) || documents[0];
  return createPortal(
    <div className="paperwork-window">
      <div className="paperwork-window-bar">
        <label>
          Document
          <select aria-label="Paperwork document" value={current?.id || ""} onChange={(e) => onSelect(e.target.value)}>
            {documents.length === 0 && <option value="">No documents yet</option>}
            {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </label>
        <button type="button" disabled={!current} onClick={() => { if (current) onPrint?.(current.id); win.print(); }}>Print</button>
      </div>
      <div className="paper-sheet paperwork-window-sheet">
        {current ? renderDocument(current.id) : <p>No paperwork is available for this exercise.</p>}
      </div>
    </div>,
    root,
  );
}
