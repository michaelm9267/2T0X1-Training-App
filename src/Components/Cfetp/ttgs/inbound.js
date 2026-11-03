// Inbound Operations Task Training Guides (Attachment 5, TTGs 25-27), transcribed from the TTG
// documents. Same shape as ./passenger.js, plus `tables` for the code tables TTG 25 reproduces.
// Every line item matches the 2026 STS.

const NOTES = 'This lesson plan is designed for hands-on training (demonstration-performance). Traffic Management missions are different from station to station; training sessions may or may not easily lend themselves to hands-on training. Therefore, it is imperative that trainers demonstrate, document, and verify training using a variety of hands-on and scenario-based techniques to achieve the desired proficiency prior to signing the member\'s training records. For the purpose of this TTG, the term "publication" refers to any written document such as DAFI, pamphlet, manual, or technical order.';
const TIMELINE = 'Trainer will establish a timeline for completing the required training with the trainee.';
const range = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}.${from + i}`);

const classificationCodes = { title: 'Classification Item Code (Cataloging Data and Transaction Standards, Vol 10, Table 61, as reproduced in the TTG)', columns: ['Code', 'Explanation'], rows: [
  ['A', 'Confidential - Formerly Restricted Data'],
  ['B', 'Confidential - Restricted Data'],
  ['C*', 'Confidential'],
  ['D', 'Confidential - Cryptologic'],
  ['E', 'Secret - Cryptologic'],
  ['F', 'Top Secret - Cryptologic'],
  ['G', 'Secret - Formerly Restricted Data'],
  ['H', 'Secret - Restricted Data'],
  ['K', 'Top Secret - Formerly Restricted Data'],
  ['L', 'Top Secret - Restricted Data'],
  ['O', 'Item contains unclassified Naval nuclear propulsion information, disposal and access limitations are identified in OPNAVINST N9210.3.'],
  ['S', 'Secret'],
  ['T', 'Top Secret'],
  ['U', 'Unclassified'],
  ['W', 'A component as defined in AFI 91-101, Air Force nuclear weapons security program, and identified in Technical Order 21M-LGM-30F-12-1, Minuteman nuclear security procedures for the WS-133A-M/B Weapon System.'],
  ['7*', 'Items assigned a Demilitarization Code of C, D, E, F, or G and for which another CIIC is inappropriate. (NOTE: The loss, theft, unlawful disposition, and/or recovery of an item with CIIC 7 will be investigated in accordance with DLM 4000.25, Volume 2, Chapter 18 and DoD 7000.14-R, Volume 12, Chapter 7).'],
  ['9', 'This code identifies an item as a Controlled Cryptographic Item (CCI). CCI is described as secure telecommunications or information handling equipment, associated cryptographic component, or other hardware item which performs a critical COMSEC function. Items so designated are unclassified but controlled, and will bear the designation "Controlled Cryptographic Item or CCI."'],
] };

const sensitiveCodes = { title: 'Sensitive Items Code (as reproduced in the TTG; the applicable notes themselves are not included in the TTG)', columns: ['Code', 'Explanation', 'Applicable notes'], rows: [
  ['1', 'Highest Sensitivity (SRC I) – UNCLASSIFIED AA&E. Non-nuclear missiles, recoilless rifles, and rockets in a ready-to-fire (certified round) configuration. Examples: (e.g., Patriot missile launch canister, FIM-92 Stinger, M47 Dragon, Javelin, M72 LAW, M136 AT4 LAAW, M141 BDM) and explosive rounds for non-nuclear missiles and rockets. This SRC also applies in situations where the launcher tubes and explosive rounds, though not in a ready-to-fire configuration, are jointly stored or transported.', ''],
  ['2', 'High Sensitivity (SRC II) – UNCLASSIFIED AA&E.', '4, 5, and 6'],
  ['3', 'Moderate Sensitivity (SRC III) – UNCLASSIFIED AA&E.', '4, 5, and 6'],
  ['4', 'Low Sensitivity (SRC IV) – UNCLASSIFIED AA&E.', '4, 5, 6 and 8'],
  ['5', 'Highest Sensitivity (SRC I) – SECRET AA&E.', '3'],
  ['6', 'Highest Sensitivity (SRC I) – CONFIDENTIAL AA&E.', '3'],
  ['7', 'Non-Sensitive (SRC-N/A) – UNCLASSIFIED AA&E', ''],
  ['8', 'High Sensitivity (SRC II) – CONFIDENTIAL AA&E.', '3'],
  ['C', 'Moderate Sensitivity (SRC III) and Low Sensitivity (SRC IV) - CONFIDENTIAL AA&E.', '3'],
  ['Q', 'A drug or other controlled substance designated as a Schedule III, IV, or V item, in accordance with the Controlled Substance Act of 1970. Other sensitive items requiring limited access storage.', '1'],
  ['R', 'Precious Metals, a drug or other controlled substance designated as a Schedule I or II item, in accordance with the Controlled Substance Act of 1970. Other selected sensitive items requiring storage in a vault or safe.', ''],
  ['$', 'This code identifies Nuclear Weapons Use Control (UC) Ground Equipment which is CIIC unclassified but may require special controls. Use Control Ground Equipment is described as recorders, verifiers, adapters, power supplies, cables, programmers, monitors, controllers, code processors, power converters, computers and data modules which perform a Nuclear Weapon Use Control Function.', '2'],
] };

export const inboundTtgs = {
  25: { file: '25. In-checking Process', printed: '5.3.1.1. – 5.3.1.6.', lessons: [
    { id: 'ttg25-incheck', level: 'Basic', title: 'In-checking Process', printed: '5.3.1.1. – 5.3.1.6.', tasks: range('5.3.1', 1, 6), page: 3,
      prerequisites: ['Trainee has no prerequisites.', TIMELINE], references: ['DAFI 24-602v2, Chapter 3 & Attachment 9', 'DTR Part II, Chapter 203, 206', 'Cataloging Data and Transaction Standards, Vol 10, Table 61'],
      outcome: 'Know how to offload and visually inspect property for discrepancies, segregate by priority and classification, verify piece count against movement document (CBL, GBL, truck manifest, consolidations, etc.)', notes: NOTES,
      objectives: ['5.3.1.1. Offload and visually inspect property for discrepancies', '5.3.1.2. Segregate by priority and classification', '5.3.1.3. Verify piece count against movement document', '5.3.1.4. In-check shipment documents into system of record', '5.3.1.5. Generate turn over record in CMOS', '5.3.1.6. Contact customer for pick-up'],
      steps: [
        { heading: 'Offload and Visually Inspect Property for Discrepancies', ordered: true, items: [
          "Upon the arrival of cargo, it is important to conduct a visual inspection of the property verifying there's no damages, missing pieces, or a misdirected shipment prior to signing for & accepting shipment.",
          "If a discrepancy is discovered, the Inbound cargo personnel must annotate the discrepancy on the carrier's documents and have the carrier print & sign their full name and date next to the identified discrepancies. The In-checker must sign and date as well.",
        ] },
        { heading: 'Segregate By Priority and Classification', ordered: true, items: [
          'Trainee will ensure all deliveries are treated as TPS items until security classification is determined and protective services are no longer required.',
          'Cargo will be segregated by security classification, and transportation priority.',
          'To determine the classification, refer to the Cataloging Data and Transaction Standards, Vol 10, Table 61 (reproduced in the tables below).',
          'To determine Transportation Priority, refer to DAFI 24-602v2, Table 2.1.',
        ] },
        { heading: 'Verify Piece Count Against Movement Document (CBL, GBL, truck manifest, consolidations, etc.)', ordered: true, items: [
          'Review DAFI 24-602v2 Attachment 9. Review para A9.3.1 to learn about the different types of source documents.',
          'Validate source document IAW para A9.3.1.',
          'Review para A9.3.2 for instructions on how to verify shipment contents.',
        ] },
        { heading: 'In-check Shipment Documents into System of Record', ordered: true, items: [
          'All MILSTRIP & Non-MILSTRIP shipments will be in-checked in CMOS and ILS-S.',
          'Inbound Cargo Technicians can in-check cargo manually by entering information in the system of record or by scanning documentation with handheld terminals (HHT) that feed into the system of record. Utilize movement document to in-check cargo into the system of record. If required, enter the CIIC/PS code on the TCN detail screen.',
        ] },
        { heading: 'Generate Turn Over Record in CMOS & Contact Customer for Pick-Up', ordered: true, items: [
          'Utilize turn over screen in CMOS for all cargo not processed in ILS-S in order to generate turnover record for customer pick-up and maintain the chain of custody.',
          'For items requiring customer pick-up, contact customers to arrange pick-up. Ensure customers are aware of the consignee pick-up standards (DAFI 24-602v2, table 3.2).',
        ] },
      ],
      tables: [classificationCodes, sensitiveCodes],
      exercises: [
        'Demonstrate the ability to offload and visually inspect property for discrepancies.',
        'Demonstrate the ability to segregate shipments by priority and classification.',
        'Explain the different types of source documents.',
        'Demonstrate the ability to verify piece count against movement documents.',
        'Demonstrate the ability to in-check shipment documents into system of record.',
        'Demonstrate the ability to load/unload HHT if applicable at your location.',
        'Demonstrate the ability to generate turn over record in CMOS.',
        'Demonstrate the ability to contact customer for pick-up.',
      ] },
  ] },

  26: { file: '26. Discrepancy Reporting and Tracing Procedures', printed: '5.3.2.1. – 5.3.2.5.; 5.3.3.1. – 5.3.3.4.', lessons: [
    { id: 'ttg26-intermediate', level: 'Intermediate', title: 'Discrepancy Reporting and Tracing Procedures', printed: '5.3.2.1. – 5.3.2.5.', tasks: range('5.3.2', 1, 5), page: 3,
      prerequisites: ['Complete Basic requirements', TIMELINE], references: ['DAFI 24-602v2', 'DTR Part II, Chapter 210 & Appendix I', 'DIS training guide'],
      outcome: 'Know how to collect and identify transportation discrepancies information, initiate TSP discrepancies via TDR, utilize CBL to identify carrier infractions, communicate with responsible party (answer requests for information on audits, track, and trace requests, etc.)', notes: NOTES,
      objectives: ['5.3.2.1. Collect and identify transportation discrepancies information', '5.3.2.2. Initiates TSP discrepancies via Transportation Discrepancy Report', '5.3.2.3. Utilizes CBL to identify carrier infractions', '5.3.2.4. Communicate with responsible party', '5.3.2.5. File key supporting documents (KSD) per AFRIMS'],
      steps: [
        { heading: 'Collect and Identify Transportation Discrepancies Information & Utilize CBL to Identify Carrier Infractions', ordered: true, items: [
          'Review DAFI 24-602v2 para 11.5, DTR Part II chp 210 and Appendix I for information and instructions on the TDR process.',
          'Inbound Cargo personnel must collect relevant shipment and consignor information utilizing information systems and KSDs to support claims against responsible TSP.',
          'Review source document (e.g., CBL, airway bill, etc.) to validate rendered service requested by origin shipping activity (e.g.: service codes, RINs, RDD requirements, etc.).',
          'Utilize source document such as CBL or truck manifest to identify carrier infractions IAW DAFI 24-602v2 para 3.2.2.3.',
        ] },
        { heading: 'Initiate TSP Discrepancies via Transportation Discrepancy Report (TDR)', ordered: true, items: [
          'Utilize collected data to initiate TDR electronically via Discrepancy Identification System (DIS) or manually via DD Form 361, Transportation Discrepancy Report.',
          'DIS can be accessed through the GFM/ETA website. Users should complete familiarization training prior to using DIS. Select Training for DIS Online Tutorial and webinar training.',
          'Go to DTR Part II, chp 210, para E for instructions to complete the DD Form 361 electronically.',
          'For instructions to complete the manual DD Form 361, see DTR Part II Appendix I.',
        ] },
        { heading: 'Communicate with Responsible Party', ordered: true, items: [
          'When forwarding the TDR package, identify and coordinate with responsible parties (e.g., TSP, shipping activities, etc.).',
          'For reporting procedures, see DTR Part II, chp 210 para F.',
        ] },
        { heading: 'File Key Supporting Documents (KSD)', ordered: true, items: [
          'The importance of maintaining KSD is to provide proof of completion.',
          'Review DAFI 24-602v2 para 3.4 to understand the importance of maintaining Inbound documentation.',
          'Collect required KSDs and file IAW DAFI 24-602v2 para 3.4.2.',
        ] },
      ],
      exercises: [
        'Explain what is needed to initiate a TDR.',
        'Explain where to find instructions to complete a TDR via DIS.',
        'Explain how to complete a manual TDR if DIS is down.',
        'Explain the importance of KSDs. Demonstrate the ability to file KSD.',
      ] },
    { id: 'ttg26-advanced', level: 'Advanced', title: 'Discrepancy Reporting and Tracing Procedures: Carrier Violations, Astray Freight, and Tracing', printed: '5.3.3.1. – 5.3.3.4.', tasks: range('5.3.3', 1, 4), page: 6,
      prerequisites: ['Complete Intermediate requirements.', TIMELINE], references: ['DAFI 24-602v2', 'CPM User Manual', 'DTR Part II Chp 207 & 209'],
      outcome: 'Know how to report carrier violations via system of record, communicate with TSP to identify astray freight & submit results via GOCARE and track and trace cargo within automated data systems.', notes: NOTES,
      objectives: ['5.3.3.1. Report carrier violations via system of record', '5.3.3.2. Communicate with TSP to identify astray freight', '5.3.3.3. Submit results on GOCARE site', '5.3.3.4. Track and trace cargo within automated data system'],
      steps: [
        { heading: 'Report Carrier Violations Via System of Record', ordered: true, items: [
          'The Carrier Performance and Evaluation Program is designed to ensure DoD surface shippers get the best available service from CONUS commercial cargo TSP.',
          'It establishes minimum levels of satisfactory performance and prescribes procedures for denial of DoD cargo shipments to any TSP that fails to provide satisfactory service.',
          'Receiving activities are responsible for monitoring the performance of TSPs, report all service failures and discuss TSP performance with other shipping activities and be familiar with MFTURP-1 (published by SDDC) and 49 CFR.',
          'To report service failures, utilize carrier performance module (CPM) within Global Freight Management (GFM). Refer to DTR Part II, chp 207, para F & G.',
        ] },
        { heading: 'Communicate With TSP to Identify Astray Freight & Submit Results on GOCARE Site', ordered: true, items: [
          'Government Cargo Recovery Effort (GOCARE) is a program managed by SDDC. The purpose of this program is to locate and recover lost cargo in CONUS commercial warehouses.',
          'Quarterly, Inbound Cargo personnel will coordinate with local TSPs to conduct astray freight/GOCARE inspection.',
          'Once the inspection is complete, submit results on GOCARE site located in LTS NLT the 15th day of the month.',
          'For additional instructions, see DAFI 24-602v2 para 11.7 and DTR Part II, chp 209.',
        ] },
        { heading: 'Track and Trace Cargo within Automated Data Systems', ordered: true, items: [
          'The purpose of tracking and tracing shipments is to help customers determine the status of their cargo.',
          'In order to track cargo, the customer must provide the TCN assigned to the shipment.',
          'Using multiple tools (e.g., CMOS, IGC, GATES, etc.) Inbound Cargo personnel can track and trace cargo.',
          'Inbound cargo personnel will also use this method to complete the Transportation Tracer Listing (TTL) provided by LRS Customer Support Liaison.',
          'For additional information regarding tracking and tracing, see DAFI 24-602v2 para 11.8.',
        ] },
      ],
      exercises: [
        'Explain how to report a carrier violation via system of record.',
        'Demonstrate coordinating with TSP to arrange an inspection for astray freight.',
        'Log into the GOCARE website. Demonstrate the ability to submit results within the established timeline.',
        'Demonstrate the ability to track and trace cargo within automated data systems.',
        'Demonstrate conducting research for shipments on the TTL.',
      ] },
  ] },

  27: { file: '27. Receipt and Inbound Cargo Supervision', printed: '5.3.4.1. – 5.3.4.5.', lessons: [
    { id: 'ttg27-supervision', level: 'Expert', title: 'Receipt/Inbound Cargo Supervision', printed: '5.3.4.1. – 5.3.4.5.', tasks: range('5.3.4', 1, 5), page: 3,
      prerequisites: ['Complete Advance requirements', TIMELINE],
      references: ['Local Training Plan', 'GPC Training', 'DAFI 24-602v2', 'DAFI 64-117, Government Purchase Card Program', 'TTG 1, Utilize and Interpret Appropriate Publications (E)'],
      techniques: ['Establish relationship with local training manager', 'Establish relationship with local contracting office', 'Establish relationship with local mission partners'],
      outcome: 'Know how to develop training guides based on mission requirements, partner with contracting squadron to provide appropriate GPC holder training and coordinate with mission partners to develop installation local procedures.', notes: NOTES,
      objectives: ['5.3.4.1. Develop training guides based on mission requirements', '5.3.4.2. Partners with contracting squadron to provide appropriate GPC holder training', '5.3.4.3. Communicate with mission partners to streamline local procedures', '5.3.4.4. – 5.3.4.5. Develop/observe/validate local procedures'],
      steps: [
        { heading: 'Develop/Utilize Training Guides Based on Mission Requirements', ordered: true, items: [
          { text: 'To increase efficiency and productivity, training is the key to success. When personnel are properly trained it:', items: ['Enhances skills and knowledge', 'Boosts Confidence and Morale', 'Reduces Errors and Risks', 'Maintains Standards and Compliance'] },
          'As the Inbound Cargo lead, you will play a major role in the development of your personnel.',
          'Utilizing the 2T0X1 Career Field Education & Training Plan (CFETP), identify tasks required for your work center. Utilize applicable TTGs to train and test personnel on their proficiency.',
          'For processes not identified in applicable TTGs, develop continuity/training guides for those procedures.',
          'Develop a local training plan to track training status of personnel in upgrade training/new to the work center.',
          { text: 'Develop a weekly, bi-weekly, or monthly training schedule to ensure continuous learning. Allocate a specific day dedicated to training sessions. These sessions could involve quick knowledge-sharing sessions or updates on new procedures. You could also designate a topic for each individual to instruct the work center. Examples of topics include:', items: ['How to inspect shipments for damages', 'How to segregate cargo', 'How to process rejects', 'How to track and trace', 'REPSHIP procedures & how to process classifieds', 'How to in-check in ILS-S/CMOS', 'How to complete the DAF Form 4388', 'How to perform standby procedures'] },
          "After the completion of training, make certain that supervisors record comments in the member's training record.",
        ] },
        { heading: 'Partner with Contracting Squadron to Provide Appropriate GPC Holder Training', ordered: true, items: [
          'Contact the Agency/Organization Program Coordinator (A/OPC) to receive mandatory training.',
          { text: 'As the Inbound Cargo lead, you must actively support and provide essential training/assistance to:', items: ['The designated Contracting Officer(s)', 'GPC Program Manager(s)', 'Cargo movement support for government contractors when required'] },
          'Preparing customers in advance alleviates shipment errors and delays. As the Inbound Cargo lead, you may be required to provide training to installation POC on proper GPC/GSA shipment requirements.',
          'Inbound Cargo will provide POCs detailed packaging, labeling, transportation mode, method, funding, customs import duties, and advance clearance instructions.',
          'To get a better understanding of this program, review DAFI 24-602v2, chp 13 and contact your local Contracting office.',
        ] },
        { heading: 'Communicate with Mission Partners to Streamline Local Procedures / Develop/Observe/Validate Local Procedures', ordered: true, items: [
          'Inbound Cargo operations may differ at every installation. Because of this, the Transportation Officer (TO) is required to create local procedures in collaboration with mission partners.',
          { text: 'Establishing local procedures is a coordinated effort. As the Inbound Cargo lead your presence might be necessary at these working groups to offer expertise. You and the TO will communicate with outside agencies to streamline written procedures pertaining to the movement of government shipments/material on the installation. Below are examples of procedures to be addressed in the local procedures:', items: ['Procedures for base customers & security personnel that prepare, handle, receipt, document, ship and deliver classified, sensitive, AA&E and NWRM shipments', 'Aircraft engines', 'MICAPs', 'TMDE', 'Pick-up times/hours of operation'] },
          'Once completed, route the local procedures through applicable base units before publishing and disseminating.',
          'Annually, conduct a review of the installation local procedures. This review aims to validate the accuracy and effectiveness of procedures, POCs, and make necessary updates or revisions if required.',
          'For more information regarding local procedures, see TTG 1, Utilize and Interpret Appropriate Publications, and DAFI 24-602v2.',
        ] },
      ],
      exercises: [
        'Review local training plan. Review personnel in upgrade training and validate training status.',
        'Demonstrate creating training schedule and organize the next training session.',
        "Review DAFI 24-602v2, chp 13. Explain Traffic Management's role in the GPC Program.",
        "Review your installation's local procedures. Identify mission partners, ensure procedures and processes are accurate. Verify POCs are up to date.",
      ] },
  ] },
};
