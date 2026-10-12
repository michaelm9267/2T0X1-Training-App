import { useRef, useState } from 'react';
import { GLOSSARY } from '../Glossary/acronyms';
import useModalDialog from './useModalDialog';
import './training-tools.css';

export default function TrainingGuide({ onClose }) {
  const dialog = useRef(null);
  const [query, setQuery] = useState('');
  useModalDialog(dialog, onClose);
  const terms = Object.entries(GLOSSARY).filter(([term, meaning]) => `${term} ${meaning}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="cmos-overlay" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <article className="training-tool-sheet" role="dialog" aria-modal="true" aria-label="Training guide" tabIndex={-1} ref={dialog}>
      <div className="training-tool-header"><strong>Training guide</strong><button type="button" aria-label="Close training guide" onClick={onClose}>×</button></div>
      <h2>Your first deployment</h2>
      <ol className="walkthrough-steps">
        <li>Open the DSOE, review the chalk, destination, and required timing.</li>
        <li>Precheck the document packet and identify missing or incorrect paperwork.</li>
        <li>Incheck the cargo: inspect, measure, weigh, calculate CB when required, and apply markings.</li>
        <li>Manifest from verified paperwork and physical readings, then apply the MSL.</li>
        <li>After every piece is manifested, build and accept the training load plan.</li>
        <li>Perform a fresh JI for airworthiness after the deployment load plan is accepted.</li>
        <li>Open the after-action report to review decisions, misses, references, and elapsed time.</li>
      </ol>
      <h3>Acronym glossary</h3>
      <label className="tool-search">Search acronyms<input aria-label="Search acronyms" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <dl className="glossary-list">{terms.map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl>
    </article>
  </div>;
}
