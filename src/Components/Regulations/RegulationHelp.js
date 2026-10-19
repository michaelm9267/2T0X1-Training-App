import RegulationLink from './RegulationLink';
import { citationsForClaim, resolveReference, getCitation, citationForHazard } from './catalog';
import { CLAIM_LABELS } from './claims';
import { useRegulationAids } from './RegulationScope';

// compact: only the main citation (for field labels, where extra sections would crowd the entry
// box); the page's "Why? Governing sources" panel lists every citation of the claim.
export function ClaimLink({ claimId, children, compact = false }) {
  const citations = citationsForClaim(claimId);
  if (!citations.length) return <>{children}</>;
  return <><RegulationLink citationId={citations[0].id}>{children || CLAIM_LABELS[claimId]}</RegulationLink>
    {!compact && citations.slice(1).map(citation => <span key={citation.id}> · <RegulationLink citationId={citation.id}>{citation.section}</RegulationLink></span>)}</>;
}
export function RegulationReference({ reference, children, className = '' }) {
  const citations = resolveReference(reference);
  if (!citations.length) return <>{children ?? reference}</>;
  return <span className={className}><RegulationLink citationId={citations[0].id}>{children ?? reference}</RegulationLink>
    {citations.slice(1).map(citation => <span key={citation.id}> · <RegulationLink citationId={citation.id}>{citation.section}</RegulationLink></span>)}</span>;
}
export default function RegulationHelp({ claims = [], assumptions = [], title = 'Why? Governing sources' }) {
  const allowed = useRegulationAids();
  if (!allowed) return null;
  return <details className="regulation-help"><summary>{title}</summary>
    <p>Open a source in a new tab, or rest on its link for 3 seconds to read the quoted section. Use ⓘ to show it immediately.</p>
    {claims.length > 0 && <ul>{claims.map(claim => <li key={claim}><ClaimLink claimId={claim} /></li>)}</ul>}
    {assumptions.map(text => <p className="regulation-assumption" key={text}><strong>Training context:</strong> {text}</p>)}
  </details>;
}
export const CODE_TABLES = {
  rin: 'routeInstructionNotes', equipType: 'equipmentTypes', equipmentType: 'equipmentTypes',
  svcCode: 'ladingBillSpecialServices', uom: 'measureUnits', volumeUom: 'measureUnits', gbloc: 'gblocs',
  refId: 'airManifestReferences', svcAgencyCode: 'routeOrderServices', typePack: 'typePacks',
  reason: 'lowCostNotUsedReasons', serviceAgency: 'freightServiceAgencies', serviceCode: 'serviceCodes',
  palletType: 'palletModuleTypes', configCode: 'palletConfigurations',
};
export function CodeReference({ fieldId, code, children, table }) {
  const key = table || CODE_TABLES[fieldId] || (/equipType|equipment/i.test(fieldId || '') ? 'equipmentTypes' : /typePack/i.test(fieldId || '') ? 'typePacks' : null);
  const citation = key && getCitation(`dteb.${key}.${code}`);
  return citation ? <RegulationLink citation={citation} details={false}>{children || citation.section}</RegulationLink> : <>{children}</>;
}
export const FIELD_CLAIMS = {
  // CMOS field labels. Weight and dimension labels carry no citation: the joint inspection
  // paragraphs (DTR Part III App O) govern inspecting the cargo, not entering CMOS data.
  tcn: 'outbound.tcn',
  consignee: 'outbound.consignee', destination: 'outbound.consignee', tac: 'outbound.funding', transportationPriority: 'outbound.priority', tp: 'outbound.priority',
  hazardClass: 'hazmat.classification', division: 'hazmat.classification',
};

export function FieldReference({ fieldId, value, children }) {
  const claim = FIELD_CLAIMS[fieldId];
  return claim ? <ClaimLink claimId={claim} compact>{children}</ClaimLink> : <CodeReference fieldId={fieldId} code={value}>{children}</CodeReference>;
}

export function HazardReference({ un, name, children }) {
  const citation = citationForHazard(un, name);
  return citation ? <RegulationLink citation={citation} details={false}>{children}</RegulationLink> : <>{children}</>;
}
