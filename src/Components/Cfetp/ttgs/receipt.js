// Receipt Operations Task Training Guides (Attachment 5, TTGs 31-33), transcribed from the TTG
// documents. Same shape as ./inbound.js. TTG 32's flowchart and CONHIST screenshot are carried
// as text. Every line item matches the 2026 STS.

const NOTES = 'This lesson plan is designed for hands-on training (demonstration-performance). Traffic Management missions are different from station to station; training sessions may or may not easily lend themselves to hands-on training. Therefore, it is imperative that trainers demonstrate, document, and verify training using a variety of hands-on and scenario-based techniques to achieve the desired proficiency prior to signing the member\'s training records. For the purpose of this TTG, the term "publication" refers to any written document such as DAFI, pamphlet, manual, or technical order.';
const TIMELINE = 'Trainer will establish a timeline for completing the required training with the trainee.';
const range = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}.${from + i}`);

const conhist = { title: 'Manual Shipment Recovery Using CONHIST (CMOS screen callout reproduced in the TTG)', sections: [
  { heading: 'Consolidated History (CONHIST) window', items: [
    'CMOS users are now required to use the Consolidated History (CONHIST) window to manually recover from Degraded Ops.',
    'Using CONHIST ensures the correct ship date is used to record shipments, and prevents CMOS from sending bogus ITV data to IGC.',
    'The Small Parcel process is not authorized for recovery from degraded ops.',
  ] },
  { heading: 'Steps', ordered: true, items: [
    'From within CMOS, enter the Consolidated History window.',
    'Cancel the query and input the data for each shipment moved during the outage.',
    'Capture shipment data for both Inbound (I) and Outbound (O) shipments.',
    'Complete all known fields. DATE SHIPPED = date the TSP departed the installation. DATE RECEIVED = date received by the TSP.',
  ] },
  { heading: 'Notes', items: [
    'TMR Remarks: enter the name of the individual making the CONHIST entry.',
    'Indicators are mandatory for shipments requiring a Transportation Protective Service (TPS).',
    'T-9 Miscellaneous is mandatory for shipments that required Hazardous Material Certification.',
  ] },
] };

export const receiptTtgs = {
  31: { file: '31. Receipt Operations Basic', printed: '5.5.1.1. – 5.5.1.8.', lessons: [
    { id: 'ttg31-receipt', level: 'Basic', title: 'Receipt Process', printed: '5.5.1.1. – 5.5.1.8.', tasks: range('5.5.1', 1, 8), page: 3,
      prerequisites: ['Trainee has no prerequisites.', TIMELINE], references: ['DAFI 24-602v2, Chapter 3 & Attachment 9'],
      outcome: 'Know how to review, analyze, complete and process source documents. Determine applicable system, elevate discrepancies, and move assets & process delivery within the appropriate system of record.', notes: NOTES,
      objectives: ['5.5.1.1. Review and analyze source document for applicable system', '5.5.1.2. Validate source document matches items received', '5.5.1.3. – 1.4. Complete source document/elevate discrepancies when beyond the scope of responsibility', '5.5.1.5. Use completed source documents to process receipt within established priorities', '5.5.1.6. Move receipted cargo to designated locations and within applicable systems', '5.5.1.7. Turn in documents to materiel management', '5.5.1.8. Process delivery in system'],
      steps: [
        { heading: 'Review and Analyze Source Document for Applicable System', ordered: true, items: [
          'Depending on your installation, your Inbound section may operate more than one Accountable Property System of Record (APSR) (e.g., CMOS, ILS-S, DPAS, ALIS, GATES).',
          'Using the source document, the Inbound Cargo technician must be able to determine the proper system(s) to use.',
          { text: 'When a shipment arrives, validate the source document. Source documents may consist of the following forms/documents:', items: ['DD Form 250', 'DD Form 1149', 'DD Form 1155, Order for Supplies or Services', 'DD Form 1348-1 or DD Form 1348-1A', 'ALIS SCM purchase order (PO)', 'Government/commercial furnished document'] },
          { text: 'Indicators to determine the appropriate APSR(s):', items: [
            'CMOS: With the exception of F-35 materiel, all shipments (MILSTRIP/Non-MILSTRIP), including in-transit cargo, will be processed in CMOS upon arrival. See DAFI 24-602v2 Chp 3 and Attachment 9.',
            'ILS-S: In addition to CMOS, property destined for the supply activity (MILSTRIP shipments) must be processed in ILS-S as well. See DAFI 24-602v2 Chp 3 and Attachment 9.',
            'Defense Property Accountability System (DPAS): Property marked with an (FE) Stock Record Account Number (SRAN) must be processed in DPAS and ILS-S (e.g., SRAN FE7050). See DAFI 24-602v2 chp 3 for additional information and system access.',
            'Autonomic Logistics Information System (ALIS): Used for F-35 parts and materiel only. Shipments will be processed IAW the Sustainment User Guide (SSUG) available within ALIS. See DAFI 24-602v2 chp 2. NOTE: Shipments processed in ALIS do not require input into CMOS.',
          ] },
        ] },
        { heading: 'Validate Source Document Matches Items Received', ordered: true, items: [
          'All shipments must be verified, and the source document must be checked against the physical asset to ensure the correct item is being receipted.',
          'Open shipping containers and compare stock number/part number, unit of issue, quantity, shelf life, type of cargo, and special handling on the source documents to the physical asset.',
          'Containers with a single line item (NSN) that are XB3 Expendability Recoverability and Reparability Category (ERRC) coded, or are technical specialist packaged items, and are properly marked and labeled IAW MIL-STD-129 are not required to be opened.',
          'Open ESD items at the ESD approved area. Containers with damage, or with marks and labels that do not match the source document, will be opened for further examination.',
          'If the item does not have a source document inside or outside of the container, further research will be required to identify the shipment.',
        ] },
        { heading: 'Complete Source Document/Elevate Discrepancies When Beyond the Scope of Responsibility', ordered: true, items: [
          { text: 'Once the validation process is accomplished, the source document must be annotated with the following:', items: ['Quantity and unit of issue received', 'Signature of the individual performing the validation process', 'Date & temporary location code (to easily locate when sorting/moving items)'] },
          'Any discrepancies or issues encountered during the receipt process that are beyond the technician\'s control must be escalated to the appropriate level of supervision or inspection authority.',
        ] },
        { heading: 'Use Completed Source Documents to Process Receipt Within Established Priorities, Move Receipted Cargo to Designated Locations and Within Applicable Systems, Turn In Documents to Materiel Management & Process Delivery in System', ordered: true, items: [
          { text: 'Use the completed source document to finalize receipt in the applicable system of record by:', items: ['Moving receipted cargo within applicable systems', 'Moving it physically to designated locations', 'Turning documents over to Materiel Management, Customer Support'] },
          'Process delivery in system.',
          'In unique situations where the customer directly receives custody of the property from TMO, the technician must confirm whether the customer can electronically sign for property in the applicable system of record.',
        ] },
      ],
      exercises: [
        'Explain the process of using the source document to determine the system of record.',
        'Demonstrate processing a MILSTRIP shipment using the appropriate systems.',
        'Review DAFI 24-602v2 para 2.21. Explain the importance of inputting shipment information into CMOS and ILS-S.',
        'Explain when you would process shipments in DPAS & ALIS.',
        'Demonstrate validating physical asset(s) against the matching source document(s).',
        'Demonstrate completing the source document based on the physical assets received.',
        'Articulate the proper actions to take if you encounter discrepancies beyond your control.',
        'Demonstrate the ability to turn in documents to Materiel Management.',
        'Demonstrate the ability to process delivery in the system of record.',
      ] },
  ] },

  32: { file: '32. Receipt Operations Intermediate', printed: '5.5.2.1. – 5.5.2.8.', lessons: [
    { id: 'ttg32-intermediate', level: 'Intermediate', title: 'Receipt Operations', printed: '5.5.2.1. – 5.5.2.8.', tasks: range('5.5.2', 1, 8), page: 3,
      prerequisites: ['Complete Basic requirements.', TIMELINE],
      references: ['DAFI 24-602v2, Chapter 1 & Attachment 9', 'DAFI 23-101, Chapter 1 & Chapter 5', 'DAFMAN 23-122', 'AFH 23-123V2PT2', 'CMOS Emergency Manual', 'ILS-S User Manual', 'Degraded Operations local procedures'],
      outcome: 'Know how to collaborate with the LGRM inspection section to verify serviceability, be able to perform research on discrepancies to determine solutions, be able to perform reject monitor responsibilities. Lastly, perform post-post operations and recovery procedures.', notes: NOTES,
      objectives: ['5.5.2.1. Receive Limited Inspector training and is appointed in writing', '5.5.2.2. Collaborate w/the Inspection Section to verify serviceability and confirm accuracy', '5.5.2.3. Notify Office of Responsibility f/unresolved discrepancies that require fully qualified inspectors', '5.5.2.4. Perform research on discrepancies to determine solutions', '5.5.2.5. Resolve discrepancies with customer service', '5.5.2.6. Perform reject monitor responsibilities', '5.5.2.7. Perform post-post operations', '5.5.2.8. Execute degraded operations recovery procedures'],
      steps: [
        { heading: 'Receive Limited Inspector Training and Is Appointed in Writing', ordered: true, items: [
          { text: 'To become a Limited Inspector, you must be:', items: ['Nominated by the Transportation Officer', 'Appointed in writing', 'Trained by the LRS Chief Inspector'] },
          'Limited Inspectors will execute and perform duties IAW DAFI 24-602v2, A9.3.2.2.1.',
          { text: 'Duties of a Limited Inspector consist of:', items: ['Verifying materiel received matches the source document', 'Submitting supply discrepancy reports', 'Identifying shelf-life items for base POCs and ensuring items are not expired', 'Segregating hazardous materials from general cargo'] },
        ] },
        { heading: 'Collaborate With the Inspection Section to Verify Serviceability and Confirm Accuracy', ordered: true, items: [
          'If a shipping container arrives damaged, Receiving will contact the Inspection Section for a serviceability determination.',
          { text: 'Receiving will also coordinate with the Inspection Section for the following:', items: ['Functional checks', 'Request for a technical specialist to perform a serviceability check for shelf-life items', 'Assets with partial unit of issue damage', 'All Local Purchase (LP) items', 'Unit of issue or stock number differs between the asset and the source document', 'Shipment is missing source documentation to determine asset identity and create a source document', 'Incomplete items, or items missing components'] },
          'When requesting assistance from the Inspection Section, Receiving will forward applicable documentation (e.g., warranty/guaranty paperwork, property, organizational refusal).',
          'During normal & degraded operations, Receiving will obtain a current copy of the suspect listing and forward property to the Inspection Section.',
        ] },
        { heading: 'Notify the Office of Responsibility for Unresolved Discrepancies That Require Fully Qualified Inspectors', ordered: true, items: [
          'When assets arrive damaged, in addition to contacting Inspections, Limited Inspectors should notify the office of responsibility when inspection is required. Review DAFI 24-602v2 for additional information.',
        ] },
        { heading: 'Perform Research on Discrepancies to Determine Solutions', ordered: true, items: [
          'While working in Receiving, you will receive cargo with discrepancies. When this occurs, you will be required to conduct research.',
          'Some issues can be resolved in the work center, but some will require the assistance of the Materiel Management Customer Support Liaison Element. That is why it is important to establish and maintain a good working relationship with Customer Support.',
          'To determine a solution, use the system of record to research discrepancies that occur within the receiving section.',
        ] },
        { heading: 'Resolve Discrepancies with Customer Support Liaison Element', ordered: true, items: [
          'You will work closely with Customer Support and other entities within Materiel Management to resolve discrepancies. Some of the common discrepancies you will deal with are Record Reversal and Correction (RRC) and rejects.',
          'RRC is when a transaction is performed incorrectly. The initiator will conduct research identifying all transactions affecting the RRC prior to processing.',
          'This information will be documented on the AF Form 13, Record Reversal & Correction Worksheet, and routed & signed by the appropriate approving officials prior to processing record reversal transactions. See DAFMAN 23-122 para 5.6 for additional instructions.',
          'Rejects can be resolved easily or require extensive work. AFH 23-123V2PT2 defines Reject Notices as: "If program edits detect an error during processing, the program is stopped. The reject program takes control of the Standard Base Supply System Automated Data System processing. At this point, the database records are restored to their condition at the start of the run, and a reject notice is printed."',
          'All rejects should be processed within 1 workday unless there are specific reasons that prohibit correction of the reject within that time.',
          'Traffic Managers can resolve common rejects; however, some rejects will require assistance from Customer Support. Refer to DAFI 24-602v2 Table A9.8 for additional information.',
        ] },
        { heading: 'Perform Reject Monitor Responsibilities', ordered: true, items: [
          'The Transportation Officer will appoint a 5-skill level to perform Reject Monitor duties. The appointed monitor will receive training from Materiel Management.',
          'When a reject occurs, it should be processed as soon as possible. Refer to AFH 23-123V2PT2 for general use, reject and management notices.',
          'Refer to DAFI 24-602v2 Table A9.8 for the most common reject codes. Reject codes not listed in the chart will require assistance from Customer Support.',
          'Actively engage with Customer Support to resolve rejects. Complete reject documentation and attach supporting documentation.',
        ] },
        { heading: 'Perform Post-Post Operations', ordered: true, items: [
          'A degraded operation condition exists when automated systems are inoperative or other circumstances significantly impede normal materiel management processing.',
          'Once per calendar year, the installation cargo activity will be required to participate in a degraded operations exercise. All appointed TM personnel must be trained to perform degraded operations.',
          { text: 'Coordinate with Materiel Management to review local procedures and obtain required listings:', items: ['MICAP board (identify MICAPs requiring the Inspection Section prior to manual cargo processing)', 'Offline flat files and DOR documentation. Create a text file to perform batch processing, which prevents individual post-post processing in ILS-S.'] },
          { text: 'During Phase I, ensure the team is aware of reference points to assist with manual processing procedures:', items: ['AFIMSC SharePoint', 'CMOS PMO SharePoint', 'TPPS PMO SharePoint', 'LTS'] },
          'Use manual processing for all cargo during the established timeframe by recording the date & time from when the cargo is delivered by the TSP and turned over to MM or the customer.',
          { text: 'Use the MICAP board and Due-In document to create a manual DD Form 1348-1A.', items: ['Attach copies to the property and move it to the temp location for Documented Cargo.', 'Suspense copies for the DO Team Chief and Document Control.'] },
        ] },
        { heading: 'Steps in Task Performance (flowchart in the TTG)', ordered: true, items: [
          'Work unit receives the MICAP board.',
          'Is the document number/NSN listed on the MICAP board? If no, stage the cargo. If yes, continue.',
          'Create the text file.',
          'Match the receipt to the materiel.',
          'Move the property to the temp location.',
          'Suspense the documentation; it awaits degraded ops recovery.',
          'Rejects? If yes, resolve the degraded ops reject. When there are no rejects, degraded operations are complete.',
        ] },
        { heading: 'Execute Degraded Operations Recovery Procedures', ordered: true, items: [
          'See DAFI 24-602v2 para 3.7.',
          { text: 'Execute Phase II recovery procedures by:', items: [
            'Ensuring the CMOS SA validates each DD Form 2875 prior to enabling user accounts',
            'All CMOS accounts enabled by 0800 on the ENDEX date',
            'All shipment data input into CMOS/ILS-S within 24 hrs to ensure accountability and ITV',
            'CMOS shipments processed through CONHIST (see the attachment below)',
            'Ensuring the SA provides AFIMSC the DO shipment listing within 3 Government Business Days of ENDEX',
            'Resolving any rejects or RRC',
          ] },
        ] },
      ],
      attachments: [conhist],
      exercises: [
        'Demonstrate TCN verification against the source document and shipping label.',
        'Demonstrate verifying materiel received matches the source document.',
        'Explain how to submit an SDR if discrepancies are discovered.',
        'Demonstrate researching and identifying shelf-life items.',
        'Describe the steps to take when a damaged shipping container arrives. Who do you contact?',
        'Explain how to coordinate organizational refusal items through the Inspection Section.',
        'Explain how to coordinate with the Inspection Section when the asset stock number or unit of issue does not match the source documentation.',
        'Demonstrate the ability to identify unserviceable (reparable) items received and coordinate with inspection for resolution.',
        'Demonstrate the ability to research discrepancies and determine solutions.',
        'Demonstrate the ability to resolve discrepancies (rejects, RRC, etc.) with Customer Support.',
        'Articulate the roles and responsibilities of the reject monitor.',
        'Demonstrate the ability to process an asset using post-post procedures.',
        'Explain recovery procedures for degraded operations.',
      ] },
  ] },

  33: { file: '33. Receipt Operations Advanced/Expert', printed: '5.5.3.1. – 5.5.3.2.; 5.5.4.1. – 5.5.4.3.', lessons: [
    { id: 'ttg33-advanced', level: 'Advanced', title: 'Receipt Operations', printed: '5.5.3.1. – 5.5.3.2.', tasks: range('5.5.3', 1, 2), page: 3,
      prerequisites: ['Complete Intermediate requirements.', TIMELINE],
      references: ['DAFI 24-602v2, Chapter 3 & Attachment 9', 'AFI 23-101, Materiel Management Policy', 'DAFMAN 23-122, Materiel Management Procedures', 'AFH 23-123, Materiel Management Handbook Volume One, Materiel Management Reference Information'],
      outcome: 'Be able to review and respond to Materiel Management reports and listings and ensure they are completed within established timelines.', notes: NOTES,
      objectives: ['5.5.3.1. Review and respond to reports and listings from Materiel Management f/status within established timelines', '5.5.3.2. Performs advanced analytics and data collections from ILS-S utilizing applicable transaction identifier codes (TRICS)'],
      steps: [
        { heading: 'Reviews and Responds to Reports and Listings from Materiel Management for Status Within Established Timelines', ordered: true, items: [
          { text: 'Common reports and listings you will see in the Receipt/Inbound section are:', items: ['Transportation Tracer Listing (TTL)', 'Reject Listing', 'Delinquent Document listing'] },
          'These reports and listings are used to track and monitor shipments when they become overdue or lost in the transportation channels.',
          'Each listing will be provided by the Customer Support Liaison. As the lead technician, you will ensure they are accomplished accurately & within the established timeframe.',
          'See DAFI 24-602v2, Chp 11 for TTL and Delinquent Document procedures.',
        ] },
        { heading: 'Performs Advanced Analytics and Data Collections from ILS-S Utilizing Applicable Transaction Identifier Codes (TRICS)', ordered: true, items: [
          'TRICS identify transactions within the supply system of record and indicate the purpose and use of the data as intended. A list of TRICS can be found in AFH 23-123V1.',
          'To collect data, access the ILS-S database or system to retrieve data using relevant TRICS to extract and interpret performance data.',
          'Once data is retrieved, analyze it to identify any trends and patterns.',
          'If there are negative KPIs, determine the root cause and develop a corrective action plan to prevent recurrence.',
        ] },
      ],
      exercises: [
        'Review DAFI 24-602v2 chp 11. Explain the purpose of the TTL and Delinquent Document listing. Per the DAFI, what is the prescribed completion date for the Delinquent listing?',
        'Review AFH 23-123V1 and explain the purpose of TRICS. Demonstrate pulling data from ILS-S using TRICS.',
      ] },
    { id: 'ttg33-expert', level: 'Expert', title: 'Receipt Operations', printed: '5.5.4.1. – 5.5.4.3.', tasks: range('5.5.4', 1, 3), page: 5,
      prerequisites: ['Complete Advanced requirements.', TIMELINE],
      references: ['DAFI 24-602v2', 'AFI 23-101, Materiel Management Policy', 'CMOS Emergency Manual', 'ILS-S User Manual', 'Traffic Management local procedures', 'Degraded Operations local procedures'],
      techniques: ['Establishing relationships with organizations/units'],
      outcome: 'Be able to perform trend analysis to identify reoccurring issues, collaborate with Materiel Management to plan/develop degraded operations procedures and advocate TM priorities in working groups.', notes: NOTES,
      objectives: ['5.5.4.1. Perform trend analysis to identify reoccurring issues for action', '5.5.4.2. Collaborate w/Materiel Management (MM) to develop Degraded Ops procedures', '5.5.4.3. Participate in Working Groups to Advocate f/Traffic Management (TM) priorities'],
      steps: [
        { heading: 'Perform Trend Analysis to Identify Reoccurring Issues for Action', ordered: true, items: [
          'As a Receiving Expert, performing trend analysis to identify reoccurring issues enables the work center to move from reactive problem-solving to proactive & preventive measures, enhancing operational efficiency.',
          { text: 'Performing trend analysis is crucial for the following reasons:', items: ['Identifies problems & root cause', 'Provides proactive solutions', 'Enhances efficiency and customer satisfaction'] },
          { text: 'There are several ways to perform trend analysis. Examples:', items: [
            'Reviewing data in CMOS/ILS-S (ensure personnel are processing within both systems). AFIMSC also sends out a monthly report with this data. Analyze data to ensure compliance.',
            'Review KSD. Ensure personnel are retaining and filing required documentation.',
            'Ensure DAF Form 4388s are completed accurately.',
            'Examine listings such as Delinquent Documents, SDL, TTL, R59, etc., to verify up-to-date statuses are furnished and look for reoccurring trends.',
            'Review current and historical QA/Compliance Inspection write-ups.',
          ] },
          'Once issues have been identified, determine the root cause. If it is due to lack of training, develop a plan to enhance the skills and knowledge of all workers.',
          'If the issue exists due to current processes, get with your team to revise or create clear standard operating procedures.',
          'After implementing new strategies, monitor and track KPIs to ensure the new plan is working, standards are adhered to, and the recurrence of errors or defects is minimized.',
        ] },
        { heading: 'Collaborate w/Materiel Management to Develop Degraded Operations (DO) Procedures', ordered: true, items: [
          'The DO exercise supports the National Defense Strategy, which recognizes that resilient and agile logistics is a key capability which must be modernized to build a more lethal force.',
          'Once per calendar year, TM in conjunction with MM will conduct a joint CMOS/ILS-S DO exercise.',
          'Once a date for DO is confirmed, begin coordinating with the MM DO Flight/Team Chief to ensure zero interruptions of cargo movement operations.',
          'Coordinate with MM to appoint/discuss the DO control team and review in-place procedures. See AFI 23-101, para 2.5 for more information.',
          'During DO, keep constant communication with MM. NOTE: If the DO exercise is affecting the real-world mission, the Sq/CC or equivalent may submit an exemption justification to AFIMSC.',
        ] },
        { heading: 'Participate in Working Groups to Advocate for Traffic Management Priorities', ordered: true, items: [
          'Traffic Management (TM) is a customer service organization. To enhance mission effectiveness, building relationships with our mission partners is key.',
          { text: 'Establishing partnerships and participating in working groups is significant for several reasons:', items: ['Creates a collaborative & networking environment', 'Provides different perspectives', 'Opportunity to advocate and influence', 'Problem solving', 'Innovation'] },
          'Participating in working groups to champion TM priorities creates avenues for understanding and addressing challenges. For instance, establishing a relationship with the maintenance organization can yield advantages. As an advocate for TM, attending maintenance production meetings presents a chance to offer visibility into the installation\'s Inbound/Receiving process and provide status updates of crucial cargo. Additionally, the insight gained from these meetings enables you to relay the maintenance perspective to your team, aiding them in recognizing their contribution to the mission.',
          'An additional example involves establishing a professional relationship within LRS/APS (e.g., MM, Ground Transportation and Air Transportation). Depending on your location, we work frequently with these entities. To effectively address issues, fostering a constructive partnership with your counterpart(s) is key. Engage in collaborative efforts to innovate processes that can improve transportation & supply chain operations.',
          'Once a mission partnership has been established, develop MOUs, or include collaborative ideas in the TM local procedures for continuity purposes. NOTE: see TTG 1, Utilize and Interpret Appropriate Publications, for local procedure instructions.',
        ] },
      ],
      exercises: [
        'Review QA write-ups from the last 6 months. If applicable, identify any reoccurring trends.',
        'If reoccurring trends exist, explain how you would rectify the issue.',
        'Determine the next degraded operations exercise for your installation. Identify the POC from Materiel Management and ensure personnel are properly trained.',
        'Review local degraded operations procedures. Explain the procedures for your installation.',
        'Review TM Local Procedures. Identify established partnerships with units/organizations from your installation. Ensure POCs are correct and establish a working relationship with those units/organizations.',
      ] },
  ] },
};
