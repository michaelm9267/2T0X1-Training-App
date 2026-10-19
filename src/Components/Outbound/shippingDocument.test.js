import { render, screen, within } from '@testing-library/react';
import { DocumentBody } from './ShippingDocument';
import { createShipment, presentedDocument } from './outboundShipments';

const shipment = () => {
  for (let serial = 1; serial < 50; serial++) {
    const s = createShipment({ serial, random: () => (serial * 0.137) % 1 });
    if (s.document !== '1149') return s;
  }
  throw new Error('no 1348-1A shipment');
};

test('DD 1348-1A blocks 22 and 23 carry the packer signature and pack date once custody is accepted', () => {
  const s = shipment();
  const { rerender } = render(<DocumentBody doc={presentedDocument(s, true)} shipment={s} received={false} />);
  const block = n => screen.getByText(new RegExp(`^${n}\\. `)).parentElement;
  expect(block(22)).toHaveTextContent(/^22\. RECEIVED BY$/);
  rerender(<DocumentBody doc={presentedDocument(s, true)} shipment={s} received />);
  expect(within(block(22)).getByText('Trainee')).toHaveClass('doc-signature');
  expect(block(23)).toHaveTextContent('26285');
});
