// Where the publications the STS and TTGs cite stand today. Checked November 2026 against the
// USTRANSCOM DTR site (read directly) and, for AF and DoD issuances, by web search of e-Publishing,
// the DoD Issuances site, and DLA, because those sites refuse automated downloads. A reference no
// rule matches was not checked.
//
// `url` links the current edition (or the DTR part page) where one was found.
//
// status: 'current' (still in force under this number), 'replaced' (reissued under a new number or
// prefix), 'wrong' (the number printed is not the publication), 'confirm' (signs of a change that
// could not be confirmed).

export const CHECKED = 'November 2026';
export const CHECKED_ON = '2 November 2026';

export const PUBLICATIONS = [
  // Replaced, renumbered, or misprinted
  { pattern: /\bAFI\s?20-110\b/i, status: 'replaced', current: 'DAFMAN 20-110, Nuclear Weapons-Related Materiel (NWRM) Management, 3 October 2024', note: 'Replaced AFI 20-110 (4 June 2018). Paragraph numbers cited from the AFI may have moved.', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/dafman20-110/dafman20-110.pdf' },
  { pattern: /\bAFMAN\s?21-201\b/i, status: 'replaced', current: 'DAFMAN 21-201, Munitions Management, 24 October 2024', note: 'Now a DAFMAN.', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/dafman21-201/dafman21-201.pdf' },
  { pattern: /\b(?:DAF|AF)I\s?31-160\b/i, status: 'wrong', current: 'DAFI 34-160, Mortuary Affairs Program, 3 March 2022', note: 'The mortuary affairs instruction is 34-160, not 31-160.', url: 'https://static.e-publishing.af.mil/production/1/af_a1/publication/dafi34-160/dafi34-160.pdf' },
  { pattern: /\bAFI\s?38-401\b/i, status: 'replaced', current: 'DAFI 38-401, Continuous Process Improvement', note: 'Now a DAFI. A DAF guidance memorandum renames the program Continuous Improvement and Innovation (CI2).', url: 'https://static.e-publishing.af.mil/production/1/saf_mg/publication/dafi38-401/dafi38-401.pdf' },
  { pattern: /\bAFI\s?51-110\b/i, status: 'replaced', current: 'DAFI 51-110, Professional Responsibility Program, 12 January 2026', note: 'Replaced AFI 51-110 (11 December 2018).', url: 'https://static.e-publishing.af.mil/production/1/af_ja/publication/dafi51-110/dafi51-110.pdf' },
  { pattern: /\bAFI\s?24-602\s?V(?:olume\s?)?4\b/i, status: 'replaced', current: 'DAFI 24-602V4, Personal Property Moving and Storage, 2 June 2026', note: 'Replaced AFI 24-602V4 (15 October 2020).', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/dafi24-602v4/dafi24-602v4.pdf' },
  { pattern: /\bAFMAN\s?24-210/i, status: 'replaced', current: 'DAFMAN 24-210, Packaging of Hazardous Material, 17 March 2023', note: 'Now a DAFMAN.', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/dafman24-210/dafman24-210.pdf' },
  { pattern: /\bDODI\s?4516\.16\b/i, status: 'wrong', current: 'DoDI 4515.16, Use of GSA City Pair Program contracts for travel to inactive duty training', note: 'The STS prints 4516.16; the issuance is 4515.16.', url: 'https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodi/451516p.pdf' },
  { pattern: /\b(?:DAF|AF)MAN\s?23-122\b/i, status: 'confirm', current: 'DAFMAN 23-300, Materiel Management Procedures', note: '2026 Air Force publications cite DAFMAN 23-300 for materiel management procedures. Confirm on e-Publishing whether it replaced 23-122 before relying on 23-122 paragraph numbers.' },
  { pattern: /\b(?:DAF|AF)I\s?10-401\b/i, status: 'confirm', current: 'DAFI 10-401, Operations Planning and Execution', note: 'Base publications cite it as DAFI 10-401; its current edition could not be confirmed.' },

  // Checked and current
  { pattern: /\bDAFMAN\s?20-110\b/i, status: 'current', current: 'DAFMAN 20-110, 3 October 2024', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/dafman20-110/dafman20-110.pdf' },
  { pattern: /\bDAFMAN\s?21-201\b/i, status: 'current', current: 'DAFMAN 21-201, 24 October 2024', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/dafman21-201/dafman21-201.pdf' },
  { pattern: /\bDAFMAN\s?23-300\b/i, status: 'current', current: 'DAFMAN 23-300, cited by 2026 Air Force publications' },
  { pattern: /\bDAFI\s?34-160\b/i, status: 'current', current: 'DAFI 34-160, 3 March 2022', url: 'https://static.e-publishing.af.mil/production/1/af_a1/publication/dafi34-160/dafi34-160.pdf' },
  { pattern: /\bDAFI\s?24-602\s?V(?:olume\s?)?4\b/i, status: 'current', current: 'DAFI 24-602V4, 2 June 2026', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/dafi24-602v4/dafi24-602v4.pdf' },
  { pattern: /\bDAFI\s?24-602\s?V(?:olume\s?)?2\b/i, status: 'current', current: 'DAFI 24-602V2, 20 December 2023, with DAFGM 2025-01', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/dafi24-602v2/dafi24-602v2.pdf' },
  { pattern: /\b(?:DAF|AF)I\s?24-602\s?V(?:olume\s?)?1\b/i, status: 'current', current: 'AFI 24-602V1, 15 December 2020, with a DAF guidance memorandum of 16 February 2024', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/dafi24-602v1/afi24-602v1.pdf' },
  { pattern: /\bDAFI\s?10-403\b/i, status: 'current', current: 'DAFI 10-403, 17 December 2025' },
  { pattern: /\bAFI\s?1-1\b/i, status: 'current', current: 'AFI 1-1, 18 August 2023' },
  { pattern: /\bAFI\s?10-201\b/i, status: 'current', current: 'AFI 10-201, 5 June 2024', url: 'https://static.e-publishing.af.mil/production/1/af_a3/publication/afi10-201/afi10-201.pdf' },
  { pattern: /\bAFI\s?10-250\b/i, status: 'current', current: 'AFI 10-250, 22 July 2020', url: 'https://static.e-publishing.af.mil/production/1/af_sg/publication/afi10-250/afi10-250.pdf' },
  { pattern: /\bAFI\s?10-404\b/i, status: 'current', current: 'AFI 10-404, 24 July 2019', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/afi10-404/afi10-404.pdf' },
  { pattern: /\bAFI\s?10-405\b/i, status: 'current', current: 'AFI 10-405, 28 August 2023', url: 'https://static.e-publishing.af.mil/production/1/af_a3/publication/afi10-405/afi10-405.pdf' },
  { pattern: /\bAFI\s?17-130\b/i, status: 'current', current: 'AFI 17-130, 13 February 2020', url: 'https://static.e-publishing.af.mil/production/1/saf_cn/publication/afi17-130/afi17-130.pdf' },
  { pattern: /\bAFI\s?33-322\b/i, status: 'current', current: 'AFI 33-322, 23 March 2020, with Change 1', url: 'https://static.e-publishing.af.mil/production/1/saf_cn/publication/afi33-322/afi33-322.pdf' },
  { pattern: /\bAFMAN\s?24-206\b/i, status: 'current', current: 'AFMAN 24-206 (Interservice), certified current 13 February 2024', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/afman24-206/afman24-206.pdf' },
  { pattern: /\bAFMAN\s?24-604\b/i, status: 'current', current: 'AFMAN 24-604, 6 June 2025', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/afman24-604/afman24-604.pdf' },
  { pattern: /\bAFMAN\s?33-326\b/i, status: 'current', current: 'AFMAN 33-326, 31 July 2019' },
  { pattern: /\bAFH\s?33-337\b/i, status: 'current', current: 'AFH 33-337, 27 May 2015, with a 2021 DAF guidance memorandum' },
  { pattern: /\bAFPAM\s?10-243\b/i, status: 'current', current: 'AFPAM 10-243, 1 August 2002', url: 'https://static.e-publishing.af.mil/production/1/af_a3_5/publication/afpam10-243/afpam10-243.pdf' },
  { pattern: /\bDAFH\s?16-1406\b/i, status: 'current', current: 'DAFH 16-1406, 16 May 2023', url: 'https://static.e-publishing.af.mil/production/1/saf_aa/publication/dafh16-1406/dafh16-1406.pdf' },
  { pattern: /\bDAFI\s?20-112\b/i, status: 'current', current: 'DAFI 20-112, 21 March 2022, with Change 1 (19 September 2024)', url: 'https://static.e-publishing.af.mil/production/1/af_a4/publication/dafi20-112/dafi20-112.pdf' },
  { pattern: /\bDAFI\s?64-117\b/i, status: 'current', current: 'DAFI 64-117, Government Purchase Card Program, 19 May 2022', url: 'https://static.e-publishing.af.mil/production/1/saf_aq/publication/dafi64-117/dafi64-117.pdf' },
  { pattern: /\bDAFMAN\s?36-2689\b/i, status: 'current', current: 'DAFMAN 36-2689, 31 March 2023, with Change 1', url: 'https://static.e-publishing.af.mil/production/1/af_a1/publication/dafman36-2689/dafman36-2689.pdf' },
  { pattern: /\bDODI\s?1342\.19/i, status: 'current', current: 'DoDI 1342.19_DAFI 36-2908, 10 March 2023', url: 'https://static.e-publishing.af.mil/production/1/af_a1/publication/dodi1342.19_dafi36-2908/dodi1342.19_dafi36-2908.pdf' },
  { pattern: /\bDODI\s?4500\.57\b/i, status: 'current', current: 'DoDI 4500.57, Change 4, 11 December 2024', url: 'https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodi/450057p.PDF' },
  { pattern: /\bDODI\s?4515\.13\b/i, status: 'current', current: 'DoDI 4515.13, Change 7, 11 January 2024', url: 'https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodi/451513p.PDF' },
  { pattern: /\bDODI\s?5154\.31\b/i, status: 'current', current: 'DoDI 5154.31 (Volume 2, General Travel Provisions; Volume 4, Government Travel Charge Card)', url: 'https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodi/515431_vol04.pdf' },
  { pattern: /\bDODI\s?5220\.22\b/i, status: 'current', current: 'DoDI 5220.22; procedures are in DoDM 5220.32' },
  { pattern: /\bDODM\s?5400\.07/i, status: 'current', current: 'DoDM 5400.07_AFMAN 33-302' },
  { pattern: /\bDO[DW]I\s?6025\.19\b/i, status: 'current', current: 'DoDI 6025.19, 13 July 2022 (the program is now titled Department of War)' },
  { pattern: /\bDLM\s?4000\.25/i, status: 'current', current: 'DLM 4000.25, Volume 2; Chapter 17 is Supply Discrepancy Reporting' },
  { pattern: /\bMIL-STD-129\b/i, status: 'current', current: 'MIL-STD-129R, Change 2, 27 September 2019' },
  { pattern: /\bMIL-STD-147/i, status: 'current', current: 'MIL-STD-147E' },
  { pattern: /\bMIL-STD-2073-1/i, status: 'current', current: 'MIL-STD-2073-1E, Change 4' },
  // DTR chapter titles as USTRANSCOM lists them.
  { pattern: /\bDTR Part II, Chapter 202\b/i, status: 'current', current: 'DTR Part II, Chapter 202, Routing (USTRANSCOM title)', url: 'https://www.business.ustranscom.mil/dtr/dtrp2.cfm' },
  { pattern: /\bDTR Part II, Chapter 203\b/i, status: 'current', current: 'DTR Part II, Chapter 203, Shipper', url: 'https://www.business.ustranscom.mil/dtr/dtrp2.cfm' },
  { pattern: /\bDTR Part II, Chapter 205\b/i, status: 'current', current: 'DTR Part II, Chapter 205, Transportation Protective Service (TPS) Shipments', url: 'https://www.business.ustranscom.mil/dtr/dtrp2.cfm' },
  { pattern: /\bDTR Part II, Chapter 208\b/i, status: 'current', current: 'DTR Part II, Chapter 208, Packaging and Handling', url: 'https://www.business.ustranscom.mil/dtr/dtrp2.cfm' },
  { pattern: /\bDTR Part II, Chapter 210\b/i, status: 'current', current: 'DTR Part II, Chapter 210, Transportation Discrepancy Reports (TDR)', url: 'https://www.business.ustranscom.mil/dtr/dtrp2.cfm' },
  { pattern: /\bDTR Part III, Chapter 303\b/i, status: 'current', current: 'DTR Part III, Chapter 303, Deployment (USTRANSCOM title)', url: 'https://www.business.ustranscom.mil/dtr/dtrp3.cfm' },
  { pattern: /\bDTR Part III, Appendix P\b/i, status: 'current', current: 'DTR Part III, Appendix P, Center of Balance', url: 'https://www.business.ustranscom.mil/dtr/dtrp3.cfm' },
  { pattern: /\bDTR Part I, Appendix C\b/i, status: 'current', current: 'DTR Part I, Appendix C, Transporting Weapons, Ammunition, and Hazardous Materials', url: 'https://www.business.ustranscom.mil/dtr/dtrp1.cfm' },
  { pattern: /\bDTR Part V, Chapter 508\b/i, status: 'current', current: 'DTR Part V, Chapter 508, US Export Requirements', url: 'https://www.business.ustranscom.mil/dtr/dtrp5.cfm' },
  { pattern: /^DTR Part (?:I|III|IV|V), (?:Passenger Movement|Mobility|Personal Property|Customs)$/i, status: 'current', current: 'Published on the USTRANSCOM DTR site' },
];

export const STATUS_LABELS = { current: 'Current', replaced: 'Replaced', wrong: 'Number error', confirm: 'Confirm' };

export function publicationStatus(text) {
  return PUBLICATIONS.find(item => item.pattern.test(text)) || null;
}
