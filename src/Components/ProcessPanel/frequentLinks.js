// Frequently used regulations and sites for Cargo Deployment Function work. DTR links come from
// the USTRANSCOM DTR index; some .mil and .gov sites need a CAC or a government network.
const DTR = 'https://www.business.ustranscom.mil/dtr';

// DTR groups run in part order; within a part, chapters come first in number order, then
// appendices in letter order.
export const FREQUENT_LINKS = [
  { group: 'DTR — general', links: [
    ['DTR home (all parts)', `${DTR}/`],
    ['DTR acronyms and abbreviations', `${DTR}/dtr_acronyms_abbreviations.pdf`],
    ['DTR definitions', `${DTR}/dtr_definitions.pdf`],
    ['DTR references', `${DTR}/dtr_references.pdf`],
    ['DTR recent changes', `${DTR}/crindex.cfm`],
  ] },
  { group: 'DTR Part II — Cargo Movement', links: [
    ['DTR Part II (all chapters)', `${DTR}/dtrp2.cfm`],
    ['Chapter 204 — Hazardous Material', `${DTR}/part-ii/dtr_part_ii_204.pdf`],
    ['Chapter 208 — Packaging and Handling', `${DTR}/part-ii/dtr_part_ii_208.pdf`],
    ['Appendix L — Transportation Control Number', `${DTR}/part-ii/dtr_part_ii_app_l.pdf`],
    ['Appendix M — TCMD', `${DTR}/part-ii/dtr_part_ii_app_m.pdf`],
    ['Appendix O — Unit Move', `${DTR}/part-ii/dtr_part_ii_app_o.pdf`],
    ['Appendix P — AMC Channels', `${DTR}/part-ii/dtr_part_ii_app_p.pdf`],
    ['Appendix S — Weapons, Ammunition, and HAZMAT', `${DTR}/part-ii/dtr_part_ii_app_s.pdf`],
    ['Appendix V — Transportation Account Codes', `${DTR}/part-ii/dtr_part_ii_app_v.pdf`],
  ] },
  { group: 'DTR Part III — Mobility', links: [
    ['DTR Part III (all chapters)', `${DTR}/dtrp3.cfm`],
    ['Chapter 302 — Pre-Deployment', `${DTR}/part-iii/dtr_part_iii_302.pdf`],
    ['Chapter 303 — Deployment', `${DTR}/part-iii/dtr_part_iii_303.pdf`],
    ['Appendix J — AA&E and HAZMAT', `${DTR}/part-iii/dtr_part_iii_app_j.pdf`],
    ['Appendix L — A/DACG', `${DTR}/part-iii/dtr_part_iii_app_l.pdf`],
    ['Appendix N — Deploying Unit Activities', `${DTR}/part-iii/dtr_part_iii_app_n.pdf`],
    ['Appendix O — Joint Inspection', `${DTR}/part-iii/dtr_part_iii_app_o.pdf`],
    ['Appendix P — Center of Balance', `${DTR}/part-iii/dtr_part_iii_app_p.pdf`],
    ['Appendix Q — Marshalling Area', `${DTR}/part-iii/dtr_part_iii_app_q.pdf`],
    ['Appendix V — Aircraft Load Plan', `${DTR}/part-iii/dtr_part_iii_app_v.pdf`],
  ] },
  { group: 'Hazardous materials', links: [
    ['AFMAN 24-604 / TM 38-250 — Preparing HAZMAT for Military Air Shipments', 'https://static.e-publishing.af.mil/production/1/af_a4/publication/afman24-604/afman24-604.pdf'],
    ['49 CFR Subchapter C — Hazardous Materials Regulations', 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-C'],
    ['IATA Dangerous Goods Regulations', 'https://www.iata.org/en/publications/dgr/'],
    ['Emergency Response Guidebook (ERG)', 'https://www.phmsa.dot.gov/hazmat/erg/emergency-response-guidebook-erg'],
  ] },
  { group: 'Air Force publications and certification', links: [
    ['ATTLA — Air Transportability Test Loading Activity', 'https://intelshare.intelink.gov/sites/attla/SitePages/Home.aspx'],
    ['DAF e-Publishing (DAFI 24-605V2 and other DAF pubs)', 'https://www.e-publishing.af.mil/Product-Index/'],
    ['ASSIST QuickSearch (MIL-STD-129 marking, MIL specs)', 'https://quicksearch.dla.mil/'],
    ['SDDC Transportation Engineering Agency (TEA)', 'https://www.sddc.army.mil/sites/TEA'],
  ] },
  { group: 'Organizations and data', links: [
    ['USTRANSCOM', 'https://www.ustranscom.mil/'],
    ['Air Mobility Command', 'https://www.amc.af.mil/'],
    ['DoDAAD — DoD Activity Address Directory', 'https://www.dla.mil/Defense-Data-Standards/Standards/DoDAAD/'],
  ] },
];
