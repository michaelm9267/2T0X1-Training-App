import { render, screen, within } from '@testing-library/react';
import ConditionTagForm, { tagFor } from './ConditionTagForm';

const values = { description: '5998-01-234-5678 P/N 7024311-04 CIRCUIT CARD ASSEMBLY', serial: 'SN12345', ui: 'EA', qty: '2', activity: 'FB5000 SUPPLY QA', inspector: 'J. ALVAREZ 12 OCT 2026', reason: 'FAILED OPERATIONAL CHECK', removedFrom: 'END ITEM SN TRN-0001' };

test.each([
  ['A', 'DD FORM 1574', 'SERVICEABLE TAG-MATERIAL', ['NEXT INSPECTION DUE/ OVERAGE DATE', 'CONDITION CODE', 'INSPECTION ACTIVITY', 'UNIT OF ISSUE', 'CONTRACT/PO NO.', 'QTY']],
  ['D', 'DD FORM 1575', 'SUSPENDED TAG - MATERIAL', ['INSPECTION ACTIVITY', 'CONDITION CODE', 'REASON OR AUTHORITY', 'UNIT OF ISSUE', 'CONTRACT / P.O. NO.']],
  ['H', 'DD FORM 1577', '(UNSERVICEABLE CONDEMNED) TAG-MATERIAL', ['REASON OR AUTHORITY', 'UNIT OF ISSUE', 'QTY']],
  ['F', 'DD FORM 1577-2', '(UNSERVICEABLE (REPARABLE) TAG-MATERIAL', ['REASON FOR REPARABLE CONDITION', 'REMOVED FROM', 'CONTRACT / P.O. NO.']],
])('condition %s uses %s laid out like the printed tag', (condition, form, title, blocks) => {
  render(<ConditionTagForm condition={condition} values={values} />);
  const tag = within(screen.getByRole('figure', { name: `${form} ${title}` }));
  expect(tag.getByText(title)).toBeInTheDocument();
  expect(tag.getByText(form)).toBeInTheDocument();
  expect(tag.getByText(/WARNING: Unauthorized persons removing, defacing, or destroying this tag/)).toBeInTheDocument();
  for (const label of ['FSN, PART NO. AND ITEM DESCRIPTION', 'SERIAL NUMBER/LOT NO.', "INSPECTOR'S NAME OR STAMP AND DATE", 'REMARKS', ...blocks]) expect(tag.getByText(label)).toBeInTheDocument();
  expect(tag.getByText(condition)).toBeInTheDocument();
  expect(tag.getByText('J. ALVAREZ 12 OCT 2026')).toBeInTheDocument();
});

test('condition codes map to their DD Form tag', () => {
  expect(['A', 'B', 'C'].map(tagFor)).toEqual(['1574', '1574', '1574']);
  expect(['D', 'J', 'K', 'L', 'M', 'R'].map(tagFor)).toEqual(Array(6).fill('1575'));
  expect(['H', 'S'].map(tagFor)).toEqual(['1577', '1577']);
  expect(['E', 'F', 'G'].map(tagFor)).toEqual(['1577-2', '1577-2', '1577-2']);
});
