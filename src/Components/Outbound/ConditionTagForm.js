// DD Form supply condition tags, laid out like the printed tags: a colored border, a white body
// with the 18 USC 1361 warning down the left edge, the tag title, and the numbered blocks. The
// inspector fills in the blocks (shown handwritten).
//   DD 1574   yellow  Serviceable Tag-Material              condition codes A, B, C
//   DD 1575   brown   Suspended Tag-Material                condition codes D, J, K, L, M, R
//   DD 1577   red     Unserviceable (Condemned) Tag-Material condition codes H, S
//   DD 1577-2 green   Unserviceable (Reparable) Tag-Material condition codes E, F, G
export const CONDITION_TAGS = {
  1574: { form: 'DD FORM 1574', title: 'SERVICEABLE TAG-MATERIAL', border: '#f2c81f', codes: ['A', 'B', 'C'] },
  1575: { form: 'DD FORM 1575', title: 'SUSPENDED TAG - MATERIAL', border: '#7a5418', codes: ['D', 'J', 'K', 'L', 'M', 'R'] },
  1577: { form: 'DD FORM 1577', title: '(UNSERVICEABLE CONDEMNED) TAG-MATERIAL', border: '#d92a1c', codes: ['H', 'S'] },
  '1577-2': { form: 'DD FORM 1577-2', title: '(UNSERVICEABLE (REPARABLE) TAG-MATERIAL', border: '#2f9a3c', codes: ['E', 'F', 'G'] },
};
export const tagFor = condition => Object.entries(CONDITION_TAGS).find(([, tag]) => tag.codes.includes(condition))?.[0] || '1574';
const WARNING = 'WARNING: Unauthorized persons removing, defacing, or destroying this tag may be subject to a fine of not more than $1,000 or imprisonment for not more than one year or both. (18 USC 1361)';

const Ink = ({ children }) => children ? <span className="tag-ink">{children}</span> : null;
const Block = ({ label, children, className = '' }) => <div className={`tag-block ${className}`}><small>{label}</small><Ink>{children}</Ink></div>;

// The right-hand blocks under the title differ by form.
function RightBlocks({ form, v }) {
  if (form === '1574') return <>
    <div className="tag-row"><Block label="NEXT INSPECTION DUE/ OVERAGE DATE">{v.nextInspection}</Block><Block label="CONDITION CODE" className="tag-code">{v.condition}</Block></div>
    <Block label="INSPECTION ACTIVITY">{v.activity}</Block>
    <Block label="INSPECTOR'S NAME OR STAMP AND DATE" className="tag-grow">{v.inspector}</Block>
  </>;
  return <>
    <div className="tag-row"><Block label="INSPECTION ACTIVITY">{v.activity}</Block><Block label="CONDITION CODE" className="tag-code">{v.condition}</Block></div>
    <Block label={form === '1577-2' ? 'REASON FOR REPARABLE CONDITION' : 'REASON OR AUTHORITY'}>{v.reason}</Block>
    {form === '1577-2' && <Block label="REMOVED FROM">{v.removedFrom}</Block>}
    <Block label="INSPECTOR'S NAME OR STAMP AND DATE" className="tag-grow">{v.inspector}</Block>
  </>;
}

// The left-hand blocks under the item description differ by form too.
function LeftBlocks({ form, v }) {
  if (form === '1577') return <>
    <Block label="SERIAL NUMBER/LOT NO.">{v.serial}</Block>
    <div className="tag-row"><Block label="UNIT OF ISSUE">{v.ui}</Block><Block label="QTY">{v.qty}</Block></div>
  </>;
  return <>
    <div className="tag-row"><Block label="SERIAL NUMBER/LOT NO.">{v.serial}</Block>{form !== '1577-2' && <Block label="UNIT OF ISSUE" className="tag-narrow">{v.ui}</Block>}</div>
    <div className="tag-row"><Block label={form === '1574' ? 'CONTRACT/PO NO.' : 'CONTRACT / P.O. NO.'}>{v.contract}</Block><Block label="QTY" className="tag-narrow">{v.qty}</Block></div>
  </>;
}

export default function ConditionTagForm({ condition, values }) {
  const form = tagFor(condition);
  const tag = CONDITION_TAGS[form];
  const v = { condition, ...values };
  return <figure className="condition-tag-form" style={{ '--tag-border': tag.border }} aria-label={`${tag.form} ${tag.title}`}>
    <div className="tag-body">
      <p className="tag-warning">{WARNING}</p>
      <div className="tag-grid">
        <div className="tag-left">
          <Block label="FSN, PART NO. AND ITEM DESCRIPTION" className="tag-description">{v.description}</Block>
          <LeftBlocks form={form} v={v} />
        </div>
        <div className="tag-right">
          <div className="tag-title">{tag.title}</div>
          <RightBlocks form={form} v={v} />
        </div>
        <Block label="REMARKS" className="tag-remarks">{v.remarks}</Block>
      </div>
      <p className="tag-form-id">{tag.form}</p>
    </div>
  </figure>;
}
