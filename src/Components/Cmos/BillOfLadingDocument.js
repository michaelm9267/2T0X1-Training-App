import { Barcode } from '../Documentation/MilitaryShippingLabel';
import { gblocForDodaac } from './dtrReference';
import { lookupValues } from './controls';
import { rinTextFor } from './dtrReference';
import { JBER_ISSUING_OFFICE } from '../jberConsignor';
import './BillOfLadingDocument.css';

// Commercial Bill of Lading print (Print BOL → F - Final / D - Draft): page 1 is the CBL form,
// then continuation sheets for marks/annotations and totals, and the item details per TCN.
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad = (n) => String(n).padStart(2, '0');
// DATED box: yyyy-mm-dd.
export const isoDate = (value) => {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const bolDate = (value) => {
  const m = /^(\d{2})([A-Za-z]{3})(\d{4})/.exec(String(value || '').trim());
  if (m) return `${m[1]}-${m[2].toUpperCase()}-${m[3]}`;
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getDate())}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};
const addressName = (code, name) => {
  const normalizedCode = String(code || '').trim();
  const normalizedName = String(name || '').trim();
  return normalizedName.toUpperCase().startsWith(`${normalizedCode.toUpperCase()} `) ? normalizedName : [normalizedCode, normalizedName].filter(Boolean).join(' ');
};
const lines = (s, prefix) => [
  addressName(s[`${prefix}Dodaac`], s[`${prefix}Name`]),
  s[`${prefix}Address1`] || s[`${prefix}Address`], s[`${prefix}Address2`],
  [s[`${prefix}City`], [s[`${prefix}State`], s[`${prefix}Zip`]].filter(Boolean).join(' ')].filter(Boolean).join(', '),
].filter(Boolean);
const Box = ({ label, children, className = '' }) => <div className={`bol-box ${className}`}><span className="bol-label">{label}</span><div className="bol-value">{children}</div></div>;

function ArticleColumns() {
  return <colgroup>{[5.24, 5.07, 3.44, 44.67, 11.86, 10.48, 5.84, 13.4].map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}</colgroup>;
}
function ArticleHead({ continuation = false }) {
  return <thead><tr><th colSpan={2}>{continuation ? 'PACKAGES' : 'TOTAL PKGS.'}</th><th rowSpan={2}>HM</th><th rowSpan={2}>DESCRIPTION OF ARTICLES (Use carrier's classification or tariff description if possible; otherwise use clear nontechnical description)</th><th rowSpan={2}>WEIGHT *<br />(Pounds Only)</th><th colSpan={3}>FOR USE OF BILLING CARRIER ONLY</th></tr>
    <tr><th>NO</th><th>KIND</th><th>Services</th><th>Rate</th><th>Charges</th></tr></thead>;
}

function Continuation({ s, issued, waybill, page, origin, children, office }) {
  return <section className="bol-page bol-continuation" aria-label={`BOL continuation page ${page}`}>
    <div className="bol-cont-head">
      <div className="bol-cont-title">COMMERCIAL BILL OF LADING<br />CONTINUATION SHEET</div>
      <div className="bol-cont-meta">
        <div className="bol-cont-row"><Box label="DATE ISSUED"><b>{issued}</b></Box><Box label="B/L NO."><b>{s.movementDocNbr}</b></Box></div>
        <div className="bol-cont-row"><Box label="CARRIER WAY/FREIGHT BILL NO. AND DATE"><b>{waybill}</b></Box><Box label="PAGE NO."><b>{page}</b></Box></div>
        <Box label="ISSUING OFFICE">{(office || origin).map((l) => <b key={l}>{l}<br /></b>)}</Box>
      </div>
    </div>
    <div className="bol-fill"><table className="bol-articles bol-cont-articles"><ArticleColumns /><ArticleHead continuation />
      <tbody>{children}</tbody></table></div>
  </section>;
}

export default function BillOfLadingDocument({ d, store }) {
  const s = d.snapshot || {};
  const final = d.variant === 'Final';
  const issued = bolDate(d.issuedAt || new Date());
  const options = d.printOptions || {};
  const pickup = bolDate(options.estimatedPickupDate || s.estimatedPickupDate);
  const shipments = d.shipmentSnapshots || [];
  const pieces = d.pieceSnapshots || [];
  const totals = d.totals || { pieces: 0, weight: 0, cube: 0 };
  const cube = Math.round(Number(totals.cube) || 0);
  const route = Object.values(store?.routings || {}).find((r) => Object.values(r.draft.equipGroups || {}).some((g) => g.cblId === d.ownerId));
  const group = route && Object.values(route.draft.equipGroups || {}).find((g) => g.cblId === d.ownerId);
  const carrier = group?.carriers?.find((c) => c.scac === s.scac);
  const conveyances = (d.details || []).filter((x) => x.collection === 'Conveyances');
  const equip = conveyances[0]?.equipTypeOrdered || group?.equipment?.[0] || '';
  const equipFurnished = conveyances[0]?.equipTypeFurnished || equip;
  // Furnish information: every conveyance's initials & numbers (primary, secondary, tractor) and seals.
  const none = (v) => String(v || '').trim() || 'NONE';
  const initials = conveyances.length
    ? conveyances.flatMap((c) => [`${none(c.primaryEqInit)}/${none(c.primaryEqNbr)}`, `${none(c.secondaryEqInit)}/${none(c.secondaryEqNbr)}`, none(c.tractorNbr)])
    : (s.scac ? [`${s.scac}/NONE`] : []);
  const seals = conveyances.flatMap((c) => (Array.isArray(c.sealNumbers) ? c.sealNumbers : [c.sealNumbers])).filter((x) => String(x || '').trim());
  const furnished = conveyances[0] || {};
  const fullyLoaded = s.vehicleFullyLoaded || conveyances.some((c) => c.vehicleFullyLoaded);
  const tender = String(s.tariffSpecialRateAuth || '').split(' - ')[0];
  const nmfc = `${s.nmfcUfc || ''}${s.nmfcSub ? s.nmfcSub : '0'}`;
  const first = shipments[0] || {};
  // Description of articles: the NMFC commodity description, then the bill's Desc of Art Misc Remarks.
  const nmfcText = (lookupValues({ id: 'nmfc' }) || []).find(([code]) => code === s.nmfcUfc)?.[1];
  const description = String(nmfcText || first.description || '').toUpperCase();
  const descRemarks = String(s.descOfArtMiscRemarks || '').toUpperCase();
  const remarks = [s.remarks1, s.remarks].filter((r) => String(r || '').trim()).map((r) => String(r).toUpperCase());
  // Issuing office: the shipper's transportation office (JBER: 773 LRS LGRN), not the ship-to address.
  const shipperDodaac = s.shipperDodaac || s.originDodaac;
  const jberOffice = !shipperDodaac || shipperDodaac === JBER_ISSUING_OFFICE.dodaac;
  const issuing = jberOffice
    ? [`${JBER_ISSUING_OFFICE.dodaac} ${JBER_ISSUING_OFFICE.unit}`, ...JBER_ISSUING_OFFICE.lines, `${JBER_ISSUING_OFFICE.city}, ${JBER_ISSUING_OFFICE.state} ${JBER_ISSUING_OFFICE.zip}`]
    : (lines(s, 'shipper').length ? lines(s, 'shipper') : lines(s, 'origin'));
  const officeHead = [...issuing.slice(0, -1), `${issuing[issuing.length - 1] || ''} ${jberOffice ? JBER_ISSUING_OFFICE.country : ''}`.trim()];
  // Item detail pages: several shipments per continuation sheet.
  const ITEMS_PER_PAGE = 2;
  const itemPages = Array.from({ length: Math.ceil(shipments.length / ITEMS_PER_PAGE) }, (_, i) => shipments.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE));
  const pages = 2 + itemPages.length;
  const certifier = String(s.certifyingPerson || '').trim().toUpperCase();
  const hazCert = String(s.hazardousCert || '').trim().toUpperCase();
  // RINs with Print RIN checked print at the top of page 2, under any HAZMAT certification, as
  // "(code) text" (e.g. "(111) SHIPPER TO LOAD AND CONSIGNEE TO UNLOAD.").
  const rinRows = [...(d.details || []).filter((x) => x.collection === 'RINs'),
    ...Object.values(store?.documents || {}).map((x) => x.saved || x.draft).filter((x) => x?.collection === 'RINs' && x.ownerId === d.ownerId && !x.saved)];
  // The DTEB RIN text says what to annotate in quotes ('Annotate BL: "Shipper to load and consignee
  // to unload." ...'); the BL prints that quoted annotation, or the whole text when there is none.
  const annotation = (text) => (/"([^"]+)"/.exec(String(text || '')) || [])[1] || String(text || '');
  const rins = [...new Map(rinRows.filter((x) => x.printRin === 'Y' && String(x.rin || '').trim()).map((x) => [x.rin, `(${x.rin}) ${annotation(x.description || rinTextFor(x.rin)).toUpperCase()}`])).values()];
  // Marks and annotations rows: one per accessorial service code, else the default stop/SCAC line.
  const svcRows = (s.serviceCodes || []).length
    ? s.serviceCodes.map((c) => ({ head: `${String(c.stop || '1').padStart(3, '0')}/NONE/${s.scac || ''}  ${c.code}`, seq: c.cnvSeqNbr || '1', text: `${c.type || ''} ${String(c.desc || '').toUpperCase()}`.trim(), charge: Number(c.charges || 0).toFixed(2) }))
    : [{ head: `001/NONE/${s.scac || ''}`, seq: '', text: '', charge: '0.00' }];
  const marks = [s.marksAnnotations, options.customs === 'Yes' && 'CUSTOMS DOCUMENTATION REQUIRED'].filter(Boolean).map((m) => String(m).toUpperCase());
  return <div className={`bol-doc ${final ? '' : 'is-draft'}`}>
    {!final && <p className="bol-draft-mark" aria-hidden="true">DRAFT</p>}
    <section className="bol-page bol-main" aria-label="BOL main form">
      <div className="bol-row bol-top"><div className="bol-title">COMMERCIAL BILL OF LADING</div><Box label="DATE ISSUED"><b className="bol-big">{issued}</b></Box><Box label="B/L NO." className="bol-blno"><b className="bol-big">{s.movementDocNbr}</b></Box></div>
      <div className="bol-row bol-carrier"><Box label="CARRIER" className="bol-w40"><b>{(carrier?.name || s.scac || '').toUpperCase()}</b></Box><Box label="SCAC" className="bol-w16"><b>{s.scac}</b></Box><Box label="CARRIER ACCOUNT" className="bol-grow"><b>{s.carrierAcctNbr}</b></Box></div>
      <div className="bol-row">
        <Box label="DESTINATION (Name, address, and ZIP code)" className="bol-w50 bol-split">{lines(s, 'destination').map((l) => <b key={l}>{l}<br /></b>)}<Box label="SPLC (Dest.)" className="bol-side"><b>{s.destinationSplc}</b></Box></Box>
        <Box label="ORIGIN (Name, address, and ZIP code)" className="bol-w50 bol-split">{lines(s, 'origin').map((l) => <b key={l}>{l}<br /></b>)}<Box label="SPLC (Orig.)" className="bol-side"><b>{s.originSplc}</b></Box></Box>
      </div>
      <div className="bol-row">
        <Box label="CONSIGNEE (Name, address, and ZIP code of installation)" className="bol-w50 bol-split">{lines(s, 'consignee').map((l) => <b key={l}>{l}<br /></b>)}<Box label="GBLOC (Cons.)" className="bol-side"><b>{s.gbloc}</b></Box></Box>
        <Box label="SHIPPER (Name, address, and ZIP code)" className="bol-w50">{lines(s, 'shipper').map((l) => <b key={l}>{l}<br /></b>)}</Box>
      </div>
      <div className="bol-row">
        <div className="bol-w50"><Box label="APPROPRIATION CHARGEABLE"><b>{first.tac ? `O/A: ${first.tac}` : ''}</b></Box><Box label="VIA (Route shipment when advantageous to the Government)">{(s.viaScacs || []).map((v) => v.scac).join(', ')}</Box></div>
        <Box label="BILL CHARGES TO (Dep/agency,bureau/office mail address & ZIP code)" className="bol-w50 bol-split">{lines(s, 'billTo').map((l) => <b key={l}>{l}<br /></b>)}
          <div className="bol-side"><b>{String(s.billType || '').split(' - ')[1]?.replace(' Pays', '') || ''}</b><Box label="AGENCY LOC CODE"><b>{s.billTo}</b></Box></div></Box>
      </div>
      <Box label={<><span>MARKS AND ANNOTATIONS</span><b>{s.deliveryDate ? `RDD ${bolDate(s.deliveryDate)}` : ''}</b></>} className="bol-marks">{marks.map((mark, i) => <b key={i}>{mark}<br /></b>)}</Box>
      <div className="bol-fill"><table className="bol-articles bol-main-articles">
        <ArticleColumns /><ArticleHead />
        <tbody className="bol-lines">
          <tr><td /><td /><td /><td><div className="bol-classification"><span><span className="bol-label">CLASSIFICATION ITEM NO</span><b>N-{nmfc}</b></span><b>{description}</b></div>
            {descRemarks && <p><b>{descRemarks}</b></p>}
            {String(s.releaseValue || '').trim() && <p><b>RELEASED VALUE: {String(s.releaseValue).toUpperCase()}</b></p>}</td><td /><td /><td /><td /></tr>
          <tr><td /><td /><td /><td className="bol-indent"><b>TOTALS B/L: &nbsp; PCS: {totals.pieces} &nbsp;&nbsp; CUBE: {cube} &nbsp;&nbsp;&nbsp;&nbsp; WT:</b><br /><b>This CBL consists of {pages} page(s) and has no stop off(s).</b></td>
            <td className="bol-num"><b>{totals.weight}</b></td><td /><td /><td /></tr>
          <tr className="bol-spacer"><td /><td /><td /><td /><td /><td /><td /><td /></tr>
          <tr><td /><td /><td /><td><b>SEE CONTINUATION PAGE(S) FOR ITEM DETAILS</b></td><td /><td colSpan={3} className="bol-total-cell"><span className="bol-label">TOTAL CHARGES</span></td></tr>
        </tbody>
      </table></div>
      <div className="bol-row bol-tender">
        <Box label="TARIFF/SPECIAL RATE AUTHORITY" className="bol-w33"><b>{tender}</b></Box>
        <Box label="" className="bol-w25"><div>PICKUP SERVICE FURNISHED <span className="bol-check">{s.pickupServiceFurnished ? 'X' : ''}</span></div><div>VEHICLE FULLY LOADED <span className="bol-check">{fullyLoaded ? 'X' : ''}</span></div></Box>
        <Box label="SHIPPER'S INITIALS" className="bol-w12"><b>{s.shipperInitials}</b></Box>
        <Box label="ROUTE ORDER/RELEASE NUMBER" className="bol-grow"><b>{s.routing}</b></Box>
      </div>
      <div className="bol-row bol-transport">
        <Box label="STOP THIS SHIPMENT AT" className="bol-w20"><span className="bol-label">FOR:</span></Box>
        <div className="bol-grow"><div className="bol-band">FURNISH INFORMATION ON CAR/TRUCKLOAD/CONTAINER SHIPMENTS</div>
          <div className="bol-row"><Box label="INITIALS & NO." className="bol-w25"><b className="bol-center-block">{initials.map((l, i) => <span key={i}>{l}<br /></span>)}</b></Box><Box label="SEAL NUMBERS" className="bol-w25"><b>{seals.join(' ')}</b></Box>
            <Box label="LENGTH/CUBE" className="bol-w25 bol-pair"><div className="bol-pair-row"><span className="bol-label">ORDERED</span><span className="bol-label">FURNISHED</span></div><div className="bol-pair-row"><b>{equip}</b><b>{equipFurnished}</b></div></Box>
            <Box label="MARKED CAPACITY" className="bol-w15 bol-pair"><div className="bol-pair-row"><span className="bol-label">ORDERED</span><span className="bol-label">FURNISHED</span></div><div className="bol-pair-row"><b>{furnished.markedCapacityOrdered}</b><b>{furnished.markedCapacityFurnished}</b></div></Box><Box label="DATE" className="bol-grow"><b>{furnished.dateFurnished ? bolDate(furnished.dateFurnished) : ''}</b></Box></div></div>
      </div>
      <div className="bol-row bol-pickup">
        <Box label="CARRIER'S PICKUP DATE" className="bol-w20"><b className="bol-big">{pickup}</b></Box><Box label="SIGNATURE OF AGENT" className="bol-w33" /><Box label="PER" className="bol-w12" />
        <Box label="CARRIER WAY/FREIGHT BILL NO. AND DATE" className="bol-grow"><b>{s.waybill}</b></Box>
      </div>
      <div className="bol-row bol-delivery-meta">
        <Box label="MODE" className="bol-w8"><b>{s.ediMode}</b></Box><Box label="ESTIMATE" className="bol-w15"><b>{s.estimatedCharges ? `${Number(s.estimatedCharges).toFixed(2)} ${s.currency || 'USD'}` : ''}</b></Box>
        <Box label="NO CLS/TLS" className="bol-w12"><b>{s.nbrOfClsTls}</b></Box><Box label="TYPE RATE" className="bol-w8"><b>{s.typeRate}</b></Box><Box label="PSC" className="bol-w5"><b>{s.blk31ProtSvc}</b></Box><Box label="REASON" className="bol-w8"><b>{s.reason}</b></Box>
        <Box label="DELIVERED ON DATE" className="bol-w15" /><Box label="AT (Actual delivery point)" className="bol-grow" />
      </div>
      <div className="bol-row bol-issuer">
        <div className="bol-w50"><Box label="ISSUING OFFICER AND OFFICE (Issuing officer name, office, and complete address)" className="bol-split">{jberOffice && <><b>{JBER_ISSUING_OFFICE.officer}</b><br /></>}{issuing.map((l) => <b key={l}>{l}<br /></b>)}
          <Box label="GBLOC" className="bol-side"><b>{gblocForDodaac(s.originDodaac || s.shipperDodaac)}</b></Box></Box>
          <div className="bol-row"><Box label="CONTRACT/PURCHASE ORDER NO. AND FOB POINT" className="bol-grow"><b>{[s.contractAuthority, s.fobPoint].filter(Boolean).join(' ') || 'DD FORM 1149'}</b></Box><Box label="DATED" className="bol-w33"><b className="bol-dated">{isoDate(d.issuedAt)}</b></Box></div></div>
        <div className="bol-receipt bol-w50">
          <Box label="BY (Name of the delivering carrier)" />
          <div className="bol-receipt-condition">DELIVERED THIS CONSIGNMENT COMPLETE & IN APPARENT GOOD ORDER EXCEPT AS MAY BE INDICATED &nbsp; SHORTAGE ☐ &nbsp; DAMAGED ☐</div>
          <div className="bol-receipt-bottom"><div>☐ CARRIER OS&D REPORT ATTACHED<br />☐ DELIVERY AT DESTINATION FURNISHED<br />☐ ACCESSORIAL SERVICES CERTIFICATION ATTACHED</div><div><Box label="NAME OF BILLING CARRIER" /><Box label="SIGNATURE OF AGENT" /></div></div>
        </div>
      </div>
      <div className="bol-legal">
        <p>"THIS IS TO CERTIFY THAT HERE-IN NAMED MATERIALS ARE PROPERLY CLASSIFIED, DESCRIBED, PACKAGED, MARKED, AND LABELED, AND ARE IN PROPER CONDITION FOR TRANSPORTATION ACCORDING TO THE APPLICABLE REGULATIONS OF THE DEPARTMENT OF TRANSPORTATION." SUBJECT TO SECTION 7 OF THE CONDITIONS, IF THIS SHIPMENT IS TO BE DELIVERED TO THE CONSIGNEE WITHOUT RECOURSE ON THE CONSIGNOR, THEN CONSIGNOR SHALL SIGN THE FOLLOWING STATEMENT" THE CARRIER SHALL NOT MAKE DELIVERY OF THIS SHIPMENT WITHOUT PAYMENT AND ALL OTHER CHARGES</p>
        <p>THIS SHIPMENT IS FOR THE ACCOUNT OF THE U.S. GOVERNMENT AND IS SUBJECT TO THE TERMS AND CONDITIONS SET FORTH IN THE STANDARD FORM OF THE U.S. GOVERNMENT BILLS OF LADING AND TO ANY AVAILABLE SPECIAL RATES AND CHARGES.</p>
        <p>ALL PARTIES HERETO AND THEIR ASSIGNS ARE FAMILIAR WITH AND AGREE THAT THIS BILL OF LADING IS SUBJECT TO: (1) THE TERMS AND CONDITIONS OF THE UNIFORM DOMESTIC STRAIGHT BILL OF LADING SET FORTH IN THE NATIONAL MOTOR FREIGHT CLASSIFICATION; AND (2) TARIFF'S AND CLASSIFICATIONS IN EFFECT ON THE DATE HEREON.</p>
        <p>RECEIVED IN APPARENT GOOD ORDER, EXCEPTIONS NOTED:</p>
        <div className="bol-legal-foot"><p><b>THIS US GOVERNMENT SHIPMENT IS SUBJECT TO THE TERMS AND CONDITIONS LISTED IN 41 CFR 102-117, TRANSPORTATION MANAGEMENT, AND 41 CFR 102-118, TRANSPORTATION PAYMENT AND AUDIT.</b></p>
          <div className="bol-barcode"><Barcode text={s.movementDocNbr || 'TRAINING'} height={36} /><b>{s.movementDocNbr}</b></div></div>
      </div>
    </section>
    <Continuation s={s} issued={issued} waybill={s.waybill} page={2} origin={issuing} office={officeHead}>
      {(remarks.length > 0 || hazCert || certifier || rins.length > 0) && <tr><td /><td /><td /><td>
        {hazCert && <p><b>{hazCert}</b></p>}
        {certifier && <p><b>CERTIFIER: {certifier}</b></p>}
        {rins.length > 0 && <p className="bol-rins">{rins.map((rin, i) => <span key={rin}>{i > 0 && <br />}<b>{rin}</b></span>)}</p>}
        {remarks.length > 0 && <p>{remarks.map((r, i) => <span key={r}>{i > 0 && <br />}<b>{r}</b></span>)}</p>}
      </td><td /><td /><td /><td /></tr>}
      <tr><td /><td /><td /><td className="bol-totals-label"><b>SHIPMENT TOTALS:</b></td><td /><td /><td /><td /></tr>
      {['FREIGHT', 'NET', 'GROSS'].map((label) => <tr key={label}><td /><td /><td /><td className="bol-totals-label"><b>{label} =</b></td><td className="bol-num"><b>{totals.weight}</b></td><td /><td /><td /></tr>)}
      <tr><td /><td /><td /><td><table className="bol-commodity"><tbody>
        <tr><td><b>COMMODITY SUMMARY:</b></td><td /><td /></tr>
        <tr><td><b>Commodity Code<br />and sub-element</b></td><td><b>Freight<br />Quantity</b></td><td><b>Quantity<br />Qualifier</b></td></tr>
        <tr><td><b>{s.nmfcUfc}({s.nmfcSub || '0'})</b></td><td><b>{Number(totals.weight).toLocaleString('en-US')}</b></td><td><b>LB</b></td></tr>
      </tbody></table></td><td /><td /><td /><td /></tr>
      <tr><td /><td /><td /><td><b>MARKS AND ANNOTATIONS</b></td><td /><td /><td /><td /></tr>
      {svcRows.map((r, i) => <tr key={i}><td /><td /><td /><td className="bol-indent"><span className="bol-svc-row"><b>{r.head}</b><b>{r.seq}</b><b>{r.text}</b></span></td><td /><td className="bol-num"><b>{r.charge}</b></td><td className="bol-num"><b>{r.charge}</b></td><td /></tr>)}
      <tr className="bol-spacer"><td /><td /><td /><td /><td /><td /><td /><td /></tr>
    </Continuation>
    {itemPages.map((group, i) => <Continuation key={i} s={s} issued={issued} waybill={s.waybill} page={3 + i} origin={issuing} office={officeHead}>
      {group.map((sh) => {
        const own = pieces.filter((p) => p.shipmentId === sh.id);
        return <tr key={sh.id}><td className="bol-num"><b>{sh.totals?.pieces ?? own.length}</b></td><td><b>{own[0]?.typePack || ''}</b></td><td><b>{String(sh.hazmat || '').startsWith('N') || !sh.hazmat ? '' : 'X'}</b></td>
          <td><b>TCN: {sh.tcn} &nbsp; CUBE: {Math.round(Number(sh.totals?.cube) || 0)}</b><br /><b>COMMODITY: N-{nmfc}</b><br /><b>{String(sh.description || '').toUpperCase()}</b>
            {sh.nsn && <><br /><b>NSN: {sh.nsn}</b></>}
            {own.map((p, n) => <span key={p.id}><br /><b>PIECE DATA: PC {n + 1} Dim: {p.length}L x {p.width}W x {p.height}H Wt: {p.weight} Cu: {Math.round((Number(p.length) * Number(p.width) * Number(p.height)) / 1728) || ''} Type Pack: {p.typePack}</b></span>)}</td>
          <td className="bol-num"><b>{sh.totals?.weight}</b></td><td /><td /><td /></tr>;
      })}
      {i === itemPages.length - 1 && marks.length > 0 && <tr><td /><td /><td /><td className="bol-indent"><b>{marks.join(' ')}</b></td><td /><td /><td /><td /></tr>}
      <tr className="bol-spacer"><td /><td /><td /><td /><td /><td /><td /><td /></tr>
    </Continuation>)}
  </div>;
}
