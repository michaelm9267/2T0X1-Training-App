import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// A bar that stays at the top of the training panel while it scrolls. Each card has a button that
// opens it or closes it; the bar can also collapse or expand them all, or go back to the top. The
// card opened last moves to the top of the panel, just under this bar, and goes back to its own
// place when it closes (the next most recently opened card that is still open takes the top).
// Moving uses CSS order on the flex panel, so the page structure never changes. Changing step
// brings the new step's heading into view.
const cardsIn = panel => [...(panel?.querySelectorAll('.collapsible-card') || [])].filter(card => !card.parentElement.closest('.collapsible-card'));
const toggleOf = card => card.querySelector(':scope > .card-heading .collapse-toggle');
const labelOf = card => card.getAttribute('aria-label');
// Puts the most recently opened card still on the panel at the top, and returns it.
function promote(panel, opened) {
  const all = cardsIn(panel);
  const top = [...opened].reverse().map(label => all.find(card => labelOf(card) === label)).find(Boolean);
  all.forEach(card => { card.style.order = card === top ? '-1' : ''; });
  return top;
}

export default function SectionJump({ resetKey }) {
  const bar = useRef(null);
  const [cards, setCards] = useState([]);
  const [, setToggles] = useState(0);
  const panel = () => bar.current?.parentElement;
  // Cards in the order they were opened, most recent last; bulk is set while Expand/Collapse all runs.
  const opened = useRef([]);
  const bulk = useRef(false);
  // A card opening or closing re-renders this bar so its buttons show the card's state, and moves
  // the card to the top (opened) or back to its place (closed).
  useEffect(() => {
    const node = panel();
    const onToggle = event => {
      const card = event.target.closest?.('.collapsible-card');
      if (card && card.parentElement.closest('.collapsible-card') === null) {
        const label = labelOf(card);
        opened.current = opened.current.filter(item => item !== label);
        if (event.detail?.open && !bulk.current) opened.current.push(label);
        if (promote(panel(), opened.current) === card && event.detail?.open) card.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      }
      setToggles(count => count + 1);
    };
    node?.addEventListener('cardtoggle', onToggle);
    return () => node?.removeEventListener('cardtoggle', onToggle);
  }, []);

  // The panel re-renders whenever its cards can change, and this bar re-renders with it, so the
  // list is read after every render; setCards keeps the old list when nothing changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const next = cardsIn(panel()).map(card => ({ label: card.getAttribute('aria-label'), open: toggleOf(card)?.getAttribute('aria-expanded') !== 'false' }));
    setCards(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    promote(panel(), opened.current);
  });

  // A new step starts at its heading, not partway down the last step's cards.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    opened.current = [];
    promote(panel(), opened.current);
    const top = panel()?.getBoundingClientRect().top ?? 0;
    if (top < 0) panel().scrollIntoView?.({ block: 'start' });
  }, [resetKey]);

  // Open a closed card (it moves to the top) or close an open one.
  const toggle = label => {
    const card = cardsIn(panel()).find(item => labelOf(item) === label);
    if (card) toggleOf(card)?.click();
  };
  // Expand all leaves every card in its own place; Collapse all sends them all back.
  const setAll = open => {
    bulk.current = true;
    if (!open) opened.current = [];
    cardsIn(panel()).forEach(card => { const heading = toggleOf(card); if (heading && (heading.getAttribute('aria-expanded') === 'true') !== open) heading.click(); });
    bulk.current = false;
    promote(panel(), opened.current);
  };

  if (cards.length < 2) return <div ref={bar} hidden />;
  return <nav className="section-jump" aria-label="Jump to section" ref={bar}>
    <div className="section-jump-links">{cards.map(({ label, open }) => <button key={label} type="button" aria-label={`${open ? 'Close' : 'Open'} ${label}`} aria-pressed={open} title={open ? 'Close this section' : 'Open and go to this section'} onClick={() => toggle(label)}>{label}</button>)}</div>
    <div className="section-jump-tools">
      <button type="button" onClick={() => setAll(false)}>Collapse all</button>
      <button type="button" onClick={() => setAll(true)}>Expand all</button>
      <button type="button" onClick={() => panel()?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })}>Top ↑</button>
    </div>
  </nav>;
}
