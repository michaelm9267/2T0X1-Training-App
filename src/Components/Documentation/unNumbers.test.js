import { fieldsForUnNumber } from './unNumbers';

// AFMAN Table A4.1, printed page 123: no packing group assigned.
test.each(['UN2794', 'UN2800'])('%s does not autofill a packing group of III', un => {
  expect(fieldsForUnNumber(un)).toMatchObject({ dg2Division: '8', dg2PackingGroup: 'N/A' });
});
