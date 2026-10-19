// Dollar amounts as CMOS shows them: $1,234.56 (an empty amount shows as $.00 where CMOS does).
export const money = (value, empty = '') => {
  const text = String(value ?? '').trim();
  if (text.startsWith('$')) return text;
  if (text === '' || !Number.isFinite(Number(text.replace(/,/g, '')))) return text === '' ? empty : text;
  const amount = Number(text.replace(/,/g, ''));
  return amount === 0 && empty ? empty : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
// Fields that hold a dollar amount: charges, costs, prices and declared/insured values.
export const isMoneyField = id => /(charges|cost|price|insuredValue|shipmentValue|releaseValue)$/i.test(String(id || '')) || id === 'upc';
