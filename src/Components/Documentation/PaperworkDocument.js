import { hazardRequirements } from '../CdfCmos/trainingData';
import FloatingWindow from '../Session/FloatingWindow';
import { manifestFields, tcnUln, tcnIncrement, DODAAC_INFO, ORIGIN } from '../CargoWindow/workflow';
import { findUnNumber } from './unNumbers';
import AttlaCertification from './AttlaCertification';
import { WRONG_UN } from '../CargoWindow/discrepancies';

// Fictional training facsimiles of the increment monitor's paperwork packet. Every value comes
// from the current shipment snapshot, so documents change with each reset.
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function documentDate(scenario) {
  const day = scenario.documentDay || 285;
  const date = new Date(Date.UTC(2026, 0, day));
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
const SHIPPER = `${ORIGIN} · ${DODAAC_INFO[ORIGIN].unit}`;
const EMERGENCY = '(555) 010-0199 (FICTIONAL)';

// Declared contents per shipment. The ISU's marked chemical package is deliberately absent.
function packingContents(scenario) {
  if (scenario.id === 'isu-90') return [
    { box: 1, item: 'Crate, general supplies — office and admin', qty: 1, unit: 'BX' },
    { box: 2, item: 'Crate, general supplies — aerosol paint, flammable (UN1950)', qty: 1, unit: 'BX' },
    { box: 3, item: 'Crate, general supplies — cleaning and janitorial', qty: 1, unit: 'BX' },
    { box: 4, item: 'Case, tool, general mechanic', qty: 1, unit: 'EA' },
  ];
  return [
    { box: '1–4', item: 'Crate, general supplies — heavy (bottom tier)', qty: 4, unit: 'BX' },
    { box: '5–12', item: 'Carton, general supplies — light (top tier)', qty: 8, unit: 'CT' },
  ];
}
// HAZDEC additional handling statements (Key 19) for each vehicle's fuel and batteries.
export const HANDLING_STATEMENTS = {
  'age-generator': ['UN1202, Diesel Fuel, 3, III, Fuel Drained to 500 ML or less.', 'UN2800, 1 Non-Spillable Batteries installed, Terminals Taped'],
  'rolling-stock': ['UN1202, Diesel Fuel, 3, III, Fuel Drained to 1/4 or less. 23.75 Lt', 'UN2800, 2 Non-Spillable Batteries installed, Terminals Taped'],
  'three-axle': ['UN1202, Diesel Fuel, 3, III, Fuel Drained to 1/4 or less. 55 Lt', 'UN2800, 4 Non-Spillable Batteries installed, Terminals Taped'],
  'mj1-jammer': ['UN1202, Diesel Fuel, 3, III, Fuel Drained to 1/4 or less.', 'UN2800, Non-Spillable Batteries installed, Terminals Taped'],
};
const LB_TO_KG = 0.45359237;
// Every quantity on the HAZDEC is metric.
function declaredHazards(scenario, weight) {
  if (scenario.ammo) return [{ un:'UN0012', quantity:'1 crate × 15 kg N.E.W.', instruction:'TRAINING PACKING INSTRUCTION', authorization:'', handling:['Fictional ammunition lot TRN-001, DODIC A059, 100 rounds.'] }];
  if (scenario.id === 'isu-90') return [{ un: 'UN1950', quantity: '1 fibreboard box × 12 kg', instruction: 'A6.2', authorization: '', handling: ['Aerosols packed in crate 2 inside the ISU.'] }];
  const un = scenario.kind === 'generator' ? 'UN3528' : 'UN3166';
  const name = scenario.kind === 'generator' ? 'MACHINERY, INTERNAL COMBUSTION, FLAMMABLE LIQUID POWERED' : undefined;
  return [{ un, name, quantity: `1 unpackaged × ${Math.round(weight * LB_TO_KG).toLocaleString()} kg`, instruction: scenario.kind === 'generator' ? 'A7.11' : 'A13.4', authorization: '', handling: HANDLING_STATEMENTS[scenario.id] || [] }];
}

function Header({ title, subtitle, form }) {
  return <header className="paper-header">
    <div><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</div>
    {form && <span className="paper-form">{form}</span>}
  </header>;
}

function Logmod({ scenario, values }) {
  return <>
    <Header title="LOGMOD · Cargo Increment Detail" subtitle="Deployment data — unit line number record" form="Training facsimile" />
    <div className="paper-boxes">
      {[['ULN', tcnUln(values.tcn)], ['UTC', 'TRN01'], ['Increment Nbr', tcnIncrement(values.tcn)], ['TCN', values.tcn], ['Prepared', documentDate(scenario)], ['Shipper', SHIPPER]].map(([k, v]) => <div key={k}><small>{k}</small><span>{v}</span></div>)}
    </div>
    <div className="paper-table"><table>
      <thead><tr><th>Pcs</th><th>Description</th><th>L (in)</th><th>W (in)</th><th>H (in)</th><th>Weight (lb)</th><th>Cube (ft³)</th><th>Haz</th></tr></thead>
      <tbody><tr><td>{values.pieces}</td><td>{values.description}</td><td>{values.length}</td><td>{values.width}</td><td>{values.height}</td><td>{scenario.paperworkWeight ?? values.weight}</td><td>{(values.length * values.width * values.height / 1728).toFixed(1)}</td><td>{values.hazmat.slice(0, 1)}</td></tr></tbody>
    </table></div>
    <div className="paper-boxes">
      {[['Origin DoDAAC', values.origin], ['APOE', values.apoe], ['Destination DoDAAC', values.destination], ['APOD', values.apod], ['Hazardous/Ammunition Ind', values.hazmat], ['Configuration', scenario.attla?.configurationId]].map(([k, v]) => <div key={k}><small>{k}</small><span>{v}</span></div>)}
    </div>
  </>;
}

function LogmodPlacard({ scenario, values }) {
  return <div className="logmod-placard">
    <Header title="LOGMOD CARGO PLACARD" subtitle="Attach after validation by the Cargo Deployment Function" form="Training facsimile" />
    <div className="placard-route"><span>{values.origin} / {values.apoe}</span><strong>TO</strong><span>{values.destination} / {values.apod}</span></div>
    <h2>{values.description}</h2>
    <div className="paper-boxes placard-boxes">
      {[['TCN', values.tcn], ['ULN', tcnUln(values.tcn)], ['Increment', tcnIncrement(values.tcn)], ['Pieces', values.pieces], ['Weight', `${scenario.paperworkWeight ?? values.weight} LB`], ['Dimensions', `${values.length} × ${values.width} × ${values.height} IN`], ['Hazardous', values.hazmat], ['Prepared', documentDate(scenario)]].map(([key, value]) => <div key={key}><small>{key}</small><span>{value}</span></div>)}
    </div>
    <p className="placard-footer">FOR TRAINING USE ONLY · VERIFY AGAINST THE LOGMOD CARGO INCREMENT DETAIL</p>
  </div>;
}

function PackingList({ scenario, values }) {
  const rows = packingContents(scenario);
  return <>
    <Header title="Packing List" subtitle={`${values.description} · Piece 1 of ${values.pieces}`} form="DD Form 1750 · training facsimile" />
    <div className="paper-boxes">
      {[['Packed by', SHIPPER], ['TCN', values.tcn], ['Date packed', documentDate(scenario)], ['Ship to', `${values.destination} / ${values.apod}`], ['Gross weight (lb)', scenario.paperworkWeight ?? values.weight], ['Total boxes', rows.reduce((sum, row) => sum + row.qty, 0)]].map(([k, v]) => <div key={k}><small>{k}</small><span>{v}</span></div>)}
    </div>
    <div className="paper-table"><table>
      <thead><tr><th>Box no.</th><th>Contents — stock number / nomenclature</th><th>Unit</th><th>Qty</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.box}><td>{row.box}</td><td>{row.item}</td><td>{row.unit}</td><td>{row.qty}</td></tr>)}</tbody>
    </table></div>
    <p className="paper-sign">I certify that the material listed has been inspected and packed. — <em>Packer: TRAINING PACKER</em> · <em>Inspector: TRAINING INSPECTOR</em></p>
  </>;
}

// Laid out after DAF Form 7507 (20250131); the comments mark the form's numbered keys.
function Hazdec({ scenario, values }) {
  // A HAZDEC error shows a transposed UN number beside the correct shipping name, or no signature.
  const rows = declaredHazards(scenario, scenario.paperworkWeight ?? values.weight).map(row => ({ ...row, shown: scenario.hazdecError === 'un' ? WRONG_UN[row.un] || row.un : row.un }));
  const unsigned = scenario.hazdecError === 'signature';
  const struck = text => <span className="hz-option hz-deleted">{text}</span>;
  const kept = text => <span className="hz-option">{text}</span>;
  return <div className="hz-page"><div className="hz-form">
    <div className="hz-title">SHIPPER'S DECLARATION FOR DANGEROUS GOODS</div>
    <div className="hz-row hz-split">
      <div className="hz-cell">
        <small>SHIPPER</small>
        <p className="hz-value">{SHIPPER}</p>{/* Key 1 */}
        <small>PHONE NUMBER: <span className="hz-inline">{EMERGENCY}</span></small>
      </div>
      <div className="hz-cell">
        <small>AIR WAYBILL NO. <span className="hz-inline">N/A</span></small>{/* Key 3 */}
        <small className="hz-pages">PAGE <span className="hz-inline">1</span> OF <span className="hz-inline">1</span> PAGES</small>{/* Key 4 */}
        <small>SHIPPER'S REFERENCE NUMBER</small>
        <small>TCN: <span className="hz-inline">{values.tcn}</span></small>{/* Key 5 */}
      </div>
    </div>
    <div className="hz-row hz-split">
      <div className="hz-cell"><small>CONSIGNEE</small><p className="hz-value">{values.destination} · {DODAAC_INFO[values.destination].unit} · {DODAAC_INFO[values.destination].address}, {DODAAC_INFO[values.destination].city}</p></div>{/* Key 2 */}
      <div className="hz-cell" />{/* Key 6 */}
    </div>
    <div className="hz-row hz-split">
      <div className="hz-transport">
        <small className="hz-cell">COMPLETED AND SIGNED COPIES OF THIS DECLARATION MUST BE HANDED TO THE OPERATOR</small>
        <small className="hz-cell hz-heading">TRANSPORTATION DETAILS</small>
        <div className="hz-limits">
          <div className="hz-cell"><small>THIS SHIPMENT IS WITHIN THE LIMITATIONS PRESCRIBED FOR:</small><small>(DELETE NON-APPLICABLE)</small>
            <div className="hz-options">{struck('PASSENGER AND CARGO AIRCRAFT')}{kept('CARGO AIRCRAFT ONLY')}</div>{/* Key 7 */}
          </div>
          <div className="hz-cell"><small>AIRPORT OF DEPARTURE:</small><p className="hz-value hz-center">{values.apoe}</p></div>{/* Key 8 */}
        </div>
        <div className="hz-cell"><small>AIRPORT OF DESTINATION:</small><p className="hz-value hz-center">{values.apod}</p></div>{/* Key 9 */}
      </div>
      <div className="hz-transport">
        <div className="hz-cell hz-warning"><strong>WARNING</strong><small>Failure to comply in all respects with applicable Hazardous Materials/Dangerous Goods Regulations may be in breach of the applicable law, subject to legal penalties</small></div>
        <div className="hz-cell"><small>SHIPMENT TYPE: (DELETE NON-APPLICABLE)</small>
          <div className="hz-options">{kept('NON-RADIOACTIVE')}{struck('RADIOACTIVE')}</div>{/* Key 10 */}
        </div>
      </div>
    </div>
    <div className="hz-row hz-heading hz-cell">NATURE AND QUALITY OF DANGEROUS GOODS</div>
    <div className="hz-table"><table>
      <thead>
        <tr><th colSpan="4">DANGEROUS GOODS IDENTIFICATION</th><th rowSpan="2">QUANTITY AND TYPE of PACKING</th><th rowSpan="2">PACKING INST</th><th rowSpan="2">AUTHORIZATION</th></tr>
        <tr><th>UN or ID NO.</th><th>PROPER SHIPPING NAME</th><th>CLASS or DIVISION (SUBSIDIARY RISK)</th><th>PACKING GROUP</th></tr>
      </thead>
      <tbody>{rows.map(row => { const entry = findUnNumber(row.un); return <tr key={row.un}>
        <td>{row.shown}</td>{/* Key 11 */}
        <td>{row.name || entry?.names[0]}</td>{/* Key 12 */}
        <td>{entry?.division}{entry?.subsidiary ? ` (${entry.subsidiary})` : ''}</td>{/* Keys 13/14 */}
        <td>{entry?.packingGroup === 'N/A' ? '' : entry?.packingGroup}</td>{/* Key 15 */}
        <td>{row.quantity}</td>{/* Key 16 */}
        <td>{row.instruction}</td>{/* Key 17 */}
        <td>{row.authorization}</td>{/* Key 18 */}
      </tr>; })}<tr className="hz-filler"><td /><td /><td /><td /><td /><td /><td /></tr></tbody>
    </table></div>
    <div className="hz-row hz-cell hz-handling">
      <small>ADDITIONAL HANDLING INFORMATION</small>
      <p className="hz-value">{rows.flatMap(row => row.handling).map((line, i) => <span key={i} className="hz-handling-line">{line}</span>)}</p>{/* Key 19 */}
      <small className="hz-emergency">EMERGENCY TELEPHONE NUMBER: <span className="hz-inline">1-800-851-8061 / 1-804-279-3131</span></small>
    </div>
    <div className="hz-row hz-split hz-last">
      <p className="hz-cell hz-declaration">I hereby declare that the contents of this consignment are fully and accurately described above by the proper shipping name, and are classified, packaged, marked, and labeled/placarded, and are in all respects in proper condition for transport according to applicable international and national government regulations. I declare that all of the applicable air transport requirements have been met.</p>
      <div className="hz-cell">
        <small>NAME/TITLE OF SIGNATORY</small><p className="hz-value hz-center">{unsigned ? '' : 'TRAINING CERTIFIER, TSgt (FICTIONAL)'}</p>{/* Key 20 */}
        <small>PLACE AND DATE</small><p className="hz-value hz-center">{values.apoe} · {documentDate(scenario)}</p>{/* Key 21 */}
        <small>SIGNATURE <em>(see warning above)</em> {!unsigned && <span className="hz-signature">Training Certifier</span>}</small>{/* Key 22 */}
      </div>
    </div>
  </div>
  <aside className="training-cmos-source"><strong>Fictional CMOS source data</strong>{hazardRequirements(scenario).records.map(record => <dl key={record.id}>{[['DG2 Template ID',record.templateId],['Piece',record.piece],['Name and Title',record.certifier],['Hazard Codes',record.hazardCode],['Metric Hazmat Qty/UOM',`${record.page2.metricQty} ${record.page2.metricUom}`],['B/L Hazmat Qty/UOM',`${record.page2.imperialQty} ${record.page2.imperialUom}`],['Misc T-9 Required','No'],['Emergency Contact',record.page2.emergencyContact],['Certification Statement',record.certificationStatement],...record.lots.flatMap(lot=>Object.entries(lot).filter(([k])=>k!=='id'))].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>)}</aside><p className="hz-footer">DAF FORM 7507, 20250131 PRESCRIBED BY DAFI24-605V2 REPLACES AMC IMT 1033, WHICH IS OBSOLETE</p>
  </div>;
}

function Attla({ scenario, values }) {
  const letter = scenario.attla?.letter;
  if (!letter) return <><Header title="ATTLA certification" form="Training facsimile" /><p className="paper-missing">No ATTLA certification letter is in this packet.</p></>;
  if (letter.doc) return <AttlaCertification doc={letter.doc} />;
  const issued = letter.current ? documentDate(scenario) : '14 MAR 2019';
  return <>
    <Header title="Memorandum" subtitle="Air Transportability Test Loading Activity (ATTLA) — training facsimile" form={letter.id} />
    <div className="paper-memo">
      <p className="paper-right">{issued}</p>
      <p><strong>MEMORANDUM FOR</strong> {SHIPPER}</p>
      <p><strong>FROM:</strong> ATTLA Certifying Office (FICTIONAL)</p>
      <p><strong>SUBJECT:</strong> Air Transportability Certification — {values.description} ({letter.configurationId})</p>
      <ol>
        <li>The item described below has been reviewed and is certified air transportable in the configuration identified, within the limits listed. Any change to configuration, dimensions, or weight beyond these limits voids this certification.</li>
        <li>Certified configuration: <strong>{letter.configurationId}</strong>. Status: <strong>{letter.current ? 'CURRENT' : 'EXPIRED'}</strong>.</li>
        <li>Certified limits:
          <div className="paper-table"><table>
            <thead><tr><th>Max weight (lb)</th><th>Max length (in)</th><th>Max width (in)</th><th>Max height (in)</th></tr></thead>
            <tbody><tr><td>{letter.maxWeight}</td><td>{letter.maxLength}</td><td>{letter.maxWidth}</td><td>{letter.maxHeight}</td></tr></tbody>
          </table></div>
        </li>
        <li>Compare these limits with the LOGMOD record and the item as presented before acceptance.</li>
      </ol>
      <p className="paper-right">TRAINING CERTIFYING OFFICIAL, GS-12 (FICTIONAL)<br />ATTLA Engineer</p>
    </div>
  </>;
}

const DOCUMENTS = { logmod: Logmod, 'logmod-placards': LogmodPlacard, packing: PackingList, hazdec: Hazdec, attla: Attla };

// A packet document's contents, for a modal or the Shipment Planning side panel.
export function DocumentBody({ scenario, documentId }) {
  const values = Object.fromEntries(manifestFields(scenario).map(f => [f.id, f.expected]));
  const Body = DOCUMENTS[documentId];
  // Real ATTLA letters are copies of the issued certification, not fictional facsimiles.
  const real = documentId === 'attla' && scenario.attla?.letter?.doc;
  return <><p className="paper-banner">{real ? 'FOR TRAINING USE ONLY — COPY OF ISSUED ATTLA CERTIFICATION' : 'FOR TRAINING USE ONLY — FICTIONAL DOCUMENT'}</p><Body scenario={scenario} values={values} /></>;
}

export default function PaperworkDocument({ scenario, document, onClose }) {
  return <FloatingWindow title={document.title} onClose={onClose} className="paper-sheet">
    <DocumentBody scenario={scenario} documentId={document.id} />
  </FloatingWindow>;
}
