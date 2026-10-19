import RegulationHelp, { ClaimLink } from '../Regulations/RegulationHelp';
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
        <li>In CMOS → Deployment → Deployment Parameters, set the DSOE's parameters (DSOE ID, Deployment / Exercise, MIL Mode, Consignor and the shared shipment values) and save.</li>
        <li>In CMOS → Common In/Out → Air Schedule, build the mission from the DSOE (mission number, DSOE ID, chalk, AC Type and routings) and save it.</li>
        <li>In CMOS → Air Manifest, create and save the manifest, choosing the Air Schedule mission. Assign pallets through Unassigned Pallets and loose cargo through Assign TCNs, then apply each MSL. Edit Check is optional: use it to list anything still missing. Open both print displays before accepting the load plan.</li>
        <li>Perform a fresh JI for airworthiness after the deployment load plan is accepted.</li>
        <li>In CMOS Air Manifest, select Release, enter the flight number and departure, and release within the 30 minutes following departure.</li>
        <li>Open the after-action report to review decisions, misses, references, and elapsed time.</li>
      </ol>
      <RegulationHelp claims={['documents.load', 'inspection.scope', 'cargo.weight', 'cargo.cb', 'documents.msl', 'loadPlan.guidance', 'departure.finalPlan']} assumptions={['Simulated shipment values, packet SOP, workflow gates, and scoring are training choices.']} />
      <h3>Acronym glossary</h3>
      <label className="tool-search">Search acronyms<input aria-label="Search acronyms" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <dl className="glossary-list">{terms.map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd><ClaimLink claimId={{ CB: 'cargo.cb', GWT: 'cargo.weight', FAW: 'cargo.cb', RAW: 'cargo.cb', IAW: 'cargo.cb', RDL: 'cargo.cb', MSL: 'documents.msl', TCN: 'outbound.tcn', TAC: 'outbound.funding', ATTLA: 'documents.attla', HAZDEC: 'documents.hazdec', SDDG: 'documents.hazdec', JI: 'inspection.scope' }[term]}>{meaning}</ClaimLink></dd></div>)}</dl>
  </FloatingWindow>;
}
