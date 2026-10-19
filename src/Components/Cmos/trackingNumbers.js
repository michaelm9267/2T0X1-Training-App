// Tracking numbers in each carrier's format, with the carrier's check digit, made from the TCN (or
// record id) so a shipment keeps the same number. Training values only; no carrier is contacted.
//   FedEx Express (FDE): 12 digits, mod 11 check digit (weights 1, 3, 7 from the right).
//   FedEx Ground (FDEG): 15 digits, mod 10 check digit (weights 3, 1 from the right).
//   UPS (UPSN): 1Z + 6-character shipper number + 2-digit service code + 7-digit package number +
//     check digit (18 characters).
//   UPS Freight (UPSQ): 9-digit PRO number, mod 7 check digit.
//   DHL Express (PAZC): 10-digit waybill, check digit = first 9 digits mod 7.
const seed = text => {
  let hash = 2166136261;
  return Array.from({ length: 24 }, (_, i) => {
    for (const ch of `${text}:${i}`) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
    return hash % 10;
  }).join('');
};
const mod10 = body => {
  const sum = [...body].reverse().reduce((total, d, i) => total + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
};
const fedexExpress = body => {
  const sum = [...body].reverse().reduce((total, d, i) => total + Number(d) * [1, 3, 7][i % 3], 0);
  return String((sum % 11) % 10);
};
// UPS: letters count as (code - 63) mod 10; odd positions once, even positions twice.
const upsCheck = body => {
  const sum = [...body].reduce((total, ch, i) => {
    const value = /\d/.test(ch) ? Number(ch) : (ch.charCodeAt(0) - 63) % 10;
    return total + value * (i % 2 === 1 ? 2 : 1);
  }, 0);
  return String((10 - (sum % 10)) % 10);
};
// Service codes and names as the CMOS SPE Service list shows them for each SCAC, with the transit
// days the trainer returns on rating (training estimates). The tracking-number service code is UPS's.
export const SPE_SERVICES = {
  FDE: [['2M', 'S/2Day A.M.', 2], ['AM', 'S/First Overnight', 1], ['D3', 'S/Express Saver', 3], ['DE', 'S/2Day', 2], ['DO', 'S/Priority Overnight', 1], ['DP', 'S/Standard Overnight', 1],
    ['F5', 'S/Express 1st Overnight Freight', 1], ['F6', 'S/Express Freight(F1)', 1], ['F8', 'S/Express Freight(F2)', 2], ['I6', 'S/International Priority Freight', 3],
    ['I8', 'S/International Economy Freight', 5], ['IE', 'S/International Economy', 5], ['IF', 'S/International First', 2], ['IP', 'S/International Priority', 3]],
  FDEG: [['DG', 'S/Domestic Ground Service', 5]],
  PAZC: [['IE', 'S/International Economy', 5], ['IP', 'S/Express Worldwide', 3]],
  UPSN: [['2M', 'S/2nd Day Air A.M.', 2], ['AM', 'S/Next Day Air Early A.M.', 1], ['D3', 'S/3 Day Select', 3], ['DE', 'S/2nd Day Air', 2], ['DG', 'S/Domestic Ground Service', 5],
    ['DO', 'S/Next Day Air', 1], ['DP', 'S/Next Day Air Saver', 1], ['ES', 'S/Express Saver', 3], ['IE', 'S/International Economy', 5], ['IP', 'S/International Priority', 3]],
  UPSQ: [['3N', 'S/3 Day Freight NGS', 3], ['F7', 'S/Next Day Air Freight NGS', 1], ['F8', 'S/2nd Day Air Freight NGS', 2], ['FC', 'S/Air Freight Consolidated', 3]],
};
// Carrier names as the SCAC Lookup and the Carrier Pickup Report show them.
export const CARRIER_NAMES = { FDE: 'Federal Express Corporation', FDEG: 'FedEx Ground Package System', PAZC: 'DHL EXPRESS', UPSN: 'UNITED PARCEL SERVICE', UPSQ: 'UPS AIR FREIGHT' };
export const servicesFor = scac => SPE_SERVICES[String(scac || '').trim().toUpperCase()] || [];
export const transitDays = (scac, service) => String(servicesFor(scac).find(([code]) => code === service)?.[2] || '');
// UPS's own service codes, as they appear in a 1Z tracking number.
const UPS_SERVICE = { '2M': '59', AM: '14', D3: '12', DE: '02', DG: '03', DO: '01', DP: '13', ES: '65', IE: '08', IP: '66', 'NEXT DAY AIR': '01', '2DAY': '02', GROUND: '03' };
// The installation's carrier accounts (fictional training values in each carrier's format, as CMOS
// shows them): one 9-digit FedEx account for Express and Ground, a 6-character UPS shipper number,
// 9-digit DHL Express (PAZC) and UPSQ accounts, and 8 digits for the training motor carrier.
export const CARRIER_ACCOUNTS = { FDE: '487215036', FDEG: '487215036', UPSN: 'T8A4W2', UPSQ: '561938204', PAZC: '853172064', TRNC: '30071245' };
export const carrierAccount = scac => CARRIER_ACCOUNTS[String(scac || '').trim().toUpperCase()] || '';
const UPS_SHIPPER = CARRIER_ACCOUNTS.UPSN;

export function trackingNumber(scac, key, service = '') {
  const code = String(scac || '').trim().toUpperCase();
  const digits = seed(String(key || ''));
  if (code === 'UPSN' || code === 'UPS') {
    const body = `${UPS_SHIPPER}${UPS_SERVICE[String(service).trim().toUpperCase()] || '03'}${digits.slice(0, 7)}`;
    return `1Z${body}${upsCheck(body)}`;
  }
  if (code === 'UPSQ') { const body = digits.slice(0, 8); return `${body}${Number(body) % 7}`; }
  if (code === 'PAZC') { const body = digits.slice(0, 9).replace(/^0/, '4'); return `${body}${Number(body) % 7}`; }
  if (code === 'FDEG') { const body = `${digits.slice(0, 14)}`.replace(/^0/, '9'); return `${body}${mod10(body)}`; }
  const body = digits.slice(0, 11).replace(/^0/, '7');
  return `${body}${fedexExpress(body)}`;
}
export const gfmId = key => `1${seed(`gfm:${key}`).slice(0, 7)}`;
export const validTracking = { mod10, fedexExpress, upsCheck };
