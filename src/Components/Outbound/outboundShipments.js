import { ITEMS, HARDWARE, CONUS, OVERSEAS, TACS, ORIGINS, VENDORS, DELIVERY_POINTS, conusFor, splitCity, packedSize, correctContainer } from './outboundData';

// Customer shipments for the Outbound trainer. Each session queues four customers whose shipments
// cover every Mil Mode the origin uses, so each CMOS path gets practiced.

const pick = (random, list) => list[Math.floor(random() * list.length)];
const between = (random, low, high) => low + Math.floor(random() * (high - low + 1));
const shuffle = (random, list) => list.map(value => [random(), value]).sort((a, b) => a[0] - b[0]).map(([, value]) => value);

// Day of year the customer brings the shipment in (12 OCT 2026).
export const DOCUMENT_DAY = 285;
export const julian = day => `6${String(day).padStart(3, '0')}`;

export const DISCREPANCIES = {
  quantity: 'Quantity on the document does not match the count of items presented',
  nsn: 'NSN on the document does not match the item identification tag',
  condition: 'Condition code on the document does not match the item condition tag',
  funding: 'Transportation account code (TAC) / fund citation is missing',
  shipto: 'Ship-to DoDAAC and address are missing',
  signature: 'DD 1149 is not signed by an authorized requester (block 10)',
};

// Transportation priority. DD 1348-1A: DTR Part II, Chapter 203, Table 203-3 and DAFI 24-602V2
// Table 2.1. PD 01–03 is TP1 unless the RDD starts with X or S (then TP3, DTR). PD 04–15 is TP2 with
// an RDD of 444, 555, 777, N__ or E__, or a Julian RDD 8 days out or less for a CONUS customer (21
// for OCONUS); otherwise TP3. DD 1149 (DAFI Table 2.1): there is no PD, so the RDD alone decides:
// 2 days or less TP1 (5 OCONUS), 8 days or less TP2 (21 OCONUS), later or blank TP3.
const daysOut = code => {
  const day = Number(code);
  return /^\d{3}$/.test(code) && day >= 1 && day <= 366 ? day - DOCUMENT_DAY : null;
};
export function transportationPriority(pd, rdd = '', oconus = false, document = '1348-1A') {
  const code = String(rdd || '').trim().toUpperCase();
  const days = daysOut(code);
  if (document === '1149') {
    if (days === null) return 'TP3';
    return days <= (oconus ? 5 : 2) ? 'TP1' : days <= (oconus ? 21 : 8) ? 'TP2' : 'TP3';
  }
  if (Number(pd) <= 3) return /^[XS]/.test(code) ? 'TP3' : 'TP1';
  if (['444', '555', '777'].includes(code) || /^[NE]/.test(code)) return 'TP2';
  return days !== null && days <= (oconus ? 21 : 8) ? 'TP2' : 'TP3';
}
export const shipmentTp = shipment => transportationPriority(shipment.pd, shipment.rdd, Boolean(OVERSEAS[shipment.dodaac]), shipment.document);
// A priority designator and RDD that give the wanted TP for this customer. A DD 1149 carries a
// calendar RDD only (block 7) and its TP in block 8, so it gets no PD.
function priorityFor(random, tp, oconus, document) {
  if (document === '1149') {
    const [low, high] = { TP1: [1, oconus ? 5 : 2], TP2: [oconus ? 6 : 3, oconus ? 21 : 8], TP3: [oconus ? 25 : 10, 45] }[tp];
    return { pd: '', rdd: tp === 'TP3' && random() < .25 ? '' : String(DOCUMENT_DAY + between(random, low, high)) };
  }
  if (tp === 'TP1') return { pd: pick(random, ['01', '02', '03']), rdd: random() < .3 ? '999' : String(DOCUMENT_DAY + between(random, 3, 20)) };
  const pd = pick(random, ['05', '06', '09', '12', '13']);
  if (tp === 'TP2') return { pd, rdd: random() < .5 ? pick(random, ['777', 'N05', 'E10', '444']) : String(DOCUMENT_DAY + between(random, 2, oconus ? 18 : 6)) };
  return { pd, rdd: random() < .25 ? '' : String(DOCUMENT_DAY + between(random, oconus ? 25 : 10, 45)) };
}

function niin(random) {
  return `01-${between(random, 100, 999)}-${String(between(random, 0, 9999)).padStart(4, '0')}`;
}

// What each queued customer is built to exercise. 'amc-overseas' ships to an overseas unit;
// 'amc-conus' is a routine (TP3) small parcel from Alaska to the lower 48, which moves by AMC channel.
// Small parcel air goes up to 150 lb within CONUS and 300 lb between CONUS and Alaska, so the brake
// assembly (290 lb) fits from JBER but not from Travis. Hardware past 24 boxes ships on a triwall
// pallet that is over the carriers' 165 in length + girth either way, as are the tire and the APU.
const SMALL = [['circuit-card'], ['display-unit'], ['actuator'], ['starter'], ['radio'], ['harness'], ['seal-kit'], ['filter'], ['valve'], ['pump'], ['antenna'], ['generator'], ...HARDWARE.map(id => [id, 2, 12])];
const LARGE = [['panel'], ['gearbox'], ['tire'], ['apu'], ...HARDWARE.map(id => [id, 28, 40])];
// The brake and wheel (about 200–290 lb packed) fit small parcel from Alaska but not within CONUS.
const HEAVY = [['brake'], ['wheel']];
const ANY = [['circuit-card'], ['display-unit'], ['actuator'], ['starter'], ['radio'], ['valve'], ['generator'], ['filter'], ['tire'], ['apu'], ...HEAVY, ['panel'], ['gearbox'], ...HARDWARE.map(id => [id, 2, 30])];
const ALL_TP = ['TP1', 'TP2', 'TP3'];
const TARGETS = {
  J: { mode: 'J', items: { jber: [...SMALL, ...HEAVY], travis: SMALL }, overseas: false, tp: { jber: ['TP1', 'TP2'], travis: ['TP1'] } },
  5: { mode: '5', items: { travis: SMALL }, overseas: false, tp: { travis: ['TP2', 'TP3'] } },
  B: { mode: 'B', items: { jber: LARGE, travis: [...LARGE, ...HEAVY] }, overseas: false, tp: { jber: ALL_TP, travis: ALL_TP } },
  'amc-overseas': { mode: '9', items: { jber: ANY, travis: ANY }, overseas: true, tp: { jber: ALL_TP, travis: ALL_TP } },
  'amc-conus': { mode: '9', items: { jber: [...SMALL, ...HEAVY] }, overseas: false, tp: { jber: ['TP3'] } },
};
export const ORIGIN_TARGETS = { jber: ['J', 'B', 'amc-overseas', 'amc-conus'], travis: ['J', '5', 'B', 'amc-overseas'] };

// TCNs. A 1348-1A is MILSTRIP: the 14-character document number, then XXX. A DD 1149 is not, so
// the TMO builds it: its DoDAAC, the Julian date, X in position 11, then 00# or a 500-series
// number, then XXX (e.g. FA50306285X501XXX).
export const TCN_SERIALS = ['001', '002', '003', '004', '005', '500', '501', '502', '503', '504'];
export const tcn1149 = (origin, serial) => `${origin.cmosDodaac}${julian(DOCUMENT_DAY)}X${serial}XXX`;

export function createShipment({ random = Math.random, origin = 'jber', target, serial = 1, discrepancy, advance } = {}) {
  const from = ORIGINS[origin];
  const spec = TARGETS[target || pick(random, ORIGIN_TARGETS[origin])];
  const [itemId, low, high] = pick(random, spec.items[origin]);
  const item = ITEMS[itemId];
  const quantity = between(random, low ?? item.quantity[0], high ?? item.quantity[1]);
  // Some stateside shipments go somewhere other than the consignee DoDAAC's address: a commercial
  // vendor with no DoDAAC (DD 1149 only), or a different delivery point on the consignee's base.
  const deliveryCase = !spec.overseas && random() < .35 ? pick(random, ['vendor', 'alternate']) : null;
  const vendor = deliveryCase === 'vendor' ? pick(random, VENDORS) : null;
  const dodaac = vendor ? null : pick(random, spec.overseas ? Object.keys(OVERSEAS) : conusFor(from));
  // Repairables going back to an Air Logistics Complex or a repair vendor are unserviceable (F); everything else ships serviceable (A).
  const condition = !HARDWARE.includes(itemId) && (vendor || /ALC/.test(CONUS[dodaac]?.unit || '')) ? 'F' : 'A';
  const document = vendor ? '1149' : random() < .7 ? '1348-1A' : '1149';
  const point = deliveryCase === 'alternate' ? pick(random, DELIVERY_POINTS) : null;
  const delivery = vendor ? { name: vendor.name, address: vendor.address, address2: '', city: vendor.city, state: vendor.state, zip: vendor.zip, country: 'US', phone: vendor.phone }
    : point ? { name: `${CONUS[dodaac].unit} ${point[0]}`, address: point[1], address2: '', ...splitCity(CONUS[dodaac].city), country: 'US', phone: '' } : null;
  const { pd, rdd } = priorityFor(random, pick(random, spec.tp[origin]), spec.overseas, document);
  // A DD 1149 requisition number is non-MILSTRIP too: X in position 11, then a three-digit serial.
  const number = between(random, 1, 8999) + serial;
  const documentNumber = `${from.dodaac}${julian(DOCUMENT_DAY)}${document === '1149' ? `X${String(number % 1000).padStart(3, '0')}` : String(number).padStart(4, '0')}`;
  const candidates = ['quantity', 'nsn', 'condition', 'funding', 'shipto', ...(document === '1149' ? ['signature'] : [])];
  const flaw = discrepancy !== undefined ? discrepancy : random() < .55 ? pick(random, candidates) : null;
  const size = packedSize(item, quantity);
  return {
    key: `customer-${serial}`, serial, origin, itemId, document, quantity, condition, dodaac, delivery, pd,
    nsn: `${item.fsc}-${niin(random)}`, serialNumber: item.ui === 'EA' && quantity === 1 ? `SN${between(random, 10000, 99999)}` : null,
    documentNumber, tcn: document === '1149' ? tcn1149(from, pick(random, TCN_SERIALS)) : `${documentNumber}XXX`, rdd,
    tac: pick(random, TACS), projectCode: pick(random, ['   ', '3AF', '9GF']), targetMode: spec.mode, discrepancy: flaw,
    // Whether supply already sent CMOS an advance record (status 00) for this TCN. A DD 1149 is
    // generated in a system that feeds CMOS, so it always arrives as one; createQueue picks the one
    // DD 1348-1A the trainee builds from scratch.
    advance: advance ?? true,
    container: correctContainer(item, quantity),
    packed: { length: size.length, width: size.width, height: size.height, weight: Math.round(item.unitWeight * quantity + size.tare) },
  };
}

export function createQueue({ random = Math.random, origin = 'jber' } = {}) {
  const seen=new Set();
  const queue=shuffle(random, ORIGIN_TARGETS[origin]).map((target,index)=>{
    let shipment=createShipment({random,origin,target,serial:index+1});
    if(seen.has(shipment.tcn)){
      if(shipment.document==='1149')shipment={...shipment,tcn:tcn1149(ORIGINS[origin],TCN_SERIALS.find(serial=>!seen.has(tcn1149(ORIGINS[origin],serial))))};
      else {let serial=Number(shipment.documentNumber.slice(-4));let doc;do{serial=(serial+1)%10000;doc=shipment.documentNumber.slice(0,-4)+String(serial).padStart(4,'0');}while(seen.has(doc+'XXX'));shipment={...shipment,documentNumber:doc,tcn:doc+'XXX'};}
    }
    seen.add(shipment.tcn);return shipment;
  });
  // One DD 1348-1A per session has no advance record, so the trainee builds it in CMOS from scratch.
  const milstrip=queue.filter(shipment=>shipment.document==='1348-1A');
  const scratch=milstrip.length?milstrip[Math.floor(random()*milstrip.length)].key:null;
  return queue.map(shipment=>shipment.document==='1348-1A'?{...shipment,advance:shipment.key!==scratch}:shipment);
}

// The shipping document as the customer presents it. Until the trainee returns it for correction,
// it carries the shipment's discrepancy.
export function presentedDocument(shipment, corrected = false) {
  const flaw = corrected ? null : shipment.discrepancy;
  const item = ITEMS[shipment.itemId];
  return {
    type: shipment.document,
    documentNumber: shipment.documentNumber,
    // A DD 1149 is identified by its TCN: block 6 carries the TCN, not a MILSTRIP document number.
    tcn: shipment.tcn,
    nsn: flaw === 'nsn' ? `${shipment.nsn.slice(0, -4)}${String((Number(shipment.nsn.slice(-4)) + 731) % 10000).padStart(4, '0')}` : shipment.nsn,
    nomenclature: item.nomenclature, partNumber: item.partNumber, ui: item.ui, unitPrice: item.unitPrice, unitWeight: item.unitWeight,
    quantity: flaw === 'quantity' ? shipment.quantity + (shipment.quantity > 3 ? -2 : 1) : shipment.quantity,
    condition: flaw === 'condition' ? (shipment.condition === 'A' ? 'F' : 'A') : shipment.condition,
    tac: flaw === 'funding' ? '' : shipment.tac,
    shipTo: flaw === 'shipto' ? '' : shipment.dodaac || '',
    // Deliver-to address in the clear (vendor, or a delivery point different from the DoDAAC's address).
    delivery: flaw === 'shipto' ? null : shipment.delivery || null,
    signed: flaw !== 'signature',
    pd: shipment.pd, rdd: shipment.rdd, projectCode: shipment.projectCode,
  };
}
