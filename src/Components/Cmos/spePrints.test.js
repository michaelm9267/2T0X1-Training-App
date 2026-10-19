import { render, screen } from '@testing-library/react';
import { CarrierLabel } from './SpePrints';

const doc = (scac, service, tracking) => ({ snapshot: { scac, service, shipDate: '19OCT2026' }, result: { tracking, ratedWeight: '8.00' },
  shipmentSnapshots: [{ tcn: 'FA50306285X001XXX', origin: 'FA5030', destination: 'FB6043', totals: { pieces: 1, weight: 8 } }], pieceSnapshots: [{ length: 16, width: 12, height: 8 }] });

test('UPS prints its own label: ship to, routing code, service with its level number, and the 1Z tracking number', () => {
  render(<CarrierLabel d={doc('UPSN', 'DO', '1ZT8A4W20190647079')} />);
  const label = screen.getByRole('article', { name: 'Carrier label 1ZT8A4W20190647079' });
  expect(label).toHaveTextContent('SHIPTO:');
  expect(label).toHaveTextContent('8 LBS');
  expect(label).toHaveTextContent('1 OF 1');
  expect(label).toHaveTextContent('PORT HUENEME, CA 93041');
  expect(screen.getByText('UPS NEXT DAY AIR')).toBeInTheDocument();
  expect(screen.getByText('1', { selector: 'b' })).toBeInTheDocument();
  expect(label).toHaveTextContent('1Z T8A 4W2 01 9064 7079');
  expect(screen.getByText('CA 930 6-18')).toBeInTheDocument();
});

test('FedEx keeps the FedEx label layout', () => {
  render(<CarrierLabel d={doc('FDE', 'DO', '878837661728')} />);
  expect(screen.getByRole('article', { name: 'Carrier label 878837661728' })).toHaveTextContent('8788 3766 1728');
  expect(screen.queryByText('UPS NEXT DAY AIR')).not.toBeInTheDocument();
});

test('DHL Express (PAZC) prints the DHL label: product, routing, weight, piece, and the waybill barcodes', () => {
  const d = doc('PAZC', 'IP', '3557385930');
  d.shipmentSnapshots[0].destination = 'FB5284';
  render(<CarrierLabel d={d} />);
  const label = screen.getByRole('article', { name: 'Carrier label 3557385930' });
  expect(screen.getByText('EXPRESS WORLDWIDE')).toBeInTheDocument();
  expect(screen.getByText('WPX')).toBeInTheDocument();
  expect(screen.getByText('KR-KUZ-KUZ')).toBeInTheDocument();
  expect(label).toHaveTextContent('8.0 lb');
  expect(label).toHaveTextContent('1/1');
  expect(label).toHaveTextContent('WAYBILL 35 5738 5930');
  expect(label).toHaveTextContent('(2L)KR54164+48000001');
  expect(label).toHaveTextContent('EEI: NOEEI Sec 30.37(a)');
});

test('the Truck Manifest printout carries the header blocks, a TXA and TXF line per TCN, and the signature blocks', () => {
  const TruckManifestDocument = require('./TruckManifestDocument').default;
  const d = { snapshot: { manifestNumber: 'EDF6T60275', equipmentOwner: 'G', conveyanceMode: '9', pickUpDate: '19MAY2026', truckSerialBumperNumber: 'TMO', destinationDODAAC: 'FB6520', destinationName: 'FB6520  176 LRS LGRDD' },
    shipmentSnapshots: [{ id: 's1', tcn: 'TRN0000000001XXX', origin: 'FA5030', destination: 'FB6520', pod: 'SUU', milMode: '9', tp: '2', rdd: '149', tac: 'A12A', description: 'Transfer', totals: { pieces: 1, weight: 176, cube: 28 } }],
    pieceSnapshots: [{ shipmentId: 's1', typePack: 'PT' }] };
  render(<TruckManifestDocument d={d} />);
  const doc = screen.getByRole('article', { name: 'Truck Manifest EDF6T60275' });
  for (const text of ['Preparer/DODAAC', 'Truck Prime Mover', 'Clear Text Dest', 'GOVT', '19-MAY-26', 'TRUCK LOADED BY:', 'RECEIVED BY DRIVER:', 'CARGO RECEIVED DEST:', 'Page 1 of 1']) expect(doc).toHaveTextContent(text);
  expect(screen.getAllByText('TRN0000000001XXX')).toHaveLength(2);
  expect(screen.getByText('TXA')).toBeInTheDocument();
  expect(screen.getByText('TXF')).toBeInTheDocument();
  expect(screen.getByText('TRANSFER')).toBeInTheDocument();
});
