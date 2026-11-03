// Ready-to-run practice scenarios. Each one is a situation the trainer stages with sample
// documents, the discrepancies planted in it, the actions the trainee should take, and an answer
// guide for the evaluator. Every expected action and answer restates the TTG text (or a
// publication the TTG cites) named in its `source`; nothing here adds a rule of its own.
// `step` names the TTG step heading an action exercises, so missed steps can point to scenarios.
// All names, DoDAACs, TCNs, NSNs, and document numbers are fictitious training data.

export const FICTITIOUS = 'Training sample. All names, DoDAACs, TCNs, NSNs, and numbers are fictitious.';

export const SCENARIOS = [
  {
    id: 'inbound-short-damaged', title: 'Short and damaged truck delivery', tasks: ['5.3.1.1', '5.3.1.3', '5.3.1.4'],
    setup: ['Stage four cartons on the dock, or four boxes marked as cartons. Remove one and crush a corner of another.', 'Print the commercial bill of lading below. Play the driver yourself.'],
    situation: 'A commercial truck arrives at Inbound Cargo. The driver hands over a commercial bill of lading (CBL), says "Four pieces, all good," and asks for a signature so they can leave.',
    documents: [{ title: 'Commercial bill of lading', rows: [
      ['CBL number', 'TRN-000417'], ['Carrier', 'Training Freight Lines'], ['Consignee', 'FB9990, Inbound Cargo'], ['TCN', 'FB99906001X001XXX'],
      ['Pieces', '4 cartons'], ['Weight', '212 lb'], ['Driver signature', '(blank, to be completed at delivery)'],
    ] }],
    discrepancies: [
      { where: 'Piece count', what: 'Three cartons are on the truck; the CBL shows four.' },
      { where: 'Carton condition', what: 'One carton has a crushed corner.' },
    ],
    expected: [
      { step: 'Offload and Visually Inspect Property for Discrepancies', action: 'Inspects every piece for damage, missing pieces, or misdirection before signing or accepting anything.', source: 'TTG 25, Offload and Visually Inspect, step 1' },
      { step: 'Verify Piece Count Against Movement Document (CBL, GBL, truck manifest, consolidations, etc.)', action: 'Counts the pieces against the CBL and finds 3 of 4.', source: 'TTG 25, Verify Piece Count; DAFI 24-602v2 para A9.3.2' },
      { step: 'Offload and Visually Inspect Property for Discrepancies', action: "Annotates the shortage and the damage on the carrier's documents, has the driver print and sign their full name and date next to each, then signs and dates as in-checker.", source: 'TTG 25, Offload and Visually Inspect, step 2' },
      { step: 'In-check Shipment Documents into System of Record', action: 'In-checks the shipment in CMOS using the movement document, recording what was actually received.', source: 'TTG 25, In-check Shipment Documents' },
    ],
    questions: [
      { q: 'The driver is in a hurry. Can you sign first and note the problems afterward?', a: 'No. Inspect and annotate discrepancies before signing for and accepting the shipment.', source: 'TTG 25, Offload and Visually Inspect, step 1' },
      { q: 'Who signs next to the discrepancy notes?', a: 'The carrier prints and signs their full name and dates next to each discrepancy; the in-checker signs and dates as well.', source: 'TTG 25, Offload and Visually Inspect, step 2' },
      { q: 'What happens to the shortage and damage after in-check?', a: 'They become a Transportation Discrepancy Report (TDR) against the TSP: see the "Turn a delivery discrepancy into a TDR" scenario.', source: 'TTG 26, Initiate TSP Discrepancies via TDR' },
    ],
  },
  {
    id: 'inbound-segregate-ciic', title: 'Segregate a mixed delivery by classification', tasks: ['5.3.1.2'],
    setup: ['Print the three DD Form 1348-1A extracts below and tape one to each of three boxes. Leave the boxes themselves unmarked.'],
    situation: 'Three boxes arrive on the same delivery. None of the boxes has security markings. The trainee must stage them before in-check.',
    documents: [
      { title: 'Box A: DD Form 1348-1A extract', rows: [['Document number', 'FB9990-6001-0101'], ['NSN', '5999-00-000-0001'], ['Block 9 (PS code / CIIC)', 'S']] },
      { title: 'Box B: DD Form 1348-1A extract', rows: [['Document number', 'FB9990-6001-0102'], ['NSN', '5810-00-000-0002'], ['Block 9 (PS code / CIIC)', '9']] },
      { title: 'Box C: DD Form 1348-1A extract', rows: [['Document number', 'FB9990-6001-0103'], ['NSN', '5340-00-000-0003'], ['Block 9 (PS code / CIIC)', 'U']] },
    ],
    discrepancies: [{ where: 'Box markings', what: 'No box shows its classification. Only the documents do, so a trainee who reads the boxes will stage all three together.' }],
    expected: [
      { step: 'Segregate By Priority and Classification', action: 'Treats all three as TPS items until their security classification is determined.', source: 'TTG 25, Segregate, step 1' },
      { step: 'Segregate By Priority and Classification', action: 'Reads block 9 on each document and looks up the code: S = Secret, 9 = Controlled Cryptographic Item (CCI), U = Unclassified.', source: 'TTG 25, CIIC table (CDTS Vol 10, Table 61)' },
      { step: 'Segregate By Priority and Classification', action: 'Stages each box separately by security classification and transportation priority.', source: 'TTG 25, Segregate, step 2' },
    ],
    questions: [
      { q: 'Why can you not tell the classification from the boxes?', a: 'Classified and protected cargo carries no markings showing its classification; the shipping document determines it.', source: 'TTG 28, Classified Cargo and Protected Cargo' },
      { q: 'Where does the Box B code come from, and what does it mean?', a: 'Block 9 of the DD Form 1348-1A; CIIC 9 identifies a Controlled Cryptographic Item (CCI).', source: 'TTG 25, CIIC table' },
    ],
  },
  {
    id: 'receipt-short-quantity', title: 'Receipt with a quantity short', tasks: ['5.5.1.2', '5.5.1.3', '5.5.1.4'],
    setup: ['Put 8 identical small items in a box. Attach the DD Form 1348-1A extract below to the outside.'],
    situation: 'A box for the supply activity reaches Receiving. The trainee opens it to validate the contents against the source document.',
    documents: [{ title: 'DD Form 1348-1A extract', rows: [
      ['Document number', 'FB9990-6001-0201'], ['NSN', '5305-00-000-0004'], ['Unit of issue', 'EA'], ['Quantity', '10'], ['Item nomenclature', 'SCREW, CAP (training item)'],
    ] }],
    discrepancies: [{ where: 'Quantity', what: '8 items are in the box; the document says 10 EA.' }],
    expected: [
      { step: 'Validate Source Document Matches Items Received', action: 'Opens the container and compares stock number, unit of issue, quantity, shelf life, type of cargo, and special handling against the document.', source: 'TTG 31, Validate Source Document, steps 1-2' },
      { step: 'Complete Source Document/Elevate Discrepancies When Beyond the Scope of Responsibility', action: 'Annotates the source document with the quantity and unit of issue actually received (8 EA), their signature, and the date and temporary location code.', source: 'TTG 31, Complete Source Document, step 1' },
      { step: 'Complete Source Document/Elevate Discrepancies When Beyond the Scope of Responsibility', action: 'Escalates the shortage to the appropriate level of supervision or inspection authority instead of resolving it alone.', source: 'TTG 31, Complete Source Document, step 2' },
    ],
    questions: [
      { q: 'What three things must you write on the source document after validating?', a: 'Quantity and unit of issue received; the signature of the person validating; and the date and temporary location code.', source: 'TTG 31, Complete Source Document, step 1' },
      { q: 'When may you leave a container unopened?', a: 'A single-line-item (one NSN) container that is ERRC-coded XB3 or technical-specialist packaged, and properly marked and labeled IAW MIL-STD-129. Open damaged containers, and any whose marks do not match the document.', source: 'TTG 31, Validate Source Document, steps 3-4' },
    ],
  },
  {
    id: 'receipt-which-system', title: 'Which system of record?', tasks: ['5.5.1.1'],
    setup: ['Print the three source document extracts below. No physical cargo is needed.'],
    situation: 'Three shipments arrive at the same time. For each, the trainee states which accountable property system(s) of record it is processed in.',
    documents: [
      { title: 'Shipment 1: DD Form 1348-1A extract', rows: [['Type', 'MILSTRIP requisition for the supply activity'], ['Document number', 'FB9990-6001-0301']] },
      { title: 'Shipment 2: DD Form 1149 extract', rows: [['Ship to', 'SRAN FE9990 (equipment account)'], ['Document number', 'FB9990-6001-0302']] },
      { title: 'Shipment 3: ALIS purchase order extract', rows: [['Item', 'F-35 part (training item)'], ['Source document', 'ALIS SCM purchase order']] },
    ],
    discrepancies: [{ where: 'Shipment 3', what: 'The trap: trainees often in-check everything in CMOS by habit.' }],
    expected: [
      { step: 'Review and Analyze Source Document for Applicable System', action: 'Shipment 1: CMOS and ILS-S (MILSTRIP property for the supply activity goes in both).', source: 'TTG 31, Review and Analyze, step 4 (CMOS, ILS-S)' },
      { step: 'Review and Analyze Source Document for Applicable System', action: 'Shipment 2: DPAS and ILS-S (property marked with an FE SRAN).', source: 'TTG 31, Review and Analyze, step 4 (DPAS)' },
      { step: 'Review and Analyze Source Document for Applicable System', action: 'Shipment 3: ALIS only, per the Sustainment User Guide; no CMOS input.', source: 'TTG 31, Review and Analyze, step 4 (ALIS) and NOTE' },
    ],
    questions: [{ q: 'Which shipments are processed in CMOS?', a: 'All shipments, MILSTRIP and non-MILSTRIP, including in-transit cargo, except F-35 materiel processed in ALIS.', source: 'TTG 31, Review and Analyze, step 4' }],
  },
  {
    id: 'packaging-incheck-docs', title: 'Customer turn-in with document problems', tasks: ['5.1.1.1', '5.1.1.2', '5.1.1.4', '5.1.1.5'],
    setup: ['Label a box with the NSN 1680-00-000-0006. Attach the DD Form 1348-1A extract below, which shows a different NSN.'],
    situation: 'A customer brings an item to Packaging and Crating for shipment and hands over the DD Form 1348-1A.',
    documents: [{ title: 'DD Form 1348-1A extract', rows: [
      ['TCN', 'FB99906001X005XXX'], ['NSN', '1680-00-000-0005'], ['TAC', '(blank)'], ['DEMIL code', 'D'], ['Block 4 (Mark for)', '(blank)'],
      ['Block 9 (PS code / CIIC)', 'U'], ['Type cargo code', '(entered)'],
    ] }],
    discrepancies: [
      { where: 'TAC', what: 'The Transportation Account Code is missing.' },
      { where: 'NSN', what: 'The asset is labeled 1680-00-000-0006; the document says ...0005.' },
      { where: 'DEMIL code D', what: 'Any DEMIL code other than A or Q makes the item ITAR-controlled, so block 4 must read "ITAR Shipment". It is blank.' },
    ],
    expected: [
      { step: 'Verify Validity of Shipping Documents', action: 'Checks the document for TCN, NSN, TAC, DEMIL, PS/CIIC, and type cargo code, and finds the TAC missing.', source: 'TTG 11, Verify Validity, step 2' },
      { step: 'Verify Item(s) Matches Shipping Document', action: 'Matches the document to the asset and finds the NSN does not match.', source: 'TTG 11, Verify Item(s) Matches, steps 1-2' },
      { step: 'Verify DEMIL Codes to Properly Identify Articles Governed by the USML/ITAR', action: 'Identifies DEMIL D as ITAR-controlled and that block 4 must be marked "ITAR Shipment".', source: 'TTG 11, Verify DEMIL Codes, step 1' },
      { step: 'Determine When to Elevate In-Checking Discrepancies', action: 'Does not in-check. Elevates the document and asset discrepancies to the supervisor or trainer.', source: 'TTG 11, Determine When to Elevate' },
    ],
    questions: [
      { q: "What if you cannot confirm an item's DEMIL code?", a: 'Treat it as on the USML and handle it as ITAR-controlled.', source: 'TTG 11, Verify DEMIL Codes, step 2' },
      { q: 'Who resolves an in-checking discrepancy?', a: "The trainee elevates it to their supervisor or trainer, who verifies it and, if valid, takes the steps to resolve it.", source: 'TTG 11, Determine When to Elevate' },
    ],
  },
  {
    id: 'special-identifiers', title: 'Spot the special handling cargo', tasks: ['5.4.1.3', '5.4.1.4', '5.4.1.5'],
    setup: ['Print the four document extracts below. Use plain, unmarked boxes for all four.'],
    situation: 'Four shipments are waiting in the cargo area. The trainee identifies which need special handling, what kind, and how to store them.',
    documents: [
      { title: 'Item 1: DD Form 1348-1A extract', rows: [['Block 8 (type cargo code)', 'A'], ['Block 9 (PS code)', 'U']] },
      { title: 'Item 2: DD Form 1149 extract', rows: [['Block 4b', 'Marked hazardous'], ['Package labels', 'Class 3 flammable liquid']] },
      { title: 'Item 3: DD Form 1348-1A extract', rows: [['Stamp', 'SECRET (red)'], ['Block 9 (PS code)', 'E']] },
      { title: 'Item 4: DD Form 1348-1A extract', rows: [['Block 9 (PS code)', '7'], ['Box markings', 'None']] },
    ],
    discrepancies: [{ where: 'Items 3 and 4', what: 'Nothing on the boxes shows they are special. Only the documents do.' }],
    expected: [
      { step: 'Hazardous Materiel', action: 'Item 1: type cargo code A = Radioactive, so HAZMAT. Item 2: DD Form 1149 block 4b and the hazard class label mark it HAZMAT.', source: 'TTG 28, Hazardous Materiel (AFH 23-123v2PT2 Table 8.97)' },
      { step: 'Classified Cargo', action: 'Item 3: classified. The documents are stamped SECRET, and PS code E is Secret - Cryptologic.', source: 'TTG 28, Classified Cargo (CDTS Vol 10, Table 61)' },
      { step: 'Protected Cargo', action: 'Item 4: protected cargo. PS code 7 is sensitive.', source: 'TTG 28, Protected Cargo' },
      { step: 'Segregates and Stores Cargo as Required', action: 'Segregates and stores each by security classification, hazard class, and transportation priority.', source: 'TTG 28, Segregates and Stores (DAFI 24-602v2 para 3.2.2.4)' },
    ],
    questions: [
      { q: 'At the end of the shift, what do you record for the classified and sensitive items awaiting receipt?', a: 'TCN, TP, piece count, and consignor information on the MSL; at the start of the next shift, physically compare on-hand items to that listing.', source: 'TTG 28, Performs Required Inventories (DAFI 24-602v2 para 3.6.1)' },
    ],
  },
  {
    id: 'special-4388-two-person', title: 'DAF Form 4388 with one person signing twice', tasks: ['5.4.1.8', '5.4.3.3'],
    setup: ['Prepare a blank DAF Form 4388. Tell the trainee the in-checker today is SrA Lee (fictitious).'],
    situation: 'A classified shipment arrives. SrA Lee in-checks it, then fills in the certifier block with their own name, because "the certifier is at lunch."',
    documents: [{ title: 'DAF Form 4388 (as completed)', rows: [['In-checker', 'SrA Lee'], ['Certifier', 'SrA Lee'], ['Shipment', 'Classified, TCN FB99906001X007XXX']] }],
    discrepancies: [{ where: 'Certifier block', what: 'The in-checker and the certifier are the same person.' }],
    expected: [
      { step: 'Complies with and Completes Required DAF Form 4387/4388 and Other Associated Forms for Inbound/Outbound Cargo', action: 'Identifies that the 4388 is a two-person check: the in-checker and certifier inspect jointly and both sign.', source: 'TTG 28, DAF Form 4387/4388, step 4' },
      { step: 'Complies with and Completes Required DAF Form 4387/4388 and Other Associated Forms for Inbound/Outbound Cargo', action: 'States that the person performing the in-check cannot also certify, and gets a qualified certifier.', source: 'TTG 28, DAF Form 4387/4388, step 5 (DAFI 24-602v2 para 4.8.2)' },
    ],
    questions: [
      { q: 'Who may certify the DAF Form 4387 and 4388?', a: 'A 2T0 with a primary AFSC of 2T071, or a military, civilian, or contractor supervisor or equivalent level, and never the same person who packed or in-checked.', source: 'TTG 28, DAF Form 4387/4388, step 5 (DAFI 24-602v2 para 4.8.2)' },
      { q: 'Which paragraphs govern completing the 4388?', a: 'DAFI 24-602v2 para 3.2.5, AFI 20-110 para 6.8.1 (now DAFMAN 20-110; check the paragraph), and DTR Part II, Chapter 205, para C.', source: 'TTG 28, DAF Form 4387/4388, step 3' },
    ],
  },
  {
    id: 'repship-no-ack', title: 'Outbound REPSHIP with no acknowledgement', tasks: ['5.4.1.10', '5.4.2.6'],
    setup: ['Use the Display REPSHIP description below, or a CMOS training account if your site has one.'],
    situation: 'A sensitive shipment left on a DD Form 1149 this morning. Two business hours later, the Display REPSHIP screen shows no acknowledgement from the destination.',
    documents: [{ title: 'Display REPSHIP (as shown)', rows: [['I/O', 'O'], ['TCN', 'FB99906001X008XXX'], ['Release date', 'Today'], ['EDD', 'In 3 days'], ['Closed date', '(blank)'], ['User ID (acknowledgement)', '(none)']] }],
    discrepancies: [
      { where: 'REPSHIP indicator', what: 'Shipped on a DD Form 1149: the REPSHIP indicator had to be set by hand. Ask whether it was.' },
      { where: 'Acknowledgement', what: 'Nothing after two business hours.' },
    ],
    expected: [
      { step: 'Complete Inbound/Outbound REPSHIP Procedures', action: 'Confirms the REPSHIP indicator was set manually, since DD Form 1149 shipments are not set automatically.', source: 'TTG 28 attachment, Automated REPSHIP, Outbound step 1a' },
      { step: 'Complete Inbound/Outbound REPSHIP Procedures', action: 'Generates and faxes a paper REPSHIP or emails the destination, follows up with a confirming call, and records the call in the POC and REMARKS fields.', source: 'TTG 28 attachment, Outbound step 6' },
      { step: 'Complete Inbound/Outbound REPSHIP Procedures', action: 'Reports the acknowledgement failure to the CMOS FAB within one business day.', source: 'TTG 28 attachment, Outbound step 6' },
    ],
    questions: [
      { q: 'The EDD passes with no CLOSED DATE. What now?', a: 'Call the destination and initiate tracer action; record the call in POC and REMARKS.', source: 'TTG 28 attachment, Outbound step 7' },
      { q: 'How does the destination close the REPSHIP when it is automated?', a: 'In-checking the shipment in CMOS on receipt sends the transaction that clears the origin suspense.', source: 'TTG 28 attachment, Inbound (automated) step 3' },
    ],
  },
  {
    id: 'outbound-label-priority', title: 'Plan the stack and label the boxes', tasks: ['5.2.1.2', '5.2.1.3', '5.2.1.11'],
    setup: ['Prepare two shipment documents (one priority, one general cargo) and two boxes. Put the wrong TCN on one box\'s shipping label.'],
    situation: 'Two shipments are ready for planning. After processing, the trainee prints the labels and applies them.',
    documents: [
      { title: 'Shipment 1', rows: [['TCN', 'FB99906001X009XXX'], ['Type', 'Priority (999 in RDD)']] },
      { title: 'Shipment 2', rows: [['TCN', 'FB99906001X010XXX'], ['Type', 'General cargo']] },
      { title: 'Label printed for the Shipment 2 box', rows: [['TCN on label', 'FB99906001X009XXX']] },
    ],
    discrepancies: [{ where: 'Shipment 2 label', what: "The label's TCN belongs to Shipment 1." }],
    expected: [
      { step: 'Segregate Documentation / Perform Shipment Planning Actions for Priority / General Cargo Shipments', action: 'Determines transportation priority from DAFI 24-602V2 Table 2.1, segregates the documents, and processes the priority shipment in CMOS first.', source: 'TTG 19, Segregate Documentation, steps 3-5' },
      { step: 'Print and Apply Labels to Shipment', action: 'Before affixing, checks that the TCN on the box document matches the label, catches the mismatch, and does not apply it.', source: 'TTG 19, Print and Apply Labels, step 4' },
      { step: 'Print and Apply Labels to Shipment', action: 'Places labels on the outer surface IAW MIL-STD-129.', source: 'TTG 19, Print and Apply Labels, step 5' },
    ],
    questions: [{ q: 'Which shipments does the planner process first?', a: 'Priority shipments, then general cargo.', source: 'TTG 19, Segregate Documentation, step 5' }],
  },
  {
    id: 'passenger-orders', title: 'Travel orders that are not ready', tasks: ['4.1.1.1', '4.1.1.3'],
    setup: ['Use a sanitized sample travel order, or the extract below.'],
    situation: 'A member asks to book TDY travel leaving tomorrow and hands over their orders.',
    documents: [{ title: 'Travel order extract', rows: [
      ['Name / rank', 'SSgt Avery Training'], ['Order number', 'TO-000123'], ['Issuing headquarters', '999th Training Squadron'],
      ['Signature / stamp of approving official', '(blank)'], ['Line of accounting / CIC', '(entered)'], ['Date issued', '(entered)'], ['Type of order', 'TDY'],
    ] }],
    discrepancies: [{ where: 'Approving official', what: 'The order has no signature or stamp from the approving official.' }],
    expected: [
      { step: 'Verify Order Validity', action: 'Checks name and rank, order number, issuing headquarters, AO signature or stamp, line of accounting/CIC, and date issued, and finds the signature missing.', source: 'TTG 2, Verify Order Validity, step 2' },
      { step: 'Verify Order Validity', action: 'Asks the customer to go back to the AO for correction or amendment before booking.', source: 'TTG 2, Verify Order Validity, NOTE' },
      { step: 'Review Types of Orders to Determine Applicable Travel Entitlements', action: 'Once valid, reviews the type of order, point of authorization, and accompanied status to brief entitlements.', source: 'TTG 2, Review Types of Orders, step 2' },
    ],
    questions: [{ q: 'Can travel begin before the order is issued?', a: 'The travel authorization must be issued before travel begins. In some cases the TMC may ticket on proper verbal, letter, or message authority with the AO\'s concurrence, as local procedures allow.', source: 'TTG 2, Verify Order Validity, step 3' }],
  },
  {
    id: 'pp-orders', title: 'PCS orders with an error', tasks: ['4.2.1.1', '4.2.1.2'],
    setup: ['Use a sanitized sample PCS order, or the extract below.'],
    situation: 'A member comes to Personal Property to set up a household goods shipment.',
    documents: [{ title: 'PCS order extract', rows: [
      ["Customer's name", 'TSgt Casey Training'], ['Rank / grade', 'TSgt / E-6'], ['SSN (last 4)', '0000 (does not match the ID card, which shows 0001)'],
      ['Funding (long line of accounting / SDN)', '(blank)'], ['Issuing authority', '999th Force Support Squadron'],
    ] }],
    discrepancies: [{ where: 'SSN', what: 'Does not match the member.' }, { where: 'Funding', what: 'No line of accounting or SDN.' }],
    expected: [
      { step: 'Verify Order Validity', action: "Validates name, rank/grade, SSN, funding, and issuing authority, and finds the SSN mismatch and missing funding.", source: 'TTG 5, Verify Order Validity, step 1' },
      { step: 'Verify Order Validity', action: 'Directs the customer back to the local Military Personnel Section for correction or amendment.', source: 'TTG 5, Verify Order Validity, NOTE' },
      { step: 'Analyze Travel Orders to Determine Entitlements', action: 'Once corrected, uses the order type to determine HHG, UB, POV, and NTS entitlements from DAFI 24-602v4, the PPCIG, or the JTR.', source: 'TTG 5, Analyze Travel Orders' },
    ],
    questions: [{ q: 'Who fixes an error on PCS orders?', a: 'The local Military Personnel Section, which corrects or amends the orders.', source: 'TTG 5, Verify Order Validity, NOTE' }],
  },
  {
    id: 'inbound-tdr', title: 'Turn a delivery discrepancy into a TDR', tasks: ['5.3.2.1', '5.3.2.2', '5.3.2.5'],
    setup: ['Run this after "Short and damaged truck delivery", using its annotated CBL. Have DIS access ready, or a blank DD Form 361.'],
    situation: 'The short and damaged delivery has been in-checked. The supervisor asks the trainee to report it against the carrier.',
    documents: [{ title: 'Annotated CBL (from the earlier scenario)', rows: [['CBL number', 'TRN-000417'], ['Annotation', '1 carton short; 1 carton crushed; signed and dated by driver and in-checker']] }],
    discrepancies: [{ where: 'Reporting', what: 'Nothing is planted; this tests the follow-through.' }],
    expected: [
      { step: 'Collect and Identify Transportation Discrepancies Information & Utilize CBL to Identify Carrier Infractions', action: 'Collects shipment and consignor information and the KSDs that support the claim, and uses the CBL to identify the carrier infraction.', source: 'TTG 26, Collect and Identify, steps 2-4' },
      { step: 'Initiate TSP Discrepancies via Transportation Discrepancy Report (TDR)', action: 'Initiates the TDR electronically in DIS, or manually on DD Form 361 if DIS is down.', source: 'TTG 26, Initiate TDR, steps 1-4 (DTR Part II, Ch 210 para E; Appendix I)' },
      { step: 'File Key Supporting Documents (KSD)', action: 'Files the KSDs IAW DAFI 24-602v2 para 3.4.2.', source: 'TTG 26, File KSD, step 3' },
    ],
    questions: [{ q: 'Where are the reporting procedures for the TDR package?', a: 'DTR Part II, Chapter 210, para F.', source: 'TTG 26, Communicate with Responsible Party, step 2' }],
  },
];

export const scenariosFor = id => SCENARIOS.filter(scenario => scenario.tasks.includes(id));
