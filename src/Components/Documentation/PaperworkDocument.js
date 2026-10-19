import RegulationHelp, { HazardReference } from '../Regulations/RegulationHelp';
import RegulationLink from '../Regulations/RegulationLink';
import { JBER_CONSIGNOR, JBER_CITY_LINE } from '../jberConsignor';
import { hazardRequirements } from '../CdfCmos/trainingData';
import FloatingWindow from '../Session/FloatingWindow';
import { manifestFields, tcnUln, tcnIncrement, DODAAC_INFO, ORIGIN } from '../CargoWindow/workflow';
import { findUnNumber } from './unNumbers';
import AttlaCertification from './AttlaCertification';
import { DG2_CATALOG, emergencyContactsFor } from '../Cmos/dg2Reference';
import { WRONG_UN } from '../CargoWindow/discrepancies';
import { pieceCB } from '../LoadPlan/loadPlanLogic';
import './logmod-load-list.css';
import './marshaling-placard.css';

// Fictional training facsimiles of the increment monitor's paperwork packet. Every value comes
// from the current shipment snapshot, so documents change with each reset.
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function documentDate(scenario) {
  const day = scenario.documentDay || 285;
  const date = new Date(Date.UTC(2026, 0, day));
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
const SHIPPER = `${ORIGIN} ${DODAAC_INFO[ORIGIN].unit}`;

// Fictional stock numbers and organization/shop codes, stable for each training asset.
// These are simulated identifiers, not verified catalog records.
const LOGMOD_ASSETS = {
  'rolling-stock': { nsn: '2320-00-999-1001', orgShop: 'TRN/VEH' },
  'isu-90': { nsn: '8145-00-999-1002', orgShop: 'TRN/SUP' },
  '463l-pallet': { nsn: '1670-00-999-1003', orgShop: 'TRN/SUP' },
  'three-axle': { nsn: '2320-00-999-1004', orgShop: 'TRN/VEH' },
  'age-generator': { nsn: '1730-00-999-1005', orgShop: 'TRN/AGE' },
  'mj1-jammer': { nsn: '1730-00-999-1006', orgShop: 'TRN/MUN' },
};
function logmodData(scenario) {
  return {
    ...(LOGMOD_ASSETS[scenario.id] || { nsn: '9999-00-999-1099', orgShop: 'TRN/LGRT' }),
    // Use the same forward-datum balance as load planning, independent of document weight errors.
    cb: Math.round(pieceCB(scenario)),
  };
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
  if (scenario.ammo) return [{ un:'UN0012', quantity:'1 crate × 15 kg N.E.W.', instruction:'A5.12', authorization:'', handling:['Fictional ammunition lot TRN-001, DODIC A059, 100 rounds.'] }];
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

// Report bands follow the supplied LOGMOD Execution Load List. Unmodeled fields stay blank.
function LogmodBand({ fields, className = '' }) {
  return <dl className={`logmod-band ${className}`}>{fields.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>
  )}</dl>;
}

function Logmod({ scenario, values }) {
  const asset = logmodData(scenario);
  const weight = scenario.paperworkWeight ?? values.weight;
  const hazardous = !values.hazmat.startsWith('N');
  const hazards = hazardous ? declaredHazards(scenario, weight) : [];
  const rolling = Boolean(scenario.axles);
  const type = scenario.id === '463l-pallet' ? 'Pallet' : rolling ? 'Vehicle / equipment' : 'Container';
  const hazardCodes = hazards.map(row => findUnNumber(row.un)?.division).filter(Boolean).join(', ');
  const header = <>
    <header className="logmod-heading"><p>TRAINING — {tcnUln(values.tcn)}</p><h2>Execution Load List</h2></header>
    <LogmodBand className="logmod-plan" fields={[
      ['SOE', '—'], ['Plan', 'CARGO'], ['UTC', 'TRN01'], ['ULN', tcnUln(values.tcn)], ['UTC Title', 'TRAINING CARGO'], ['TTAN', '—'],
    ]} />
    <LogmodBand className="logmod-increment" fields={[
      ['Dep Ech', '—'], ['Inc Nbr', tcnIncrement(values.tcn)], ['Inc Title', values.description], ['Mvmt Pri', '—'],
      ['Weight', weight], ['Length', values.length], ['Width', values.width], ['Height', values.height], ['Vent', '—'], ['TTN', '—'],
    ]} />
    <LogmodBand className="logmod-org" fields={[
      ['Inc Prime UIC/Org', SHIPPER], ['Inc Prime FAC/FAC Title', '—'], ['CCC', '—'],
      ['Hazard Codes', hazardCodes || '—'], ['SHI Codes', '—'], ['TCN', values.tcn],
    ]} />
    <LogmodBand fields={[
      ['CB (in)', asset.cb], ['NSN', asset.nsn], ['Org/Shop', asset.orgShop],
    ]} />
  </>;
  const footer = (page, total) => <footer className="logmod-footer"><span>TRAINING OPERATOR<br />Originating Office: {values.origin}</span><span>FOR TRAINING USE ONLY<br />{documentDate(scenario)}</span><span>Page {page} of {total}</span></footer>;
  return <div className="logmod-report" tabIndex={0} role="region" aria-label="Execution load list">
    <section className="logmod-page">
      {header}
      <table className="logmod-items" aria-label="Increment items">
        <thead><tr>{['Item', 'CC', 'NSN', 'Type', 'Nomenclature', 'ASC', 'Org/Shop', 'Qty', 'Wgt', 'Lth', 'Wth', 'Hgt', 'CCC', 'Haz', 'SHI'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody><tr><td>01</td><td>—</td><td>{asset.nsn}</td><td>—</td><td>{values.description}</td><td>—</td><td>{asset.orgShop}</td><td>{values.pieces}</td><td>{weight}</td><td>{values.length}</td><td>{values.width}</td><td>{values.height}</td><td>—</td><td>{hazardCodes || '—'}</td><td>—</td></tr></tbody>
      </table>
      <p className="logmod-note">Increment summary; item-level inventory is not supplied by this training scenario. NSN and Org/Shop are simulated. Weight in pounds; dimensions and CB in inches from the forward datum. 463L pallets and ISUs: CB 44 in (88 in side forward); other non-wheeled cargo uses midpoint CB. — = not supplied.</p>
      <LogmodBand className="logmod-configuration" fields={[
        ['Inc Type', type], ['C/B', asset.cb], ['Parking', '—'], ['Rolling', rolling ? 'Y' : 'N'], ['Sleeper', '—'],
        ['Pallet Profile', '—'], ['Front Overhang', '—'], ['Rear Overhang', '—'],
      ]} />
      <LogmodBand fields={[
        ['Origin DoDAAC', values.origin], ['APOE', values.apoe], ['Destination DoDAAC', values.destination], ['APOD', values.apod],
        ['Configuration', scenario.attla?.configurationId], ['Cube (ft³)', (values.length * values.width * values.height / 1728).toFixed(1)],
      ]} />
      {footer(1, hazardous ? 2 : 1)}
    </section>
    {hazardous && <section className="logmod-page" aria-label="Hazardous cargo detail">
      {header}
      <LogmodBand fields={[
        ['Nomenclature', values.description], ['Hazard Ind', values.hazmat.slice(0, 1)], ['Nr Pieces', values.pieces], ['DODAAC', values.origin],
      ]} />
      {hazards.map(row => <div className="logmod-hazard" key={row.un}>
        <LogmodBand fields={[
          ['UN NA ID', row.un], ['UN Class Div', findUnNumber(row.un)?.division],
          ['Clear Text 1', row.name || findUnNumber(row.un)?.names[0]], ['Clear Text 2', row.instruction],
        ]} />
        <LogmodBand fields={[
          ['Lot Number', scenario.ammo ? 'TRN-001' : '—'], ['Quantity', row.quantity], ['Remarks', row.handling.join(' · ') || '—'],
        ]} />
      </div>)}
      {footer(2, 2)}
    </section>}
  </div>;
}

// The source report prints two identical copies with the same numbered blocks.
function MarshalingField({ label, value, className = '' }) {
  return <div className={`marshaling-field ${className}`}><dt>{label}</dt><dd>{value ?? '\u00a0'}</dd></div>;
}

function LogmodPlacard({ scenario, values }) {
  const asset = logmodData(scenario);
  const increment = tcnIncrement(values.tcn);
  const weight = scenario.paperworkWeight ?? values.weight;
  return <div className="marshaling-report" role="region" aria-label="Marshaling placard sheet" tabIndex={0}>
    {[1, 2].map(copy => <section className="marshaling-placard" key={copy} aria-label={`Deployment Marshaling Placard copy ${copy}`}>
      <h2>Deployment Marshaling Placard</h2>
      <dl className="marshaling-blocks">
        <MarshalingField className="marshaling-tcn" label="1. Transportation Control" value={values.tcn} />
        <div className="marshaling-origin-row">
          <MarshalingField label="2. From" value={DODAAC_INFO[values.origin]?.unit || values.origin} />
          <MarshalingField label="TTAN:" />
          <MarshalingField label="TTN:" />
          <div className="marshaling-dimensions">
            <MarshalingField label="L" value={values.length} /><span aria-hidden="true">×</span>
            <MarshalingField label="W" value={values.width} /><span aria-hidden="true">×</span>
            <MarshalingField label="H" value={values.height} />
            <MarshalingField label="CB" value={asset.cb} />
          </div>
        </div>
        <div className="marshaling-movement-row">
          <MarshalingField label="3. Trans Priority" />
          <MarshalingField label="4. Date Shipped" />
          <MarshalingField label="5. Piece Number" value="1" />
          <MarshalingField label="6. Total Pieces" value={values.pieces} />
          <MarshalingField label="7. Weight" value={Number(weight).toLocaleString('en-US')} />
          <MarshalingField label="8. Cube" value={Math.round(values.length * values.width * values.height / 1728)} />
          <MarshalingField label="9. Chalk" />
        </div>
        <div className="marshaling-unit-row">
          <MarshalingField label="10. UNIT TYPE CODE (UTC)" value="TRN01" />
          <MarshalingField label="11. UNIT LINE NUMBER (ULN)" value={tcnUln(values.tcn)} />
        </div>
        <MarshalingField className="marshaling-increment" label="12. DEPLOYMENT ECHELON/INCREMENT NUMBER" value={`${increment.slice(0, 1)} / ${increment.slice(1)}`} />
        <MarshalingField className="marshaling-remarks" label="13. REMARKS" value={<><span>{values.description}</span><span>NSN: {asset.nsn} · Org/Shop: {asset.orgShop} (simulated)</span><span>{values.origin} / {values.apoe} → {values.destination} / {values.apod} · {values.hazmat}</span></>} />
      </dl>
    </section>)}
    <p className="marshaling-note">FOR TRAINING USE ONLY · Weight: lb · Cube: ft³ · Dimensions and CB: in from the forward datum · 463L pallets and ISUs: CB 44 in (88 in side forward); other non-wheeled cargo uses midpoint CB · Unavailable fields are blank.</p>
  </div>;
}

// LOGMOD Execution Material List (the packing list LOGMOD prints for an increment). Items are
// grouped by owning FAC: A = item, C = container with its contents as S (suffix) rows. Line weights
// add up to the increment weight. Hazard codes print without the division point (1.4S as 14S).
const hazCode = division => String(division || '').replace('.', '');
const nsnOf = nsn => nsn.replace(/-/g, '');
const PALLET_BUILD = [
  { cc: 'A', nsn: '1670008204896CT', nomen: '463L PALLET', qty: 1, wgt: 290, lth: 88, wth: 108, hgt: 3, ccc: 'J3D' },
  { cc: 'A', nsn: '1670009694103CT', nomen: 'TOP NET, HCU-15/C', qty: 1, wgt: 21, lth: 1, wth: 1, hgt: 1, ccc: 'J3D' },
  { cc: 'A', nsn: '1670009962780CT', nomen: 'SIDE NET, HCU-7/E', qty: 2, wgt: 22, lth: 1, wth: 1, hgt: 1, ccc: 'J3D' },
  { cc: 'A', nsn: '5510005547760', nomen: 'DUNNAGE', qty: 3, wgt: 30, lth: 88, wth: 4, hgt: 4, ccc: 'J3D' },
];
// Split what is left of the increment weight across the containers, in whole pounds.
const share = (total, parts) => parts.map((part, i) => i < parts.length - 1 ? Math.round(total * part) : total - parts.slice(0, -1).reduce((sum, p) => sum + Math.round(total * p), 0));
function materialList(scenario, values, weight) {
  const hazards = values.hazmat.startsWith('N') ? [] : declaredHazards(scenario, weight);
  const division = un => findUnNumber(un)?.division;
  const fac = (code, title) => `${tcnUln(values.tcn)}/TRN0001 ${code}/${title}`;
  const number = (rows, start = 1) => { let item = start - 1; return rows.map(row => row.suf ? { ...row, item: String(item).padStart(2, '0') } : { ...row, item: String(++item).padStart(2, '0') }); };
  if (scenario.ammo) {
    const h = hazards[0];
    return { hazards, type: 'Pallet', groups: [{ fac: fac('430000', 'SECURITY FORCES'), rows: number([
      { cc: 'C', nsn: '13050SENSCRGO', nomen: 'SENSITIVE CARGO', qty: 1, wgt: weight, lth: values.length, wth: values.width, hgt: values.height, ccc: 'M3D', haz: hazCode(division(h.un)), shi: 'H,4' },
      { suf: '001', cc: 'S', nsn: '1305999990012', nomen: 'CTG, 5.56MM BALL (TRAINING)', qty: 100, haz: hazCode(division(h.un)), shi: 'H,4' },
    ]) }] };
  }
  if (scenario.id === '463l-pallet' || scenario.id === 'isu-90') {
    const isu = scenario.id === 'isu-90';
    const build = isu ? [{ cc: 'A', nsn: nsnOf(LOGMOD_ASSETS['isu-90'].nsn), nomen: 'CONTAINER, ISU-90', qty: 1, wgt: 1450, lth: values.length, wth: values.width, hgt: values.height, ccc: 'J3D' }, PALLET_BUILD[3]] : PALLET_BUILD;
    const rest = weight - build.reduce((sum, row) => sum + row.wgt, 0);
    const contents = isu
      ? [['CRATE, GENERAL SUPPLIES', 'OFFICE AND ADMIN SUPPLIES', 1, '', .3], ['CRATE, GENERAL SUPPLIES', 'PAINT, AEROSOL, FLAMMABLE', 12, hazCode(division('UN1950')), .25], ['CRATE, GENERAL SUPPLIES', 'CLEANING AND JANITORIAL', 1, '', .3], ['CASE, TOOL', 'TOOL KIT, GENERAL MECHANIC', 1, '', .15]]
      : [['CRATE, GENERAL SUPPLIES', 'GENERAL SUPPLIES, HEAVY', 4, '', .6], ['CARTON, GENERAL SUPPLIES', 'GENERAL SUPPLIES, LIGHT', 8, '', .4]];
    const weights = share(rest, contents.map(row => row[4]));
    const containers = contents.flatMap(([container, item, qty, haz], i) => [
      { cc: 'C', nsn: `8115999${String(i + 1).padStart(4, '0')}`, nomen: container, qty: isu ? 1 : qty, wgt: weights[i], lth: isu ? 30 : 48, wth: isu ? 26 : 40, hgt: isu ? 26 : 24, ccc: 'J3D', haz },
      { suf: '001', cc: 'S', nsn: `7510999${String(i + 1).padStart(4, '0')}`, nomen: item, qty: isu ? qty : qty * 6, haz },
    ]);
    return { hazards, type: isu ? 'Container' : 'Pallet', remarks: 'NOTE ITEM AND SUFFIX ITEM QUANTITIES', groups: [
      { fac: fac('25B200', isu ? 'LOGISTICS READINESS' : 'MUNITIONS COMBAT PLANS & MOBIL'), rows: number(build) },
      { fac: fac('430000', 'SUPPLY'), rows: number(containers, build.length + 1) },
    ] };
  }
  // Vehicles and equipment ship as one item.
  const h = hazards[0];
  return { hazards, type: 'Rolling stock', remarks: (HANDLING_STATEMENTS[scenario.id] || []).join(' · '), groups: [{ fac: fac('42B100', 'VEHICLE MANAGEMENT'), rows: number([
    { cc: 'A', nsn: nsnOf(logmodData(scenario).nsn), nomen: values.description.toUpperCase(), qty: 1, wgt: weight, lth: values.length, wth: values.width, hgt: values.height, ccc: 'L3D', haz: h ? hazCode(division(h.un)) : '', shi: 'G' },
  ]) }] };
}

function PackingList({ scenario, values }) {
  const weight = Number(scenario.paperworkWeight ?? values.weight);
  const list = materialList(scenario, values, weight);
  const rows = list.groups.flatMap(group => group.rows);
  const codes = key => [...new Set(rows.map(row => row[key]).filter(Boolean).flatMap(code => code.split(',')))].join(',');
  const cb = logmodData(scenario).cb;
  const header = <>
    <header className="logmod-heading"><p>{tcnUln(values.tcn)}TRN0001 - TRN01</p><h2>Execution Material List</h2></header>
    <LogmodBand className="logmod-plan" fields={[['Schedule', 'TRN01'], ['Plan', 'CARGO'], ['UTC', 'TRN01'], ['ULN', tcnUln(values.tcn)], ['UTC Title', 'TRAINING CARGO'], ['', '']]} />
    <LogmodBand className="logmod-increment" fields={[['Dep Ech', tcnIncrement(values.tcn).slice(0, 1)], ['Inc Nbr', tcnIncrement(values.tcn).slice(1)], ['Inc Title', values.description.toUpperCase()], ['', ''], ['Weight', weight], ['Length', values.length], ['Width', values.width], ['Height', values.height], ['Vent', 'N'], ['', '']]} />
    <LogmodBand className="logmod-org" fields={[['Inc Prime UIC/Org', `${tcnUln(values.tcn)}/TRN0001`], ['Inc Prime FAC/FAC Title', list.groups[0].fac.split(' ').slice(1).join(' ')], ['', ''], ['Hazard Codes', codes('haz')], ['SHI Codes', codes('shi')], ['CCC', rows.find(row => row.cc !== 'S' && row.ccc !== 'J3D')?.ccc || 'J3D']]} />
  </>;
  const pages = 2;
  const footer = page => <footer className="logmod-footer"><span>TRAINING OPERATOR<br />Originating Office: {values.origin}</span><span>FOR TRAINING USE ONLY<br />{documentDate(scenario)}</span><span>Page {page} of {pages}</span></footer>;
  const hazard = list.hazards[0];
  return <div className="logmod-report" tabIndex={0} role="region" aria-label="Execution material list">
    <section className="logmod-page">
      {header}
      {list.groups.map(group => <div key={group.fac}>
        <h3 className="logmod-fac">{group.fac}</h3>
        <table className="logmod-items logmod-material" aria-label={`Items · ${group.fac}`}>
          <thead><tr>{['Item', 'Suf', 'CC', 'NSN', 'Nomenclature', 'ASC', 'Org/Shop', 'Qty', 'Wgt', 'Lth', 'Wth', 'Hgt', 'CCC', 'Haz', 'SHI'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{group.rows.map(row => <tr key={`${row.item}-${row.suf || ''}`}>{[row.item, row.suf, row.cc, row.nsn, row.nomen, '', '', row.qty, row.wgt, row.lth, row.wth, row.hgt, row.ccc, row.haz, row.shi].map((cell, i) => <td key={i}>{cell ?? ''}</td>)}</tr>)}</tbody>
        </table>
      </div>)}
      <LogmodBand className="logmod-configuration" fields={[['Inc Type', list.type], ['C/B', cb], ['Parking', 'N'], ['Rolling', scenario.axles ? 'Y' : 'N'], ['Sleeper', 'N']]} />
      <LogmodBand className="logmod-configuration" fields={[['Pallet Profile', list.type === 'Pallet' ? 'A' : ''], ['Front Overhang', 0], ['Rear Overhang', 0]]} />
      {hazard && <div className="logmod-hazard" aria-label="Hazardous cargo data">
        <LogmodBand className="logmod-configuration" fields={[['Air Dim Code', 'Z'], ['Hazard Ind', values.hazmat.slice(0, 1)], ['T9 Ind', 'Y'], ['Comm/SH', scenario.ammo ? '33' : 'AZ'], ['DODAAC', values.origin], ['Type Pack', 'PT']]} />
        <LogmodBand className="logmod-configuration" fields={[['Nomenclature', scenario.ammo ? 'AMMO' : values.description.toUpperCase().slice(0, 6)], ['BII Nr Pieces', ''], ['Nr Rounds', scenario.ammo ? '000100' : ''], ['UN Class Div', hazCode(findUnNumber(hazard.un)?.division)], ['UN NA ID', hazard.un], ['IMMDGC', ''], ['DODIC', scenario.ammo ? 'A059' : '']]} />
        <LogmodBand className="logmod-configuration" fields={[['Clear Text 1', hazard.name || findUnNumber(hazard.un)?.names[0]], ['Clear Text 2', `CLASS ${hazCode(findUnNumber(hazard.un)?.division)} ${hazard.un}`], ['Clear Text 3', hazard.instruction]]} />
        {scenario.ammo && <table className="logmod-items logmod-lots" aria-label="Lot data">
          <thead><tr>{['Lot Number', 'Net Explosive', 'Pieces', 'Weight', 'Cube'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody><tr><td>TRN-001</td><td>15</td><td>1</td><td>{weight}</td><td>{Math.round(values.length * values.width * values.height / 1728)}</td></tr></tbody>
        </table>}
      </div>}
      {footer(1)}
    </section>
    <section className="logmod-page" aria-label="Remarks">
      {header}
      <h3 className="logmod-fac">Remarks</h3>
      <p className="logmod-remarks">{list.remarks || ''}</p>
      {footer(2)}
    </section>
  </div>;
}

// Laid out after DAF Form 7507 (20250131); the comments mark the form's numbered keys.
function Hazdec({ scenario, values }) {
  // A HAZDEC error shows a transposed UN number beside the correct shipping name, or no signature.
  const rows = declaredHazards(scenario, scenario.paperworkWeight ?? values.weight).map(row => ({ ...row, shown: scenario.hazdecError === 'un' ? WRONG_UN[row.un] || row.un : row.un }));
  // Match the declared shipping-name variant, not just the UN number (Table A4.1).
  const provisions = rows.map(row => DG2_CATALOG.find(entry =>
    entry.unId === row.un && !entry.forbidden && !entry.referenceOnly &&
    entry.name.split(/\s+or\s+/i).some(name => name.toUpperCase() === (row.name || findUnNumber(row.un)?.names[0]).toUpperCase())
  )?.specialProvisions || '');
  const passengerPermitted = provisions.every(value => /\bP5\b/.test(value) && !/\bP[1-4]\b/.test(value));
  const emergency = [...new Set(rows.flatMap(row => emergencyContactsFor({ division: findUnNumber(row.un)?.division }).map(contact => contact.number)))].join(' / ');
  const unsigned = scenario.hazdecError === 'signature';
  const struck = text => <span className="hz-option hz-deleted">{text}</span>;
  const kept = text => <span className="hz-option">{text}</span>;
  return <div className="hz-page"><div className="hz-form">
    <div className="hz-title">SHIPPER'S DECLARATION FOR DANGEROUS GOODS</div>
    <div className="hz-row hz-split">
      <div className="hz-cell">
        <small>SHIPPER</small>
        <p className="hz-value">{[SHIPPER, JBER_CONSIGNOR.address1, JBER_CONSIGNOR.address2, JBER_CITY_LINE].map(line => <span className="hz-handling-line" key={line}>{line}</span>)}</p>{/* Key 1 */}
        <small>PHONE NUMBER: <span className="hz-inline">{JBER_CONSIGNOR.phone}</span></small>
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
            <div className="hz-options">{(passengerPermitted ? kept : struck)('PASSENGER AND CARGO AIRCRAFT')}{(passengerPermitted ? struck : kept)('CARGO AIRCRAFT ONLY')}</div>{/* Key 7 */}
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
        <td><HazardReference un={row.un} name={row.name || entry?.names[0]}>{row.name || entry?.names[0]}</HazardReference></td>{/* Key 12 */}
        <td>{entry?.division}{entry?.subsidiary ? ` (${entry.subsidiary})` : ''}</td>{/* Keys 13/14 */}
        <td>{entry?.packingGroup === 'N/A' ? '' : entry?.packingGroup}</td>{/* Key 15 */}
        <td>{row.quantity}</td>{/* Key 16 */}
        <td><RegulationLink details={false} citationId={`afman604.${row.instruction}`}>{row.instruction}</RegulationLink></td>{/* Key 17 */}
        <td>{row.authorization}</td>{/* Key 18 */}
      </tr>; })}<tr className="hz-filler"><td /><td /><td /><td /><td /><td /><td /></tr></tbody>
    </table></div>
    <div className="hz-row hz-cell hz-handling">
      <small>ADDITIONAL HANDLING INFORMATION</small>
      <p className="hz-value">{rows.flatMap(row => row.handling).map((line, i) => <span key={i} className="hz-handling-line">{line}</span>)}</p>{/* Key 19 */}
      <small className="hz-emergency">EMERGENCY TELEPHONE NUMBER: <span className="hz-inline">{emergency}</span></small>
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
  return <><p className="paper-banner">{real ? 'FOR TRAINING USE ONLY — COPY OF ISSUED ATTLA CERTIFICATION' : 'FOR TRAINING USE ONLY — FICTIONAL DOCUMENT'}</p><Body scenario={scenario} values={values} /><RegulationHelp claims={documentId === 'hazdec' ? ['documents.hazdec', 'hazmat.classification', 'hazmat.passengers', 'hazmat.preparation', 'hazmat.declaration', 'hazmat.emergency'] : documentId === 'attla' ? ['documents.attla'] : documentId === 'logmod-placards' ? ['cargo.cb', 'cargo.weight', 'marshaling.preparation'] : ['documents.load', 'cargo.weight', 'cargo.cb']} assumptions={['Shipment identifiers, stock numbers, shop codes, dates, quantities and form values are simulated. Cargo midpoint CB is a model assumption.']} /></>;
}

export default function PaperworkDocument({ scenario, document, onClose }) {
  return <FloatingWindow title={document.title} onClose={onClose} className={`paper-sheet${['logmod', 'packing'].includes(document.id) ? ' logmod-sheet' : document.id === 'logmod-placards' ? ' marshaling-sheet' : ''}`}>
    <DocumentBody scenario={scenario} documentId={document.id} />
  </FloatingWindow>;
}
