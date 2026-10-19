import { useEffect } from 'react';

export default function useModalDialog(dialog, onClose) {
  useEffect(() => {
    const previous = document.activeElement;
    const node = dialog.current;
    node?.focus();
    const onKeyDown = event => {
      // A dialog or document window opened on top of this one handles its own keys.
      const top = document.activeElement?.closest?.('[aria-modal="true"]');
      if ((top && top !== node) || document.activeElement?.closest?.('.floating-window, [data-regulation-popup]')) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !node) return;
      const focusable = [...node.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')].filter(item => !item.disabled);
      if (!focusable.length) { event.preventDefault(); node.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, [dialog, onClose]);
}
