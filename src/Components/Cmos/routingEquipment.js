import { totals } from './model';
import { addressPatch } from './cblLogic';
import { ediForMilMode } from './modeReference';

// Route order equipment: assigned TCNs ride in equipment groups (01 unless changed). Each group
// gets its own B/L, mode, unload stops and load plan line. What the trainee edits is kept on the
// route order (equipGroups, stops); everything else is worked out from the assigned TCNs.

const pad = (n, size) => String(n).padStart(size, '0');
export const groupOf = (draft, shipmentId) => (draft.tcnGroups || {})[shipmentId] || '01';

// B/L: the route order's GBLOC + "7" + its Shipment ID serial (last 4 digits) as 5 digits,
// stepped by equipment group (e.g. MKFZ162880041, group 01 → MKFZ700041).
export function billOfLading(draft, group) {
  const id = String(draft.shipmentId || '');
  const gbloc = id.slice(0, 4) || 'MKFZ';
  const serial = Number(id.slice(-4)) || 0;
  return `${gbloc}7${pad(serial + Number(group) - 1, 5)}`;
}

export function equipmentGroups(store, draft) {
  const ids = (draft.shipmentIds || []).filter((id) => store.shipments?.[id]);
  const groups = [...new Set(ids.map((id) => groupOf(draft, id)))].sort();
  return groups.map((group) => {
    const members = ids.filter((id) => groupOf(draft, id) === group);
    const first = store.shipments[members[0]].draft;
    const saved = (draft.equipGroups || {})[group] || {};
    const t = totals(store, members);
    const milMode = saved.milMode || first.milMode || '';
    const [nmfc, nmfcSub] = String(first.nmfc || '').split('-');
    return {
      group, members, milMode,
      ediMode: saved.ediMode || first.ediMode || ediForMilMode(milMode),
      bl: saved.bl || billOfLading(draft, group),
      fullyLoaded: Boolean(saved.fullyLoaded),
      equipment: saved.equipment || [],
      serviceCodes: saved.serviceCodes || [],
      carriers: saved.carriers || [], assignedScac: saved.assignedScac || '', reasons: saved.reasons || {},
      awardStatus: saved.awardStatus || '', releaseDate: saved.releaseDate || '',
      cblId: saved.cblId || '', cblNumber: saved.cblNumber || '',
      dsoeId: first.dsoeId || '', chalk: first.chalk || '',
      nmfc: saved.nmfc ?? (nmfc || ''),
      nmfcSub: saved.nmfcSub ?? (first.ufc || nmfcSub || '0'),
      pieces: t.pieces, weight: t.weight, cube: Math.round(t.cube),
    };
  });
}

// Unload stops: one per consignee in the group, numbered down from 99 (the final stop).
export function stopOffs(store, draft) {
  return equipmentGroups(store, draft).flatMap(({ group, members }) => {
    const consignees = [...new Set(members.map((id) => store.shipments[id].draft.destination).filter(Boolean))];
    return consignees.map((dodaac, i) => {
      const stop = pad(99 - (consignees.length - 1 - i), 2);
      const key = `${group}-${stop}`;
      const address = addressPatch('stop', dodaac);
      const shipment = members.map((id) => store.shipments[id].draft).find((s) => s.destination === dodaac) || {};
      return {
        key, group, stop, dodaac, splc: shipment.destSplc || '', rsn: 'UL', stopType: '', dateTime: '', poc: '',
        address1: address.stopAddress1 || '', address2: address.stopAddress2 || '', city: address.stopCity || '',
        country: address.stopCountry || '', state: address.stopState || '', zip: address.stopZip || '', phone: address.stopPhoneNumber || '',
        intl: Boolean(address.stopCountry && address.stopCountry !== 'US'),
        ...((draft.stops || {})[key] || {}),
      };
    });
  });
}

// Stop Ld / Stop UL for a TCN on the TCNs tab.
export function tcnStops(store, draft, shipmentId) {
  const stop = stopOffs(store, draft).find((s) => s.group === groupOf(draft, shipmentId) && s.dodaac === store.shipments[shipmentId]?.draft.destination);
  return { stopLd: '00', stopUl: stop?.stop || '99' };
}
