import RegulationLink from '../Regulations/RegulationLink';
import { ATTLA_LETTERS, ATTLA_OFFICE } from './attlaLetters';

// Renders an ATTLA Internal Air Transport Certification letter in the layout of the original.
// "**Label:** text" at the start of a paragraph is set in bold, as in the letters.
function Rich({ text }) {
  const match = text.match(/^\*\*(.+?)\*\*(.*)$/s);
  return match ? <><strong>{match[1]}</strong>{match[2]}</> : text;
}

function Block({ block }) {
  const [kind, a, b, depth = 0] = block;
  if (kind === 'h') return <h6 className="attla-heading">{a}</h6>;
  if (kind === 'p') return <p><Rich text={a} /></p>;
  if (kind === 'note') return <p><strong>NOTE:</strong> {a}</p>;
  if (kind === 'caution') return <p><strong>CAUTION:</strong> {a}</p>;
  if (kind === 'fig') return <p className="attla-figure">[{a} — image not reproduced]</p>;
  if (kind === 'li') return <p className="attla-item" style={{ paddingLeft: `${1.5 + depth * 1.5}em` }}><span className="attla-marker">{a}</span>{b}</p>;
  if (kind === 'table') return <div className="paper-table attla-table">
    <table>
      <caption>{a.caption}</caption>
      {a.head && <thead><tr>{a.head.map((cell, i) => <th key={i}>{cell}</th>)}</tr></thead>}
      <tbody>{a.rows.map((row, r) => <tr key={r}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody>
    </table>
    {a.notes && <div className="attla-notes">{a.notes.map(note => <p key={note}>{note}</p>)}</div>}
  </div>;
  return null;
}

export default function AttlaCertification({ doc }) {
  const letter = ATTLA_LETTERS[doc];
  const fileNumber = letter.fields.find(([label]) => label === 'File Number')[1];
  return <div className="attla-letter">
    <p className="attla-file"><span>File Number {fileNumber}</span><span className="no-print"> · <RegulationLink citationId={`attla.${doc}.weights`}>Issued letter · weight conditions</RegulationLink>{doc === 'fmtv' && <> · <RegulationLink citationId="attla.fmtv.table2">Table 2 · model ratings</RegulationLink></>}{doc === 'isu' && <RegulationLink citationId="attla.isu.conditions">Issued letter · conditions</RegulationLink>}</span></p>
    <header className="attla-masthead">
      <span className="attla-seal" aria-hidden="true">DEPARTMENT OF THE AIR FORCE</span>
      <div><strong>Internal Air Transport Certification</strong>{ATTLA_OFFICE.map(line => <span key={line}>{line}</span>)}</div>
      <span className="attla-seal" aria-hidden="true">ATTLA</span>
    </header>
    <p><strong>Date:</strong> {letter.date}</p>
    {letter.fields.map(([label, value]) => <p key={label} className="attla-field"><strong>{label}:</strong> {value}</p>)}
    {letter.blocks.map((block, i) => <Block key={i} block={block} />)}
    <div className="attla-signatures">
      {[['Reviewed by', letter.reviewedBy], ['Approved by', letter.approvedBy]].map(([role, lines]) => <div key={role}>
        <span className="attla-signed">Digitally signed</span>
        <p><strong>{role}:</strong> {lines[0]}</p>
        {lines.slice(1).map(line => <p key={line} className="attla-sig-line">{line}</p>)}
      </div>)}
    </div>
  </div>;
}
