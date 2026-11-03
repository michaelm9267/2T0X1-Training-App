// Special Handling Task Training Guides (Attachment 5, TTGs 28-30), transcribed from the TTG
// documents. Same shape as ./inbound.js. TTG 28 embeds the CMOS "Automated REPSHIP Procedures"
// guide, which is carried here as an attachment. Every line item matches the 2026 STS, except
// that the 2026 STS reworded 5.4.1.1-5.4.1.2 (see `numbering` on ttg28-identification).

const NOTES = 'This lesson plan is designed for hands-on training (demonstration-performance). Traffic Management missions are different from station to station; training sessions may or may not easily lend themselves to hands-on training. Therefore, it is imperative that trainers demonstrate, document, and verify training using a variety of hands-on and scenario-based techniques to achieve the desired proficiency prior to signing the member\'s training records. For the purpose of this TTG, the term "publication" refers to any written document such as DAFI, pamphlet, manual, or technical order.';
const TIMELINE = 'Trainer will establish a timeline for completing the required training with the trainee.';
const range = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}.${from + i}`);

const typeCargoCodes = { title: 'Type Cargo Codes (AFH 23-123v2PT2, Table 8.97, partial listing as reproduced in the TTG)', columns: ['Code', 'Phrase', 'Explanation of phrase'], rows: [
  ['A', 'RADIOACTIVE', 'Radioactive Substances'],
  ['B', 'MIXED HAZARDOUS', 'Mixed Hazardous Materiel'],
  ['C', 'ETIOLOGIC AGENT', 'Etiologic Agent'],
  ['D', 'CONTAMINATED CARGO', 'Contaminated Cargo'],
  ['E', 'HAZARDOUS MAT CONT', 'Empty Hazardous Materiel Containers'],
  ['F', 'EXPLOSIVES CLASS C', 'Explosives Class C'],
  ['G', 'NONFLAM CMPR GAS', 'Nonflammable Compressed Gas'],
  ['H', 'SBJ TO DMG FR HEAT', 'Subject to Damage from Heat'],
  ['I', 'EXPLOSIVES CLASS A', 'Explosives Class A'],
  ['J', 'EXPLOSIVES CLASS B', 'Explosives Class B'],
] };

const classifiedCodes = { title: 'Classified PS codes, DD Form 1348-1A block 9 (CDTS Vol 10, Table 61, partial listing as reproduced in the TTG)', columns: ['Code', 'Explanation'], rows: [
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
] };

const automatedRepship = { title: 'Automated REPSHIP Procedures (CMOS Joint Service Site, embedded in the TTG)', sections: [
  { heading: 'Overview', items: [
    'USAF is beginning a phased implementation of an automated REPSHIP capability, based on fielding of supporting software in CMOS and DSS. The initial phase will be for CONUS to CONUS shipments (including CONUS aerial ports and AF Nuclear Storage Facilities). Future expansion will include AF OCONUS locations and DLA activities.',
    'The 856A is the EDI Due-In transaction. An 856A will be generated for each shipment.',
    'The receiver system will, upon receiving the 856A, respond with a 315N (EDI Nodal Status Transaction). The receiving system automatically generates a 315N when the 856A is received and when the shipment is in-checked. The in-check 315N goes both to the shipper to clear their outbound REPSHIP suspense and to GTN for ITV.',
    { text: 'The exchange between shipper and receiver:', items: [
      'Shipper sends 856A REPSHIP to Receiver.',
      'After receiving the 856A REPSHIP, the receiver sends a 315N status message back to the shipper with status code "REPSHIP Received".',
      'After the shipment arrives and is in-checked, the receiver sends a 315N status message back to the shipper with status code "INC" (in-checked for onward processing; used to close out a REPSHIP reportable shipment).',
    ] },
    'The software also provides a REPSHIP management screen (Display REPSHIP) for both origin and destination. The origin screen shows REPSHIP status for outbound materiel; the destination screen shows REPSHIP status for inbound materiel.',
    'These instructions were adapted from the CMOS 7.3.1 New Users Guide. They cite AFI 24-203, Chapter 5.10.2.5, for the REPSHIP suspense list; that AFI has since been superseded by DAFI 24-602v2.',
  ] },
  { heading: 'Outbound', ordered: true, items: [
    { text: 'Origin will set the REPSHIP indicator on the Shipment Indicators screen.', items: [
      'The REPSHIP indicator is set automatically if the shipment record contained a CIIC code. For DD Form 1149 shipments, the indicator must be set manually.',
      'Ensure carrier data in the Commercial Carrier Data screen includes the carrier e-mail address and phone number. This provides the recipient the contact info for the carrier.',
    ] },
    'Origin will release the shipment immediately upon carrier departure.',
    'Origin will verify that each shipment requiring a REPSHIP shows up in the Display REPSHIP management window.',
    'Origin will review the Display REPSHIP screen periodically to validate the REPSHIP has been acknowledged by the destination. Validation appears in the box on the bottom right of the screen. The USER ID field shows the validating system DODAAC followed by "_A", which indicates the record was generated from an electronic transaction.',
    'In completing the DAF Form 4387 for automated REPSHIP shipments, enter "Automated REPSHIP" in Block II.E. and the date/time from the Date Entered field for the notification received entry in Block II.F.',
    'If there is no automated acknowledgement within two business hours, Origin will generate and fax a paper REPSHIP or email to the Destination, follow up with a confirming call to validate receipt, and enter that call information in the POC and REMARKS fields to create an electronic audit trail. Origin will also report acknowledgement failures to the CMOS FAB within one business day.',
    'Origin will call destination/initiate tracer action if acknowledgement of receipt of materiel is not received by the EDD. Acknowledgement of receipt is shown by a date in the CLOSED DATE field. If materiel was received at destination but no acknowledgement was sent/received, Origin will enter the call information in the POC and REMARKS fields and report the failure to CMOS FAB within 1 business day.',
    'The Display REPSHIP screen meets the requirements for a REPSHIP suspense list. If a manual REPSHIP is required because the shipment is going to a location not supported by the automated process, Origin will enter the REPSHIP information in the Display REPSHIP window.',
    'Origin will use the PRINT NOTICES button on the Display REPSHIP window to print a copy of the completed REPSHIP transaction to keep with the outbound shipment package.',
  ] },
  { heading: 'Inbound REPSHIP (automated)', ordered: true, items: [
    'Destination will review the Display REPSHIP screen periodically (at least daily) to determine if they have REPSHIP reportable inbound shipments. Recommended query: a wild card query on RELEASE DATE with "I" in the I/O field. A blank CLOSED DATE denotes an inbound REPSHIP that still needs to be in-checked.',
    'Shipment detail, including category, CIIC, NEW and Haz Class, can be found in the TCN DETAIL window of the INCHECK SURFACE CARGO screen. From that screen, the REPSHIPS button toggles back to Display REPSHIP.',
    'Destinations will in-check the shipment in CMOS immediately upon receipt. In-checking generates the electronic transaction to origin identifying that the materiel has been received and clears the origin REPSHIP suspense.',
    'Destination will call origin/initiate tracer action if the shipment is not received by the EDD shown on the Display REPSHIP screen. Enter the TRACER DATE, and in REMARKS the POC and contact information stating a tracer action has been initiated.',
    'Destination will use the PRINT REPLIES button on the Display REPSHIP window to print a copy of the completed REPSHIP reply transaction to keep with the inbound shipment package. Do this after the EDD and CLOSED DATE are completed; they fill automatically on in-check when the REP indicator is "E".',
    'The Display REPSHIP screen meets the requirements for a REPSHIP suspense list. If a manual REPSHIP is required because the shipment is coming from a location not supported by the automated process, Destination will enter the REPSHIP information in the Display REPSHIP window (see the manual process below).',
  ] },
  { heading: 'Inbound REPSHIP (manual)', ordered: true, items: [
    'When an EDI 856A is not received electronically, the destination will manually enter data for paper REPSHIPs through the Display REPSHIP screen after processing the shipment information in the INCHECK SURFACE CARGO screen (including the TCN DETAIL and DOC DATA windows, from the paper REPSHIP and/or the CBL). Verify the REP indicator is set to "M".',
    'After entering all required data, create an entry in the bottom right of the Display REPSHIPs screen filling out the USER ID, POC and REMARKS fields to create an audit trail. This must be completed prior to in-checking the shipment.',
    'Destinations will in-check the shipment in CMOS immediately upon receipt. Manual REPSHIPs require the destination to generate and fax a paper reply or an email to the Origin confirming receipt (PRINT REPLIES), create another USER ID/POC/REMARKS entry stating the shipment arrived, and enter a date in the CLOSED DATE field.',
    'Destination will call origin/initiate tracer action if the shipment is not received by the EDD. Enter the TRACER DATE, and in REMARKS the POC and contact information stating a tracer action has been initiated.',
  ] },
  { heading: 'Shipment cancellation', ordered: true, items: [
    'Origin will notify Destination of the shipment cancellation.',
    'Using the Display REPSHIP window, Origin and Destination will enter the POC and remarks stating the shipment was cancelled, then enter the CLOSED DATE.',
  ] },
] };

export const specialHandlingTtgs = {
  28: { file: '28. Special Handling Basic', printed: '5.4.1.1. – 5.4.1.14.', lessons: [
    { id: 'ttg28-identification', level: 'Basic', title: 'Special Handling', printed: '5.4.1.1. – 5.4.1.6.', tasks: range('5.4.1', 1, 6), page: 3,
      prerequisites: ['Trainee has no prerequisites.', TIMELINE], references: ['DAFI 24-602v2', 'AFI 20-110', 'AFH 23-123v2PT2, Table 8.97', 'CDTS Vol 10, Table 61'], additionalReferences: ['myTraining'],
      outcome: 'Know/complete required training needed to handle HAZMAT, classified, protected, NWRM and AA&E shipments. In addition, interpret documentation and cargo to determine classification and segregate appropriately. Lastly, learn how to perform inventory requirements for special cargo.', notes: NOTES,
      numbering: 'The TTG prints 5.4.1.1 as the Special Handling Assets Course and 5.4.1.2 as the NWRM Fundamentals Course. The 2026 STS words 5.4.1.1 as "Complete hazardous material handler qualification" and puts both courses in 5.4.1.2. This lesson covers both courses but does not cover a HAZMAT handler qualification; HAZMAT preparer certification is in TTG 29 (5.4.2.1).',
      objectives: ['5.4.1.1. Complete special handling assets course qualification', '5.4.1.2. Complete NWRM fundamental course', '5.4.1.3. – 1.4. Recognizes HAZMAT, classified, protected and AA&E identifiers on docs and cargo', '5.4.1.5. Segregates and stores cargo as required', '5.4.1.6. Performs required inventories for special handling cargo'],
      steps: [
        { heading: 'Complete Special Handling Asset Course Qualifications & Complete NWRM Fundamental Course', ordered: true, items: [
          'According to DAFI 24-602v2 and AFI 20-110, Transportation Officers, Commanders and supervisors must ensure all personnel that handle, package, ship, load, transport, unload, receive, and store hazardous, classified, NWRM, and protected materiel receive proper training.',
          { text: 'Without proper training, personnel cannot handle hazardous, classified, NWRM and protected material. Training required to handle special cargo consists of but is not limited to:', items: ['Special Handling Assets Course (access via myTraining)', 'NWRM Fundamentals Course (access via myTraining)'] },
          'The Special Handling course familiarizes students with special handling assets commonly encountered at a tactical installation. The primary objective of this course is to learn the basic requirements for managing and handling materiel that is received, stored, and issued to customers on an installation.',
          'The NWRM program and this Fundamentals Course were developed to improve accountability and positive inventory control of items identified as NWRM. In response to the 2008 Office of the Secretary of Defense (OSD) guidance that defined NWRM and outlined special handling procedures, the AF developed policy to further define and identify NWRM assets, including what tools and processes are used to meet requirements.',
          'These courses are designed to qualify personnel to handle special assets. Once training is complete, personnel may be added to the appointment letter giving them authorization to handle special cargo.',
        ] },
        { heading: 'Recognizes HAZMAT, Classified, Protected and AA&E Identifiers on Documentation and Cargo', ordered: true, items: [
          'As a Traffic Manager, you will ship or receive all types of cargo. It is extremely important that you are able to determine the type of cargo to ensure proper handling.',
          { text: 'The classification of the asset will determine how cargo is handled. You will need to be familiar with the following classifications:', items: ['Hazardous Materiel', 'Classified', 'Protected Cargo', 'AA&E'] },
        ] },
        { heading: 'Hazardous Materiel', items: [
          'DAFI 24-602v2 defines hazardous materials as "substances or materials that the UN or DOT has determined are capable of posing an unreasonable risk to health, safety, and property during transportation. Also referred to as \'Dangerous Goods\' in international regulations."',
          'You can identify hazardous cargo by the shipping document and/or the markings and labels on the cargo.',
          'On the DD Form 1348-1A, block 8 identifies the Type Cargo Code (TCC). The TCC indicates to LRS/Transportation activities the type of cargo being handled to ensure it is handled properly. Some of the codes are in the Type Cargo Codes table below; for the full listing, see AFH 23-123v2PT2.',
          'On the DD Form 1149, block 4b will identify if the materiel is hazardous.',
          'Hazardous shipments will be labeled and marked as such. When inspecting cargo, look for the hazard class labels: Class 1 Explosive, Class 2 Non-flammable gas, Class 3 Flammable liquid, Class 4 Flammable solid, Class 5.1 Oxidizer, Class 6 Poison and Infectious substance, Class 7 Radioactive, Class 8 Corrosive, and Class 9 Miscellaneous.',
        ] },
        { heading: 'Classified Cargo', items: [
          '"Classified" refers to information, documents, or materials that have been designated with a level of sensitivity and restricted access due to national security concerns.',
          { text: 'Classified information is categorized into levels, each indicating the degree of sensitivity and the level of access restriction. The most common classification levels in the United States are:', items: [
            'Top Secret: Information that, if disclosed, could cause exceptionally grave damage to national security. Access to Top Secret information is highly restricted.',
            'Secret: Information that, if disclosed, could cause serious damage to national security. Access to Secret information is also restricted but to a lesser degree than Top Secret.',
            'Confidential: Information that, if disclosed, could cause damage to national security. Access to Confidential information is more widely granted but still restricted.',
          ] },
          'Classified cargo will not have markings or a packing list to show classification.',
          'Classified documentation will determine classification. For example, the DD Form 1348-1A or DD Form 1149 will be stamped in bold red letters, "CLASSIFIED" or "SECRET."',
          'Block 9 of the DD Form 1348-1A contains the "PS" code, which represents the security classification and/or security risk or pilferage controls for storage and transportation of a materiel item. Some of the codes are in the classified PS codes table below; for the entire listing, see the Cataloging Data and Transaction Standards (CDTS) Vol 10, Table 61.',
        ] },
        { heading: 'Protected Cargo', items: [
          '"Protected cargo" generally refers to goods, items, or shipments that receive a level of security, safeguarding, or special attention during transportation or storage due to their nature, value, or sensitivity.',
          { text: 'Categories of protected cargo:', items: ['Sensitive', 'Pilferable', 'Controlled Cargo'] },
          'Just like classified cargo, the block 9 "PS" code will determine classification. Use the CDTS Vol 10, Table 61 to help identify protected cargo. Examples include PS code 7 for sensitive and PS code Y for pilferable.',
          'Protected cargo should have no markings on the container to determine classification.',
        ] },
        { heading: 'AA&E', items: [
          'AA&E may be classified, sensitive or pilferable depending on the CIIC (located in CDTS Vol 10, Table 61).',
          'You can find the classification on the DD Form 1348-1A in block 9.',
          'AA&E shipments will have no markings on the container to determine classification.',
        ] },
        { heading: 'Segregates and Stores Cargo as Required', ordered: true, items: [
          'According to DAFI 24-602v2 para 3.2.2.4, "Cargo will be segregated by security classification, hazard class and transportation priority."',
          'In the previous lesson, you learned how to identify cargo requiring special handling.',
          'Using the shipping document and shipping label, determine the classification.',
          'Once classification has been determined, cargo will be segregated and stored by security classification, hazard class and transportation priority.',
        ] },
        { heading: 'Performs Required Inventories for Special Handling Cargo', ordered: true, items: [
          { text: 'According to DAFI 24-602v2 para 3.6.1, for "classified and sensitive items awaiting materiel receipt, record the following at the end of each shift:', items: ['TCN', 'TP', 'piece count', 'consignor information on the MSL'] },
          'At the start of the next shift, perform a physical examination and compare the on-hand inventory to the previous shift\'s listing to determine if any theft or pilferage has occurred."',
        ] },
      ],
      tables: [typeCargoCodes, classifiedCodes],
      exercises: [
        'Complete the Special Handling Asset and NWRM Fundamental training located in myTraining. Show proof of training.',
        'Explain how to determine cargo classification for hazardous shipments.',
        'Demonstrate how to determine classification for classified cargo.',
        'Identify designated areas for classified, hazardous, protected and AA&E cargo.',
        'Demonstrate completing an inventory for special handling cargo.',
      ] },
    { id: 'ttg28-documentation', level: 'Basic', title: 'Special Handling Documentation', printed: '5.4.1.7. – 5.4.1.14.', tasks: range('5.4.1', 7, 14), page: 8,
      prerequisites: ['Trainee has no prerequisites.', TIMELINE], references: ['DAFI 24-602v2', 'DTR Part II', 'AFI 20-110'], additionalReferences: ['CMOS Joint Service Site'],
      supportMaterial: ['DAF Form 4387', 'DAF Form 4388', 'DD Form 1907, DD Form 626, & DD Form 1387-2', 'REPSHIP'],
      outcome: 'Know how to complete documentation required for classified, protected, NWRM and AA&E cargo. In addition, identify personnel who are authorized to handle special cargo.', notes: NOTES,
      objectives: ['5.4.1.7. – 1.8. C/w and completes required DAF Form 4387/DAF Form 4388/other associated forms f/IB/OB cargo', '5.4.1.9. Validates all personnel handling classified, protected and AA&E cargo are approved in writing', '5.4.1.10. – 1.11. Complete Inbound/Outbound REPSHIP procedures', '5.4.1.12. – 1.14. Complete DD Form 1907, DD Form 626 and DD Form 1387-2'],
      steps: [
        { heading: 'Complies with and Completes Required DAF Form 4387/4388 and Other Associated Forms for Inbound/Outbound Cargo', ordered: true, items: [
          'The DAF Form 4387, Outbound Transportation Protective Service Materiel Worksheet, and DAF Form 4388, Inbound Transportation Protective Service Materiel Worksheet, will be prepared in conjunction with packing classified/TPS cargo for movement and receiving classified/TPS shipments.',
          'Traffic Managers will complete the DAF Form 4387 IAW DAFI 24-602v2 para 4.8.2 for TPS materiel and AFI 20-110 para 4.3.1 for NWRM shipments.',
          'Traffic Managers will complete the DAF Form 4388 IAW DAFI 24-602v2 para 3.2.5, AFI 20-110 para 6.8.1 and DTR Part II, chp 205, para C, Receive/receipt AA&E, classified and sensitive shipments.',
          'Completing both checklists is a two-person concept. The inspection will be performed jointly by the in-checker and certifier. Both signatures will be confirmed on the DAF Form 4387/DAF Form 4388 when packing/preparing or receiving AA&E, Classified, NWRM, Sensitive and Controlled Items.',
          'According to DAFI 24-602v2 para 4.8.2, the certifier for all sections will be a 2T0 with a Primary AFSC of 2T071, military, civilian or contractor supervisor, or equivalent level. The individual (packer/in-checker) performing the tasks and the certifier cannot be the same person.',
        ] },
        { heading: 'Validates All Personnel Handling Classified, Protected and AA&E Cargo Are Approved in Writing', ordered: true, items: [
          'Individuals handling classified, protected and AA&E cargo must be trained and appointed in writing IAW DAFI 24-602v2 para 1.7.6 & 1.9.4.',
          'Commanders from other squadrons will provide LRS a memorandum of all qualified personnel that can handle special cargo.',
          'When customers bring classified, protected and AA&E cargo for shipment, Traffic Managers must verify they are authorized to handle such cargo. The same applies for Inbound/Receiving: when customers come to retrieve classified, protected and AA&E cargo, they must be on the list signed by their unit commander.',
          'Each letter should be updated at least annually.',
        ] },
        { heading: 'Complete Inbound/Outbound REPSHIP Procedures', ordered: true, items: [
          'According to DTR Part II, chp 205, a REPSHIP will be submitted for all AA&E, classified, sensitive, protected, NWRM and HAZMAT shipments.',
          'Complete Inbound and Outbound REPSHIPs IAW the CMOS Joint Service Site, Automated REPSHIP Procedures (see the attachment below).',
          'Shippers will use electronic means to submit a REPSHIP (e.g., via e-mail, fax, DTTS, or electronic interchange in the shipper\'s system) to both the next immediate en route transportation node and the final destination. Receivers executing REPSHIP confirmations and shipment receipts shall also use an electronic means.',
          'Inbound Cargo personnel will create a suspense file to monitor shipment status. If the shipment is not received within the estimated delivery date, initiate tracer action and contact the security officer. See DAFI 24-602v2 para 4.9.6.2 – 4.9.7 for additional information.',
          'IAW DAFI 24-602v2 para 4.8.9, the shipping activity will contact the receiving activity to confirm the REPSHIP. If acknowledgement is not received within the timeframe listed in DAFI 24-602v2 para 4.8.9.3, follow up to ensure receipt. If no confirmation is received, follow the actions identified in DAFI 24-602v2 para 4.8.9.5.',
          'For an origin or destination without an automated REPSHIP capability, fax or e-mail processes shall be exercised. See DTR Part II, chp 205, Figure 205-10 for an example.',
        ] },
        { heading: 'Complete DD Form 1907, DD Form 626 and DD Form 1387-2', ordered: true, items: [
          'The following forms provide accountability of classified and protected shipments. Below are descriptions of each IAW DAFI 24-602v2.',
          'DD Form 1907: The Signature and Tally Record, or equivalent TSP-furnished forms, will be used for control and accountability between cargo activities and commercial TSPs. Instructions for completing the DD Form 1907 are in DTR Part II, chp 205, Figure 205-2.',
          'DD Form 626: Used when TSPs are transporting hazardous materials and motor vehicle inspection is required. Prior to loading or unloading, Traffic Managers shall inspect all vehicles used to transport placarded or non-placarded AA&E shipments requiring TPS, SNS, and placarded quantities of HAZMAT. For DD Form 626 requirements see DTR Part II, chp 204, para G & Figure 204-9.',
          'DD Form 1387-2: When a shipment goes by military airlift, the DD Form 1387-2, Special Handling Data/Certification, must show the TPS required in Block 6. See DTR Part II, chp 205, Figure 205-3 for preparation and distribution.',
        ] },
      ],
      attachments: [automatedRepship],
      exercises: [
        'Explain who is authorized to certify the DAF Form 4387 & DAF Form 4388. Demonstrate completing a DAF Form 4387 & DAF Form 4388.',
        'Locate the appropriate letters identifying appointed personnel authorized to handle classified, protected and AA&E cargo.',
        'Explain when you would create a REPSHIP. Locate the outbound suspense file & verify that contact has been made with the receiving activity.',
        'Demonstrate completing the DD Form 1907, DD Form 626, and DD Form 1387-2.',
      ] },
  ] },

  29: { file: '29. Special Handling Intermediate', printed: '5.4.2.1. – 5.4.2.12.', lessons: [
    { id: 'ttg29-hazmat', level: 'Intermediate', title: 'Special Handling', printed: '5.4.2.1. – 5.4.2.2.', tasks: range('5.4.2', 1, 2), page: 3,
      prerequisites: ['Complete Basic requirements.', TIMELINE], references: ['DAFI 24-602v2', 'AFMAN 24-604', 'DTR Part II, chp 203 & 205', 'DTR Part VII', 'DAFI 24-602v1', 'AFI 20-110'], additionalReferences: ['myTraining', 'AFIMSC SharePoint'],
      outcome: 'Know how to request training for the HAZMAT preparer course and pack/certify HAZMAT.', notes: NOTES,
      objectives: ['5.4.2.1. Obtains and maintains hazmat preparer or sister service equivalent cert', '5.4.2.2. Packages and certifies hazardous material'],
      steps: [
        { heading: 'Obtains and Maintains Hazmat Preparer or Sister Service Equivalent Cert', ordered: true, items: [
          { text: 'According to DAFI 24-602v2, para 14.5, personnel who certify, prepare, handle, or inspect HAZMAT for shipment within the DTS must receive initial and subsequent refresher HAZMAT training according to DTR Part II, AFMAN 24-604 and/or host nation requirements. Personnel must complete an initial 80-hr classroom certification course from one of the following DOD-approved schools:', items: ['345th Training Squadron, Transportation Training Flight', 'Navy Supply Corps School', 'Department of the Army Defense Ammunition Center', 'DOT Transportation Safety Institute (TSI) training'] },
          'AF personnel can request HazMat initial/refresher training through the AFIMSC website: Traffic Management Workspace - AFIMSC XZ 2T0 FAM and MFM (dps.mil).',
          'To attend training at a sister service location (listed above), see DTR Part II, chp 204 para D for contact information.',
          'Ensure that upon completion of certification, the individual is appointed in writing by the appropriate authority.',
          'All HAZMAT personnel must receive refresher training at 24-month intervals IAW Service/Agency policy. This applies to all levels of required training and includes personnel involved with certifying shipments, preparation, packaging, or handling HAZMAT for transportation.',
        ] },
        { heading: 'Packages and Certifies Hazardous Material', ordered: true, items: [
          { text: 'Trained personnel should be officially trained and qualified to pack & certify hazardous material via all modes IAW the governing publications:', items: ['49 CFR, Code of Federal Regulations', 'AFMAN 24-604, Preparing Hazardous Materials for Military Air Shipments', 'IATA, International Air Transport Association', 'IMDG, International Maritime Dangerous Goods'] },
          { text: 'When shipping HAZMAT, specific requirements vary based on the type of cargo, mode of shipment and the regulation used to prepare the shipment. Use the following as a guide to prepare hazardous material:', items: [
            'Ensure trained personnel are handling cargo',
            'Identify if the material is hazardous. Review shipping/supporting docs, SDS, etc.',
            'Determine proper shipping name and hazardous material description',
            'Based on the mode, determine package type',
            'Verify packaging is acceptable and determine any special provisions, excepted and limited quantity, etc.',
            'Mark and label shipment IAW guidance',
            'Complete hazardous material documentation/certification. Refer to DTR Part II, chp 204, Table 204-4 for required documentation based on mode.',
            'If required, determine compatibility requirements',
            'Communicate with carriers',
          ] },
        ] },
      ],
      exercises: [
        'Explain how to request a class date for HazMat.',
        'Locate the appointment letter authorizing personnel to pack & certify HazMat shipments. Verify that everyone listed is current.',
        'Demonstrate the ability to pack, label, mark and certify HazMat.',
        'Demonstrate the ability to secure cargo IAW DoD guidelines.',
      ] },
    { id: 'ttg29-security', level: 'Intermediate', title: 'Special Handling (Cargo Security, Special Routing & NWRM)', printed: '5.4.2.3. – 5.4.2.12.', tasks: range('5.4.2', 3, 12), page: 6,
      prerequisites: ['Complete Basic requirements.', TIMELINE], references: ['DAFI 24-602v2', 'DTR Part II, chp 203 & 205', 'DTR Part VII', 'AFI 20-110'], supportMaterial: ['REPSHIP'],
      outcome: 'Know how to secure special cargo by selecting TSPs with proper credentials, research country instructions to ensure customs requirements are met, coordinate human remains, process expedited shipment requests, utilize DTTS and understand the NWRM process.', notes: NOTES,
      objectives: ['5.4.2.3. Ensure cargo has been secured IAW DoD guidelines', '5.4.2.4. Complies with country specific movement requirements', '5.4.2.5. Coordinates and processes human remains for movement', '5.4.2.6. – 2.7. Maintains Outbound/Inbound REPSHIP suspense file', '5.4.2.8. Validates and coordinates requirements f/green and purple sheet(s)', '5.4.2.9. Validates and coordinates requirements for same day service', '5.4.2.10. Ensure cargo is recorded in DTTS prior to departure', '5.4.2.11. Closes shipment tracking in DTTS for Inbound cargo', '5.4.2.12. Describe the Inbound and Outbound process for NWRM'],
      steps: [
        { heading: 'Ensure Cargo Has Been Secured IAW DoD Guidelines', ordered: true, items: [
          'When selecting a TSP to move classified and protected shipments, Traffic Managers must ensure they are selecting authorized TSPs and that receiving activities are equipped to accept cargo. Review DAFI 24-602v2 para 4.6 for additional information.',
          'Refer to DTR Part II, chp 205 para G for additional requirements for securing protected cargo.',
          'Review DTR Part II, chp 205, para O for accessorial descriptions and standards to apply when requesting qualified TSPs and protected services.',
        ] },
        { heading: 'Complies With Country Specific Movement Requirements', ordered: true, items: [
          { text: 'When shipping to international countries, follow the guidance below:', items: [
            'Check the DTR Part V chapter for the COCOM/country the cargo is being shipped to for any special customs directions, and clarify any questionable customs requirements.',
            'Ensure there are no confiscations, holds, or customs rules that would prevent the receiving POC from taking possession of cargo upon delivery.',
            'Check the Foreign Clearance Guide (FCG), https://www.fcg.pentagon.mil, for the country the cargo is destined for.',
            'Award shipments to eligible carriers using GHS procedures (https://ww2.ustranscom.mil/commair/index.cfm). Ensure applicable CIS services are identified.',
          ] },
        ] },
        { heading: 'Coordinates and Processes Human Remains for Movement', ordered: true, items: [
          'The transportation of deceased Service members and other DoD-affiliated personnel is recognized as a very sensitive matter, and the movement of the deceased\'s remains will be handled with the reverence, care, priority, and dignity befitting them and the circumstances.',
          'According to DAFI 24-602v2 para 16.1, procedures to support the movement of human remains are provided in DTR Part VII, DAFI 31-160, Mortuary Affairs Program, and DAFI 24-602v1, Passenger Movement.',
          'Government aircraft is normally used to move human remains between OCONUS points or to the CONUS aerial port of debarkation (APOD); in certain overseas locations, commercial air cargo is used. The normal mode for movement of human remains within CONUS is commercial air or other means that meet specific requirements.',
          'As the Traffic Manager, you will work closely with the Summary Court Officer (SCO) to coordinate movement. The SCO will provide the required documentation to process human remains.',
        ] },
        { heading: 'Maintains Outbound/Inbound REPSHIP Suspense File', ordered: true, items: [
          'When shipping and receiving protected cargo, the status of the cargo should be closely monitored.',
          'IAW DAFI 24-602v2 para 4.8.9, the shipping activity will contact the receiving activity to confirm the REPSHIP. If acknowledgement is not received within the timeframe listed in DAFI 24-602v2 para 4.8.9.3, follow up to ensure receipt. If no confirmation is received, follow the actions identified in DAFI 24-602v2 para 4.8.9.5.',
          'Inbound Cargo personnel will create a suspense file to monitor shipment status. If the shipment is not received within the estimated delivery date, initiate tracer action and contact the security officer. See DAFI 24-602v2 para 4.9.6.2 – 4.9.7 for additional information.',
        ] },
        { heading: 'Validates and Coordinates Requirements for Green and Purple Sheet / Same Day Service', ordered: true, items: [
          { text: 'The request for cargo can be expedited if deemed operationally necessary, for national interest, or at risk of mission failure. The request can be granted via the following options:', items: ['Green Sheet', 'Purple Sheet', 'Same Day Service'] },
          'Green Sheet: According to DAFI 24-602v2 para 2.9, Green Sheet is a process where specifically identified cargo in the AMC system may gain movement precedence over other priority cargo of the sponsoring Service, including 999/NMCS/MICAP shipments. A Green Sheet request will be approved if the ACA certifies that it is an operational necessity. For additional information see DAFI 24-602v2 para 2.9.1 – 2.9.3 and DTR Part II, chp 203.',
          'Purple Sheet: According to DAFI 24-602v2 para 2.10, the COCOM uses Purple Sheet action to expedite movement of specific shipment(s) of national interest and operational necessity. It authorizes specifically identified cargo in the DTS in transit to the COCOM AOR to gain movement precedence over other priority cargo in transit to the COCOM AOR, including 999/NMCS/MICAP and Green Sheet shipments, regardless of service lane or arrival date at the APOE. See DAFI 24-602v2 para 2.10 – 2.10.3 and DTR Part II, chp 203 for additional information.',
          'Same Day Service: Use only in dire circumstances (e.g., mission failure). Same Day Service moves via scheduled commercial air TSPs and does not include a guaranteed arrival time. For additional information, see DAFI 24-602v2 para 2.11 – 2.11.4.4.',
        ] },
        { heading: 'Ensure Cargo is Recorded in DTTS Prior to Departure / Closes Shipment Tracking in DTTS for Inbound Cargo', ordered: true, items: [
          'According to DAFI 24-602v2 para 4.8.8, when satellite tracking services are required, shippers must monitor the in-transit status of shipments in the Defense Transportation Tracking System (DTTS) until delivery is confirmed. The TO will ensure a minimum of two accounts are established to access the DTTS website.',
          'If a shipment requires DTTS, ensure the appropriate blocks are checked and the shipment is released in CMOS before the vehicle departs the installation.',
          'When Inbound Cargo personnel in-check the shipment at the final destination, it automatically closes out the shipment in DTTS. If CMOS is unavailable, close the record via the DTTS website.',
          'Refer to DTR Part II, chp 205, for DTTS procedures.',
        ] },
        { heading: 'Describe the Inbound and Outbound Process for NWRM', ordered: true, items: [
          'AFI 20-110, chp 6, Shipment and Receipt Processing, describes the shipping and receiving requirements for NWRM shipments.',
          'For Outbound procedures, see AFI 20-110 para 6.2 – 6.7. When routing NWRM shipments, see DTR Part II, chp 205.',
          'NWRM in-checking will be accomplished IAW DAFI 24-602v2, and TICMS-managed NWRM will be in-checked IAW AFMAN 21-201. See DAFI 24-602v2, para A9.7.11 for Inbound processing and AFI 20-110 para 6.8 – 6.9.',
        ] },
      ],
      exercises: [
        'Go to DTR Part II, chp 205 and research Table 205-9. What protective/accessorial service code is required for Satellite Motor Surveillance Service and Dual Driver Protective Service?',
        'Explain how to request protective/accessorial services and how to verify the requested service has been applied.',
        'Go to DTR Part V and search for Turkey country instructions. What is required to provide clearance/permission for cargo to be imported into Turkey?',
        'When dealing with Human Remains, who will the Traffic Manager work closely with?',
        'For Outbound REPSHIPs, what is the timeframe to receive confirmation from CONUS/OCONUS locations?',
        'Explain what information is required for a Green Sheet request.',
        'Explain who is authorized to approve Same Day Service.',
        'When shipping cargo that requires DTTS, explain when it is released.',
        'Review AFI 20-110 chapter 6 and explain when the DD Form 1149 is authorized for shipping NWRM. Also, explain how NWRM shipments are tracked.',
      ] },
  ] },

  30: { file: '30. Special Handling Advanced/Expert', printed: '5.4.3.1. – 5.4.3.3.; 5.4.4.1. – 5.4.4.3.', lessons: [
    { id: 'ttg30-advanced', level: 'Advanced', title: 'Special Handling', printed: '5.4.3.1. – 5.4.3.3.', tasks: range('5.4.3', 1, 3), page: 3,
      prerequisites: ['Complete Intermediate requirements.', TIMELINE], references: ['DAFI 24-602v2', 'DLM 4000.25, V2, Chapter 17 & Appendix 7.28', 'AFMAN 23-122', 'DTR Part II', 'DAFI 24-602v1', 'AFI 20-110'], additionalReferences: ['myTraining', 'AFIMSC SharePoint'],
      outcome: 'Understand the importance of TDR/SDRs and ensure they are submitted accurately within the standard timeframe. Additionally, ensure the certification of DAF Form 4387/DAF Form 4388.', notes: NOTES,
      objectives: ['5.4.3.1. Enforces TDR and SDR procedures', '5.4.3.2. – 5.4.3.3. Completes required DAF Form 4387/DAF Form 4388 certification'],
      steps: [
        { heading: 'Enforces TDR and SDR Procedures', ordered: true, items: [
          'Enforcing TDR and SDR procedures is essential for maintaining the integrity of transportation operations. It contributes to accurate data, financial accountability, regulatory compliance, and overall efficiency in supply chain management. For an overview of TDR/SDR, see DAFI 24-602v2 chp 11.',
          { text: 'Enforcing TDR and SDR procedures is crucial for several reasons:', items: [
            'TDR and SDR procedures help identify and rectify discrepancies or errors in transportation and shipping data. Accurate information is vital for proper inventory management, financial tracking, and compliance.',
            'It enhances traceability within the supply chain. This visibility is essential for tracking the movement of goods, identifying potential issues, and maintaining control over inventory.',
            'It contributes to accurate billing and financial transactions. Resolving discrepancies promptly ensures that invoicing is based on actual services provided, avoiding financial discrepancies.',
            'It helps eliminate bottlenecks, reduces delays, and enhances the overall efficiency of the logistics and transportation processes.',
            'Addressing the underlying causes helps prevent similar issues from recurring.',
          ] },
          'When involving TPS assets, ensure the SDR is routed to the appropriate agencies within the applicable timeframes listed in DLM 4000.25, Vol. 2, Chapter 17.',
          'HAZMAT and TPS TDRs will have priority over general cargo discrepancies. See DTR Part II, chp 210 para B & N for additional information.',
        ] },
        { heading: 'Completes Required DAF Form 4387/4388 Certification', ordered: true, items: [
          'To complete the DAF Form 4387, certifiers must meet the requirements and follow the instructions provided in DAFI 24-602v2 para 4.8.2.',
          'To complete the DAF Form 4388, certifiers must meet the requirements and follow the instructions provided in DAFI 24-602v2 para 4.9.3.',
        ] },
      ],
      exercises: [
        'Review DLM 4000.25, Vol. 2, Chapter 17. What is the reporting timeframe for reporting wrong item receipts of controlled inventory, arms, arms parts, and explosives?',
        'Review DAFI 24-602v2 para 4.8.2. What are the requirements to be a certifier? Explain the responsibility of a certifier.',
        'When accomplishing the DAF Form 4387/DAF Form 4388, can the individual performing the tasks and the certifier be the same person?',
      ] },
    { id: 'ttg30-expert', level: 'Expert', title: 'Special Handling', printed: '5.4.4.1. – 5.4.4.3.', tasks: range('5.4.4', 1, 3), page: 5,
      prerequisites: ['Complete Advanced requirements.', TIMELINE], references: ['DAFI 38-401, Continuous Process Improvement', 'CPI SharePoint', 'TTG 1, Utilize & Interpret Appropriate Publications (E)'],
      outcome: 'Know how to collect feedback to identify training.', notes: NOTES,
      objectives: ['5.4.4.1. Coordinates and collects feedback for special handling training', '5.4.4.2. Utilize CPI principles to innovate and formulate training', '5.4.4.3. Communicates and participates in working groups to transform policies and directives'],
      steps: [
        { heading: 'Coordinates and Collects Feedback for Special Handling Training', intro: 'Coordinating and collecting feedback for special handling training is essential for assessing the effectiveness of training programs and making continuous improvements.', items: [
          'Before gathering feedback, know what you aim to achieve; that will guide the feedback collection process. Clearly communicate to the team that their feedback is valued and will be used to enhance training initiatives.',
          'Some examples of gathering feedback: hosting a meeting, sending out a survey, a comment box.',
          'Once data has been collected, review and share the results.',
          'For example, if results indicate training deficiencies in processing classified shipments, present this information to your team and solicit ideas for improvement.',
          'Develop a training plan to enhance proficiency in the work center (e.g., conduct weekly training, create demonstration videos, continuity books, etc.).',
          'Ensure everyone receives training and document the session in their training records.',
        ] },
        { heading: 'Utilize CPI Principles to Innovate and Formulate Training', ordered: true, items: [
          'Continuous Process Improvement (CPI) is a methodology focused on consistently improving processes and workflows to enhance efficiency, quality, and overall performance.',
          'The AF CPI program is governed by DAFI 38-401, Continuous Process Improvement, and the goal of CPI is to eliminate waste while maximizing customer value.',
          { text: 'AF CPI uses several process improvement methodologies; some include:', items: ['Lean Six Sigma', 'Theory of Constraints', 'Business Process Reengineering'] },
          'Key principles contained in these methodologies include improving flow and reducing waste within a process, focusing on factors that degrade product quality, identifying and overcoming process constraints, and redesigning processes.',
          'To enhance your work center, incorporate CPI measures. The AF CPI portal provides several resources: Continuous Improvement & Innovation Portal (CI²) - Guidance - All Documents (dps.mil). Also contact your local CPI office to assist with or initiate CPI projects.',
        ] },
        { heading: 'Communicates and Participates in Working Groups to Transform Policies and Directives', ordered: true, items: [
          'Participating in working groups to transform policies and directives involves effective communication, collaboration, and a commitment to achieving common goals.',
          'Stay engaged with organizations such as AFIMSC, respective MAJCOM POCs, HAF A4LR (2T0 POCs) and AFMC/A4RT.',
          'Attend meetings such as AFIMSC quarterly meetings, DLOG, TMTS and NDTA to look for opportunities to advocate change to policies and directives.',
          'Prepare and research! Familiarize yourself with the existing policies and directives. Research best practices, industry standards, and successful transformations in similar contexts.',
          'Clearly express your thoughts and ideas. Use concise and articulate language to convey your points. Foster an environment where all participants feel comfortable expressing their opinions.',
          'Stay informed about developments in the career field, regulatory changes, and external factors that may impact policy transformation efforts. AF publications are due for reverification every four years. To submit a change request, follow the instructions in TTG 1, Utilize and Interpret Appropriate Publications (E).',
          'Offer constructive feedback on proposed policy transformations. Focus on solutions and improvements rather than solely pointing out issues.',
          'By actively participating in working groups, you contribute to the collaborative effort of transforming 2T0 policies and directives, ultimately driving positive change within the career field.',
        ] },
      ],
      exercises: [
        'Select a process in special handling (e.g., classifieds, hazmat, NWRM). Develop a training plan and brief your team.',
        'Explain why utilizing CPI measures is important.',
        'Explain ways to participate in working groups and advocate for policy change.',
      ] },
  ] },
};
