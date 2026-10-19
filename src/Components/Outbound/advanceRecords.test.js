import { render, screen } from '@testing-library/react';
import { DocumentBody } from './ShippingDocument';
import { presentedDocument } from './outboundShipments';
import { newOutboundSession, normalizeOutboundSession } from './OutboundTrainer';
import { newPractice } from './outboundPractice';
import { migrateOutboundCmos, resetOutboundShipment } from '../Cmos/courseAdapters';
import { planningStatus } from '../Cmos/planningStatuses';
import { customerRow } from './cmosLogic';
import { createOutboundExercise } from './outboundLogic';

const records = session => Object.values(migrateOutboundCmos(session).shipments);

test('every DD 1149 and all but one DD 1348-1A arrive as advance records; the other is built from scratch', () => {
  for (const seed of [.1, .2, .3, .4, .5, .6, .7, .8, .9]) {
    const session = newOutboundSession({ random: () => seed });
    const milstrip = session.shipments.filter(s => s.document === '1348-1A');
    expect(session.shipments.filter(s => s.document === '1149').every(s => s.advance)).toBe(true);
    expect(milstrip.filter(s => !s.advance)).toHaveLength(milstrip.length ? 1 : 0);
    const keys = records(session).map(r => r.draft.assetKey);
    expect(session.shipments.filter(s => !keys.includes(s.key)).map(s => s.key)).toEqual(session.shipments.filter(s => !s.advance).map(s => s.key));
    const scratch = session.shipments.find(s => !s.advance);
    const store = migrateOutboundCmos(session);
    const reset = scratch ? resetOutboundShipment(store, scratch.key, scratch, session.exercises[scratch.key]) : store;
    expect(Object.values(reset.shipments).some(r => r.draft.assetKey === scratch?.key)).toBe(false);
  }
});

test('advance records wait in 00 status; only DD 1348-1A records carry a Document Number', () => {
  for (const seed of [.1, .3, .5, .7, .9]) {
    const session = newOutboundSession({ random: () => seed });
    for (const r of records(session)) {
      const shipment = session.shipments.find(s => s.key === r.draft.assetKey);
      expect(planningStatus(r)).toBe('00');
      expect(r.draft.tcn).toBe(shipment.tcn);
      expect(r.draft.docNbr || '').toBe(shipment.document === '1149' ? '' : shipment.documentNumber);
    }
    // The Shipment Planning list row for a customer whose supply activity sent an advance record.
    for (const shipment of session.shipments.filter(item => item.advance)) expect(customerRow(shipment, createOutboundExercise()).docNbr).toBe(shipment.document === '1149' ? '' : shipment.documentNumber);
  }
  for (const stepId of ['receive', 'pack', 'planning']) for (const seed of [.2, .6]) {
    const p = newPractice({ stepId, random: () => seed });
    const [r] = records({ shipments: [p.shipment], exercises: { [p.shipment.key]: p.exercise }, selected: p.shipment.key });
    expect(planningStatus(r)).toBe('00');
    expect(r.draft.docNbr || '').toBe(p.shipment.document === '1149' ? '' : p.shipment.documentNumber);
  }
});

test('saved sessions drop the Document Number from unsaved DD 1149 advance records', () => {
  const session = newOutboundSession({ random: () => .3 });
  const store = migrateOutboundCmos(session);
  const tampered = { ...store, shipments: Object.fromEntries(Object.entries(store.shipments).map(([id, r]) => [id, { ...r, draft: { ...r.draft, docNbr: session.shipments.find(s => s.key === r.draft.assetKey).documentNumber } }])) };
  const loaded = normalizeOutboundSession({ ...session, sharedCmos: tampered });
  for (const r of Object.values(loaded.sharedCmos.shipments)) {
    const shipment = session.shipments.find(s => s.key === r.draft.assetKey);
    expect(r.draft.docNbr).toBe(shipment.document === '1149' ? '' : shipment.documentNumber);
  }
});

test('a DD 1149 shows its TCN in block 6, never a requisition document number', () => {
  const session = newOutboundSession({ random: () => .3 });
  for (const shipment of session.shipments.filter(s => s.document === '1149')) {
    const { unmount } = render(<DocumentBody doc={presentedDocument(shipment)} shipment={shipment} received={false} packing={null} />);
    expect(screen.getByText(shipment.tcn)).toBeInTheDocument();
    expect(screen.queryByText(shipment.documentNumber)).not.toBeInTheDocument();
    unmount();
  }
});
