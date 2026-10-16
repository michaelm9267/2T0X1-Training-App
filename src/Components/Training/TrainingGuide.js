import { useState } from 'react';
import { GLOSSARY } from '../Glossary/acronyms';
import FloatingWindow from '../Session/FloatingWindow';
import './training-tools.css';

export default function TrainingGuide({ onClose }) {
  const [query, setQuery] = useState('');
  const terms = Object.entries(GLOSSARY).filter(([term, meaning]) => `${term} ${meaning}`.toLowerCase().includes(query.toLowerCase()));
  return <FloatingWindow title={<strong>Training guide</strong>} label="Training guide" closeLabel="Close training guide" onClose={onClose} className="training-tool-sheet" titleClass="training-tool-header">
      <h2>Your first deployment</h2>
      <ol className="walkthrough-steps">
        <li>Open the DSOE, review the chalk, destination, and required timing.</li>
        <li>Precheck the document packet and identify missing or incorrect paperwork.</li>
        <li>Incheck the cargo: inspect, measure, weigh, calculate CB when required, and apply markings.</li>
        <li>Open CMOS → Shipment Planning, search the TCN, enter verified readings, complete applicable DG2 details, and save.</li>
        <li>In CMOS → Air Manifest, create and save the manifest. Assign pallets through Unassigned Pallets and loose cargo through Assign TCNs, then apply each MSL. Run Edit Check and open both print displays before accepting the load plan.</li>
        <li>Perform a fresh JI for airworthiness after the deployment load plan is accepted.</li>
        <li>In CMOS Air Manifest, select Release, enter the flight number and departure, and release within the exercise’s 30-minute window.</li>
        <li>Open the after-action report to review decisions, misses, references, and elapsed time.</li>
      </ol>
      <h3>Acronym glossary</h3>
      <label className="tool-search">Search acronyms<input aria-label="Search acronyms" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <dl className="glossary-list">{terms.map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl>
  </FloatingWindow>;
}
