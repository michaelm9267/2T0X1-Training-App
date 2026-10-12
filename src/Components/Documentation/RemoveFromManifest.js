import { useState } from 'react';

// Two-step removal so a manifested piece is not pulled off by accident.
export default function RemoveFromManifest({ onRemove, className = '' }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <button type="button" className={`frustrate-button ${className}`} onClick={() => setConfirming(true)}>Remove piece from manifest</button>;
  return <span className="remove-confirm" role="group" aria-label="Confirm removal">
    <span>Remove this piece? Its MSL and JI progress will be cleared.</span>
    <button type="button" className={`frustrate-button ${className}`} onClick={() => { setConfirming(false); onRemove(); }}>Confirm removal</button>
    <button type="button" className={className} onClick={() => setConfirming(false)}>Cancel</button>
  </span>;
}
