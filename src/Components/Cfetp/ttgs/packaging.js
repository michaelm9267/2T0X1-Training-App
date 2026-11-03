// Packaging Operations Task Training Guides (Attachment 5, TTGs 11-18), transcribed from the TTG
// documents. Same shape as ./passenger.js. Several of these TTGs number their line items from an
// earlier STS; `tasks` holds the 2026 STS ids, matched by content, and `numbering` explains each
// difference. Where a TTG cites "DAFI 24-604v2" it means DAFI 24-602v2; those are corrected here.

const NOTES = 'This lesson plan is designed for hands-on training (demonstration-performance). Traffic Management missions are different from station to station; training sessions may or may not easily lend themselves to hands-on training. Therefore, it is imperative that trainers demonstrate, document, and verify training using a variety of hands-on and scenario-based techniques to achieve the desired proficiency prior to signing the member\'s training records. For the purpose of this TTG, the term "publication" refers to any written document such as DAFI, pamphlet, manual, or technical order.';
const TIMELINE = 'Trainer will establish a timeline for completing the required training with the trainee.';
const NO_PREREQ = 'Trainee has no prerequisites.';

export const packagingTtgs = {
  11: { file: '11. In-checking', printed: '5.1.1.1. – 5.1.1.6.', lessons: [
    { id: 'ttg11-incheck', level: 'Basic', title: 'In-checking', printed: '5.1.1.1. – 5.1.1.6.', tasks: ['5.1.1.1', '5.1.1.2', '5.1.1.3', '5.1.1.4', '5.1.1.5', '5.1.1.6'], page: 3,
      prerequisites: [NO_PREREQ, TIMELINE], references: ['DAFI 24-602V2', 'DOD 4500.9-R Part II'],
      outcome: 'Know how to validate shipping documentation, validate cargo received from customer, and utilize system of record to accomplish in-checking process.', notes: NOTES,
      objectives: ['5.1.1.1. Verify validity of shipping documents', '5.1.1.2. Verify item(s) matches shipping document', '5.1.1.3. Verify item(s) classifications and commodities', '5.1.1.4. Verify DEMIL codes to properly identify articles governed by the USML & ITAR', '5.1.1.5. Determine when to elevate in-checking discrepancies', '5.1.1.6. Operate system of record to in-check verified cargo'],
      steps: [
        { heading: 'Verify Validity of Shipping Documents', ordered: true, items: [
          { text: 'Trainee will validate source document and determine if it is one of the following:', items: ['DD FORM 1348-1A', 'DD FORM 1149 (produced via LTS)', 'DD FORM 250'] },
          { text: 'Trainee will confirm the shipping document contains the following information:', items: ['Transportation Control Number (TCN)', 'National Stock Number (NSN)', 'Transportation Account Code (TAC)', 'Demilitarization Code (DEMIL)', 'Physical Security (PS)/Controlled Inventory Item Code (CIIC)', 'Type Cargo code', 'Shipment Priority designator', 'Required Delivery Date (RDD)', 'Serial Numbers (if applicable)', 'SPI (if applicable)'] },
          'Trainee will verify the DODAACs and addresses.',
          'Lastly, trainee must ensure signatures are annotated in all required areas of the source document.',
        ] },
        { heading: 'Verify Item(s) Matches Shipping Document', ordered: true, items: [
          'Trainee will validate the asset by matching the information on the source documents with the detailed information on the asset.',
          'Trainee will ensure the NSN, condition codes and any additional documents (e.g., serial numbers) accompanying the shipment (e.g., DD Form 1387-2, DD Form 1384) match as well. NOTE: Piece count is not required unless the materiel is Expedited Handling Signal 999, Not Mission Capable Supply (NMCS), Mission Impaired Capability Awaiting Parts (MICAP), classified, and protected, or it is obvious the count differs from source document.',
        ] },
        { heading: 'Verify Item(s) Commodities and Classifications', ordered: true, items: [
          'Trainee will validate the commodities and classifications of the asset. Using the DD Form 1348-1A (block 6, 8, and 9), trainee will validate the National Motor Freight Classification (NMFC), type of cargo, and PS/CIIC. For non-MILSTRIP shipment, the shipper will validate the classification of the asset by annotating the type of the asset in description block (b) of DD Form 1149.',
          { text: 'For code listings, refer to TRANSCOM Reference Data Management (TRDM) and Federal Logistics Information System Cataloging Data and Transaction Standards Volume 10 Table 82:', items: ['DoD Unique Commodity Classification', 'Controlled Inventory Item Code', 'Water Cargo Code'] },
        ] },
        { heading: 'Verify DEMIL Codes to Properly Identify Articles Governed by the USML/ITAR', ordered: true, items: [
          "An asset is considered ITAR-controlled if it is a U.S. Munitions List (USML) item, which is determined by its assigned Demilitarization (DEMIL) code. Any DEMIL code other than 'A' or 'Q' designates an asset as ITAR-controlled. Consequently, the DD Form 1348-1A must be marked 'ITAR Shipment' in block 4. For non-MILSTRIP shipment, the customer must identify the applicable DEMIL code on DD Form 1149, using the official DEMIL listings for accurate classification. DEMIL code definitions can be found in DoD Manual 4160.28 Volume 2 Table 1.",
          "If the item's DEMIL code cannot be confirmed, it must be treated as though it is on the USML and handled as an ITAR-controlled asset.",
          'Trainee must be able to identify ITAR-controlled shipments and demonstrate a basic understanding of DEMIL codes and their associated descriptions.',
        ] },
        { heading: 'Determine When to Elevate In-Checking Discrepancies', ordered: true, items: [
          "When in-checking cargo, if there's a discrepancy with the cargo and/or the shipping document, (e.g., document does not have all the required information, document does not match the asset) the trainee should elevate the issue. Issues should be elevated to the trainee's supervisor or trainer.",
          'The supervisor or trainer will verify the issue and if valid, take the necessary steps to resolve the issue.',
        ] },
        { heading: 'Operate System of Record to In-Check Verified Cargo', ordered: true, items: [
          'According to DAFI 24-602V2, CMOS is the mandatory Transportation Management System for all Air Force Deployment and Distribution, Cargo Movement operations.',
          'CMOS provides total asset visibility, meaning once the asset has been in-checked, processed, and shipped it can be traced.',
          "It's important to input data into CMOS. The workload data entered is used as one of the variances to determine the 2T0 manpower standard.",
          "After validation of the shipment document & asset, log into system of record and in-check shipment(s) using the source document's TCN.",
        ] },
      ],
      exercises: [
        'Demonstrate the ability to identify the DD Form 1348-1A, DD Form 1149, and DD Form 250.',
        'Demonstrate the ability to locate and verify all required information on the shipping document to determine validity.',
        "Demonstrate the ability to determine if shipment's NSN matches the source document, applicable condition tags, and any additional documents accompanying the shipment.",
        'Demonstrate the ability to validate the commodities and classifications of the asset.',
        'Demonstrate the ability to identify ITAR-controlled shipments and demonstrate a basic understanding of DEMIL codes and their associated descriptions.',
        'Provide an example of a scenario when it would be appropriate to elevate an in-checking discrepancy.',
        'Demonstrate the ability to in-check shipment(s) into the system of record (CMOS).',
      ] },
  ] },

  12: { file: '12. Packaging', printed: '5.1.1.5. – 5.1.1.8.; 5.1.1.11.', lessons: [
    { id: 'ttg12-packaging', level: 'Basic', title: 'Packaging', printed: '5.1.1.5. – 5.1.1.8. & 5.1.1.11.', tasks: ['5.1.1.7', '5.1.1.8', '5.1.1.9', '5.1.1.10', '5.1.1.13'], page: 3,
      prerequisites: [NO_PREREQ, TIMELINE], references: ['DAFI 24-602V2', 'SPIRES (https://spires.wpafb.af.mil/)', 'MIL-STD-129', 'DTR Part II, Chapter 203', 'DTR Part II, Chapter 208'],
      outcome: 'Know how to properly preserve and pack cargo for transportation.', notes: NOTES,
      numbering: 'The TTG numbers these from an earlier STS. Its 5.1.1.5–5.1.1.8 are 2026 STS 5.1.1.7–5.1.1.10 (interpret documents, verify container, pack/seal/mark, ESD), and its 5.1.1.11 (segregate documentation) is 2026 STS 5.1.1.13.',
      objectives: ['Interpret shipping documents and DoD policies to determine packaging requirements & verify shipping container is in compliance (STS 5.1.1.7 – 5.1.1.8)', 'Properly pack, seal, and mark items for shipment to include consolidations (STS 5.1.1.9)', 'Properly perform ESD procedures (STS 5.1.1.10)', 'Segregate documentation (STS 5.1.1.13)'],
      steps: [
        { heading: 'Interpret Shipping Documents and DoD Policies to Determine Packaging Requirements & Verify Shipping Container is in Compliance', ordered: true, items: [
          'Review DAFI 24-602v2, Chapter 8, Packaging and Handling.',
          'IAW DAFI 24-602v2 para 8.5.1., "Packaging must prevent damage to items during issue or transfer. If not protected, supply items and equipment can deteriorate during the distribution, storage, and issue cycle."',
          'The trainee will utilize shipping document to determine packing requirements.',
          'Trainee will locate type cargo code, CIIC/PS code, written classification, and SPI.',
          'Trainee will determine if the asset requires ESD packaging.',
          'Trainee will locate SPI on document. If an SPI or Technical Order (T.O.) is prescribed, the trainee will verify by researching the asset in SPIRES.',
          'If the asset is in the correct container, and the container is in good condition, proceed with the shipment.',
          'If an SPI is not in compliance or not available, refer to DAFI 24-602v2 para 8.8 and TTG 16, Utilizing SPIs/Operating Saws.',
          'If an SPI or T.O. is not required, pack item IAW MIL-STD-2073-1, AFMAN 24-206, and DAFI 24-602v2 ensuring proper cushioning, blocking, and bracing to prevent movement during transit.',
        ] },
        { heading: 'Properly Pack, Seal, and Mark Items for Shipment to Include Consolidations', ordered: true, items: [
          'Trainee will identify and prioritize 999/NMCS/MICAP shipments to ensure they are packed, labeled, and marked prior to general cargo shipments.',
          'Trainee will select the proper container and use proper cushioning, blocking, and bracing. Packaging must prevent damage to items during issue or transfer. If not protected, supply items and equipment can deteriorate during the distribution, storage, and issue cycle. Items shipped to another activity must be preserved to prevent deterioration from corrosion, mildew, decay, mold, and attack from microorganisms, or vermin.',
          'Compliance with MIL-STD-129 is mandatory. Trainee will mark shipments as prescribed by MIL-STD-129 which establishes procedures for marking military supplies and equipment for shipment and storage.',
          'Any container surface must be in a condition so that markings remain permanent, legible, and non-fading. Old markings and labels not applicable to the shipment must be obliterated.',
          'Do not cut or strip old labels from fiberboard containers as this can destroy the corrugated flutes. The destruction of the corrugated flutes reduces structural integrity of the box as well as serviceable life.',
          'Trainee shall consolidate shipments to the maximum extent possible having compatible line items, such as: the same consignee and destination, project code TAC or fund citation.',
          'Do not commingle serviceable and unserviceable materiel.',
          '999/NMCS/MICAP may be consolidated as long as ITV is maintained for each line item and does not cause delay in transportation. Refer to DTR, Part II, Chapter 203, Appendix E and MIL-STD-129.',
          'Once the items and shipping documents have been consolidated the packer must identify the lead TCN for the consolidation prior to performing shipment planning actions.',
        ] },
        { heading: 'Properly Perform ESD Procedures', ordered: true, items: [
          'Trainee shall understand that at least one ESD station should be present in the work area.',
          'ESD station must include a static dissipative work surface and personnel grounding devices.',
          'Trainee will identify ESD items by Type Cargo Code "3" or specifically annotated on the source document, special interior, and exterior markings.',
          'Use locally developed training to properly package ESD items making sure to practice safety and use proper dwell time, pressure, and temperature to produce a proper seal.',
        ] },
        { heading: 'Segregate Documentation', ordered: true, items: [
          'Review DAFI 24-602v2 para 2.3, Shipment Planning.',
          'In order to determine which shipments are processed first, trainee will segregate documentation based on transportation priority, mode, and method. (i.e., Commercial/Less than truckload/Truckload/ACA etc.).',
          'The trainee will review the shipment document and determine the transportation priority by referencing DAFI 24-602v2 Table 2.1.',
        ] },
      ],
      exercises: [
        'Demonstrate the ability to interpret shipping documents and DoD policies to determine packaging requirements.',
        'Demonstrate the ability to determine if shipping container compliant with specified requirements.',
        'Demonstrate the ability properly pack, seal, and mark item for shipment to include consolidations.',
        'Demonstrate the ability to perform ESD procedures.',
      ] },
  ] },

  13: { file: '13. Obtain Dimensions and Weights & Calculate CB for Rolling Stock', printed: '5.1.1.9. – 5.1.1.10.', lessons: [
    { id: 'ttg13-dims-cb', level: 'Basic', title: 'Obtain Dimensions and Weights & Calculate Center of Balance (CB) for Rolling Stock', printed: '5.1.1.9. – 5.1.1.10.', tasks: ['5.1.1.11', '5.1.1.12'], page: 3,
      prerequisites: [NO_PREREQ, TIMELINE], references: ['DAFI 24-602V2', 'DTR Part III Appendix P'],
      outcome: 'Know how to determine shipment measurements.', notes: NOTES,
      numbering: 'The TTG cover prints 5.1.1.9 – 5.1.1.10 and its task steps header prints 5.1.1.9 & 5.1.1.11. In the 2026 STS these tasks are 5.1.1.11 (obtain dimensions and weights) and 5.1.1.12 (calculate CB for rolling stock).',
      objectives: ['Obtaining dimensions and weights (STS 5.1.1.11)', 'Calculating center of balance for rolling stock (STS 5.1.1.12)'],
      steps: [
        { intro: 'According to DAFI 24-602V2, shipment planners are required to determine the best value mode, method, and select TSP. Shipment characteristics will play an important role in the planning process. Shipment characteristics consists of the size, weight, type pack and classification. For the purpose of this training guide, the focus will be on dimensions, weights, and CB.', items: [] },
        { heading: 'Obtaining Dimensions and Weights', ordered: true, items: [
          'All shipments will require accurate measurements.',
          'Trainee will use tape measure to determine length, width, and height using imperial units of measurement. Round all measurements to the next whole number.',
          "Trainee will use a zero out scale that is properly calibrated. Weight will be measured by 'LB' or 'KG' only.",
        ] },
        { heading: 'Calculating CB', intro: 'According to the DTR Part III, Appendix P, "the CB of cargo must be determined to accurately compute the weight and balance condition of a loaded aircraft." All vehicle type cargo will have axle weights marked above each axle, on both sides of vehicle, with weather resistant material.', ordered: true, items: [
          { text: 'In order to obtain the CB, you must determine the following:', items: ['W1 – Front axle weight.', 'W2 – Rear axle weight.', 'D1 – Distance from RDL to front axle or center of articulated tandem axle.', 'D2 – Distance from RDL to rear axle or center of articulated tandem axle.'] },
          'Trainee will use the following equation to calculate center of balance IAW DTR Part III Appendix P. The TTG prints it as "(D1+W1) x (D2+W2) … ÷ GVW". DTR Part III, Appendix P states the method as: "Multiply weight by distance of each axle from the reference line (in inches), and then divide the total results by the vehicle gross weight." That is, CB = (W1 × D1 + W2 × D2 …) ÷ GVW, in inches aft of the reference line.',
        ] },
      ],
      exercises: [
        "Review DTR Part III, Appendix P. Demonstrate the ability to determine a shipment's weight and dimensions.",
        "Demonstrate the ability to calculate a shipment's center of balance.",
      ] },
  ] },

  14: { file: '14. Forklift', printed: '5.1.1.12.', lessons: [
    { id: 'ttg14-forklift', level: 'Basic', title: 'Forklift', printed: '5.1.1.12.', tasks: ['5.1.1.14'], page: 3,
      prerequisites: [NO_PREREQ, TIMELINE], references: ['QTP 24-3-E814'], supportMaterial: ['AF Form 171'],
      outcome: 'Know how to complete required training and obtain licensing requirements needed to safely operate a forklift.', notes: NOTES,
      numbering: 'The TTG prints this as 5.1.1.12. In the 2026 STS, "Obtain required forklift licenses" is 5.1.1.14; 5.1.1.12 is now calculating CB (TTG 13).',
      objectives: ['Obtain required forklift licenses (STS 5.1.1.14)'],
      steps: [
        { heading: 'Obtain Required Forklift Licenses', ordered: true, items: [
          "While working in Cargo Movement, you may be required to operate a forklift. In order to operate a forklift, you must obtain a government's license.",
          'While in the training phase, the trainee will practice operating a forklift with a certified appointed trainer.',
          { text: 'The trainee will need the following to obtain a forklift license:', items: ["A valid driver's license", 'Obtain proper on-the-job training for operating applicable forklifts', "Complete the AF Form 171, Request for Driver's Training and Addition to U.S. Government Driver's License", 'Pass the Occupational Safety and Health Administration (OSHA) knowledge exam'] },
        ] },
        { heading: 'Safely Operate Forklifts', ordered: true, items: [
          'Handling and using MHE comes with certain risks. To ensure warehouse personnel and operators are safe, we must handle MHE with care (e.g., forklifts, tugs and GOVs).',
          'Through e-publishing, you can find QTP 24-3-E814, Forklift Vehicle Training Package. This is the main source document for forklift training. It provides information such as: guidance for trainer/trainee, forklift hand signals, loading/unloading procedures, and load composition.',
          'The trainee must utilize this document to learn how to properly utilize a forklift as well as prepare for the OSHA exam.',
        ] },
      ],
      exercises: [
        'Review QTP 24-3-E814. When operating a forklift, what is required prior to entering all warehouse openings/adjacent rooms?',
        'Explain the Safety Clothing and Equipment required to operate a government vehicle.',
        'Demonstrate the ability to safely operate a forklift.',
        'Explain what a spotter is.',
      ] },
  ] },

  15: { file: '15. Reusable Container Program', printed: '5.1.2.1. – 5.1.2.6.', lessons: [
    { id: 'ttg15-rcp', level: 'Intermediate', title: 'Reusable Container Program (RCP)', printed: '5.1.2.1. – 5.1.2.6.', tasks: ['5.1.2.1', '5.1.2.2', '5.1.2.3', '5.1.2.4', '5.1.2.5', '5.1.2.6'], page: 3,
      prerequisites: ['Complete Basic requirements', TIMELINE], references: ['DAFI 24-602V2', 'SPIRES (https://spires.wpafb.af.mil/)', 'DoDM 4140.01-V9'],
      supportMaterial: ['DAF Form 451', 'Automated-RCP (A-RCP) Tool'],
      outcome: 'Know how to manage the installation Reusable Container Program.', notes: NOTES,
      objectives: ['5.1.2.1. Monitors and tracks DAF 451', '5.1.2.2. – 5.1.2.3. Conducts inspections/completes required reports', '5.1.2.4. Lead working group meetings with major shipping activities', '5.1.2.5. Initiate SPI waiver as required, from the responsible entity that manages the item', '5.1.2.6. Maintains accurate reusable container inventory'],
      steps: [
        { heading: 'Reusable Container Program', intro: 'According to DAFI 24-602v2, Chapter 10, the AF RCP is designed, "to control packaging costs and promote efficiencies through the reuse of containers to the greatest extent possible." The program also provides management and control of reusable containers to minimize problems such as misuse, unnecessary procurement of new containers, failure to redistribute excess reusable containers as well as prevent premature disposal of these assets in solid waste streams. The Reusable Container Program Monitor (RCPM) and Unit Reusable Container Monitors (URCM) are key to making this program successful.', ordered: true, items: [
          'The RCPM must review and follow the guidance prescribed in Chapter 10 of DAFI 24-602v2.',
          'The RCPM will train URCM and establish procedures to employ reusable containers to the maximum extent practicable.',
          'A primary and alternate URCM will be identified for every unit managing reusable containers.',
          'URCM will follow procedures to recover long life reusable containers, prevent unauthorized disposal and establish local accountability log for container usage & repair.',
        ] },
        { heading: 'Monitors and Tracks DAF Form 451', ordered: true, items: [
          'When the item-to-be-shipped is missing the SPIRES SPI, a DAF Form 451 is required.',
          'URCMs are required to submit a DAF Form 451 to the LRS/APS Packing and Crating Function on behalf of the organization to request fabrication and/or procurement of specialized containers.',
          'The URCMs will ensure DAF Form 451 is properly completed IAW DAFI 24-602v2, Attachment 5 and duly endorsed by an approved appointee IAW DAFI 24-602v2, para 1.9.5.',
          'RCPM will ensure all Packing & Crating and Outbound Cargo personnel are aware of the DAF Form 451 requirements/local process (e.g., when a DAF Form 451 is required, where to store DAF Form 451s, what to do when DAF Form 451 is missing, etc.).',
          'The RCPM will collect, track, and file all DAF Form 451s.',
        ] },
        { heading: 'Conducts Inspections/Complete Required Reports', ordered: true, items: [
          "To measure program effectiveness and efficiency, the RCPM will perform annual inspections (NLT 30 September of each FY) of the organizational units' reusable container storage areas.",
          'The RCPM will conduct inspection and prepare the annual report IAW DAFI 24-602v2 para 10.15.1-10.15.2.',
          'Report distribution will include: the primary URCMs, applicable unit commanders and AFIMSC/IZLT. At a minimum, the report shall include Reusable Container Return Efficiency and Reusable Container Storage and Conservation.',
          'The annual report shall be completed and distributed NLT 30 days after inspection is complete. NOTE: The applicable wing and group commander should receive a copy of the report when there is a significant cost as a result of reusable container loss or destruction.',
        ] },
        { heading: 'Lead Working Group Meetings with Major Shipping Activities and Unit Resource Advisors', ordered: true, items: [
          { text: 'According to DAFI 24-602v2, para 10.14.1.5, the Reusable Container Program Working Group (RCPWG) should have representatives from:', items: ['Aerospace Maintenance', 'Materiel Management', 'Munitions & Weapons', 'Traffic Management', 'Other major shipping activities', 'Unit resource advisors'] },
          'The RCPWG will meet at least once a year but NLT 30 June of each FY.',
          'Purpose of the meeting is to coordinate actions, review budgetary and operational requirements for the current and upcoming FY, analyze deficiencies, and recommend corrective actions to reduce costs impacting the RCP.',
          'Additional topics of interest for the RCPWG are identified in DAFI 24-602v2 para 10.14.2-10.14.2.2.',
        ] },
        { heading: 'Initiate SPI Waivers', ordered: true, items: [
          'Specified SPI packs for items-to-be-shipped will be used unless the managing Air Force Sustainment Center or AFLCMC packaging office grants a SPI waiver.',
          'To request a waiver, follow the guidance referenced in DAFI 24-602v2 para 8.8 & 8.9.',
        ] },
        { heading: 'Maintains Accurate Reusable Container Inventory', ordered: true, items: [
          'Create a Reusable Container log to account for container usage and on hand inventory.',
          'For excess short-life containers (new or serviceable containers), report in RECON for redistribution to other AF units when the quantity or economic value of the containers justifies the cost of redistributing them. For long-life containers not in use, return IAW DAFI 24-602v2 para 10.5.6.',
        ] },
        { heading: 'Automated Reusable Container Program (A-RCP) Tool', ordered: true, items: [
          'Use of the Automated Reusable Container Program Tool is highly encouraged.',
          'This tool was developed as a capabilities enhancement option for active-duty units and is currently not mandated by policy. NOTE: this tool does have the capability for ANG and AFR units, just contact the RCP POC at AFIMSC.',
          'The A-RCP tool centralizes and automates submitting DAF Form 451 requests and allows RCPMs to easily track and manage all requests from submittal to completion.',
          'You can access the tool by using the following link using Google Chrome or MS Edge browsers: https://usaf.dps.mil/teams/IZTools/ARCP/module/Home.aspx.',
          'Once you access the link, user guides can be obtained from the left navigation tabs by clicking on "User Guide."',
        ] },
      ],
      exercises: [
        'Locate the DAF Form 451 on the EPUBS website. Identify/explain required information needed from customer.',
        'Explain/Demonstrate how to verify who is authorized to sign the DAF Form 451.',
        'Demonstrate the ability to log and track DAF Form 451 by unit requesting container fabrication or replacement.',
        'Conduct unit inspection. Identify proper storage and accountability of reusable containers by a participating unit.',
        'Pick one unit. Demonstrate the ability to complete annual reports.',
        'Demonstrate the ability to plan/lead a working group.',
        'Review DAFI 24-602v2 para 8.8 & 8.9. Explain how to request an SPI waiver.',
        'Demonstrate the ability to maintain an accurate reusable container inventory.',
      ] },
  ] },

  16: { file: '16. Lockout-Tagout, Utilizing SPI & Operating Saws', printed: '5.1.2.7. – 5.1.2.10.', lessons: [
    { id: 'ttg16-loto-spi-saws', level: 'Intermediate', title: 'Lockout/Tagout, Utilizing SPIs & Operating Saws', printed: '5.1.2.7. – 5.1.2.10.', tasks: ['5.1.2.7', '5.1.2.8', '5.1.2.9'], page: 3,
      prerequisites: ['Complete Basic requirements.', TIMELINE], references: ['DAFI 24-602V2', 'SPIRES (https://spires.wpafb.af.mil/)', 'DAFMAN 91-203 Chp 11 & 21'],
      outcome: 'Know how to maintain the lockout/tagout program, locate and interpret SPIs, determine container requirements and use saws to fabricate or repair containers.', notes: NOTES,
      numbering: 'The TTG lists four items: 5.1.2.7 LOTO, 5.1.2.8 decipher SPI, 5.1.2.9 utilize SPI to construct containers, and 5.1.2.10 operate saws. The 2026 STS has no separate "utilize SPI to construct containers" line, so that content sits with 5.1.2.8 here, and "Operate saws and hand tools" is 2026 STS 5.1.2.9.',
      objectives: ['5.1.2.7. Maintains Lock Out Tag Out program', '5.1.2.8. Decipher SPI for build requirements', 'Utilize SPI to construct containers (TTG 5.1.2.9; no separate 2026 STS line)', 'Operate saws and hand tools (TTG 5.1.2.10; STS 5.1.2.9)'],
      steps: [
        { heading: 'Maintains Lockout/Tagout (LOTO) Program', ordered: true, items: [
          'According to DAFMAN 91-203, when establishing an electrically safe work condition in accordance with NFPA 70E, Electrical Safety in the Workplace, Article 120, hazardous energy control program shall meet the requirements of the Lockout/Tagout program.',
          'The primary purpose of the LOTO program is to prevent accidents and injuries by ensuring that machinery and equipment are properly shut off, de-energized, and isolated from their energy sources during maintenance, repair, or servicing.',
          { text: 'To maintain a Lockout Tagout program effectively, follow these steps:', items: [
            'Conduct Regular Inspections: Look for any signs of wear, damage, or malfunction that could compromise safety.',
            'Conduct Training: Provide comprehensive training to all employees involved in LOTO procedures. Make sure they understand the importance of LOTO, how to properly implement it, and the risks associated with failing to do so.',
            'Written Procedures: Have clear and detailed written procedures for LOTO in place and ensure they are easily accessible to all employees. Regularly review and update these procedures as needed to reflect any changes in equipment or regulations.',
            'Equipment Maintenance: Regularly inspect and maintain lockout devices, tagout tags, and other equipment used in the LOTO process. Replace any worn or damaged equipment promptly.',
            'Audits and Reviews: Conduct periodic audits of your LOTO program to identify any areas for improvement or non-compliance. Review near-miss incidents and accidents to learn from them and make necessary adjustments to your procedures.',
            'Communication: Foster open communication between employees, supervisors, and management regarding LOTO procedures. Encourage reporting of any concerns or issues related to LOTO compliance.',
            'Continuous Improvement: Continuously seek ways to improve your LOTO program. This could include implementing new technologies, providing additional training, or refining procedures based on feedback and experience.',
            'Regulatory Compliance: Stay up to date with relevant regulations and standards related to LOTO. Ensure that your program meets or exceeds all legal requirements.',
          ] },
          'In addition to these steps, follow the guidance in DAFMAN 91-203 to maintain an effective LOTO program that keeps personnel safe.',
        ] },
        { heading: 'Decipher SPI for Build Requirements / Utilize SPI to Construct Containers', ordered: true, items: [
          'The trainee will examine source document to determine the need for an SPI.',
          'If applicable, trainee will utilize the Logistics Tool Suite (LTS) to access SPIRES.',
          'According to DAFI 24-602v2 para 10.9.1, AF SPIRES is the authoritative source and electronic repository for AF managed and AF weapon system specific SPIs.',
          'Utilizing SPIRES, trainee will locate the part NSN or SPI number on the source document to query and determine required SPI.',
          'Use the instructions from SPIRES to construct the SPI.',
        ] },
        { heading: 'Operate Saws and Hand Tools', ordered: true, items: [
          'Before operating saws and hand tools, review DAFMAN 91-203, Air Force Occupational Safety, Fire, And Health Standards, Chapter 11.',
          'Trainee will follow safety & equipment handling procedures provided in referenced DAFMAN.',
          'Trainee will properly wear personal protective equipment, remove jewelry and loose-fitting clothing, brief any assisting personnel of safety requirements, and notify nearby personnel of noise hazard prior to conducting operations.',
          'Trainee will determine the appropriate saw or hand tool for the task and review appropriate safety measures before powering up any machinery.',
          "Trainee will only operate saws and hand tools as intended based on manufacturer's instructions and safety regulations for safe and proper use.",
          'Trainee will construct container IAW with SPI identifying preservation, packing, appropriate markings, and notes annotated in the instructions.',
        ] },
      ],
      exercises: [
        'Review DAFMAN 91-203. The written plan of execution for the lockout/tagout procedures should be IAW what regulatory guidance and what should be identified?',
        'Demonstrate the ability to access SPIRES and query an SPI based on source document or NSN.',
        'Demonstrate constructing a proper container using an SPI.',
        'Review DAFMAN 91-203 chapter 11, when it comes to machinery, explain what is required for safe operations.',
      ] },
  ] },

  17: { file: '17. WPM Program', printed: '5.1.2.11. – 5.1.2.14.; 5.1.4.1. – 5.1.4.3.', lessons: [
    { id: 'ttg17-intermediate', level: 'Intermediate', title: 'Wood Packaging Material (WPM) Program', printed: '5.1.2.11. – 5.1.2.14.', tasks: ['5.1.2.10', '5.1.2.11', '5.1.2.12', '5.1.2.13'], page: 3,
      prerequisites: ['Complete Basic Requirements', TIMELINE], references: ['DAFI 24-602V2 Chapter 9', 'DoD 4500.9R Chap 208', 'DoDM 4140.65'],
      supportMaterial: ['AFIMSC SharePoint SAC-07', 'https://tarp.navsup.navy.mil/WPM'],
      outcome: 'Know how to implement the WPM program at the base level.', notes: NOTES,
      numbering: 'The TTG numbers these 5.1.2.11 – 5.1.2.14, one higher than the 2026 STS: inventories/audits is 5.1.2.10, certification stamps 5.1.2.11, training requirements 5.1.2.12, and records 5.1.2.13.',
      objectives: ['Ensures timely completion of inventories/audits (STS 5.1.2.10)', 'Manages acquisition and possession of certification stamps (STS 5.1.2.11)', 'Complies with/enforces training requirements (STS 5.1.2.12)', 'Maintains accurate records for compliance and auditability (STS 5.1.2.13)'],
      steps: [
        { heading: 'Ensures Timely Completion of Inventories/Audits', ordered: true, items: [
          { text: 'Trainee will review DAFI 24-602v2 chapter 9, United Nations (UN) WPM Requirements. IAW DAFI 24-602v2 para 9.3.2., the trainee will complete the following reports and submit via the DoD WPM website monthly:', items: ['Lumber Usage monthly report', 'DoD Pest Free monthly report'] },
          'IAW DAFI 24-602v2 para 9.3.3., WPM auditor(s) will not be assigned to the Deployment and Distribution Flight. Trained auditors must perform annual on-site audits for the previous calendar year. The results of those audits must be reported and posted on the DoD WPM Website NLT 31 January of each year.',
          'The WPM Program Manager or AF Component Manager may direct additional WPM audits.',
          'For annual audits, auditors may perform inspections beginning 1 Jan after the Site Custodian has completed the Dec Lumber Usage and Stamp Usage reports. Audits completed prior to 31 Dec will not be accepted for the annual audit.',
        ] },
        { heading: 'Manages Acquisition and Possession of Certification Stamps', items: [
          'IAW DAFI 24-602v2 para 9.2.2, the trainee will ensure certification marking stamps are stored in a secure cabinet and that only personnel that have successfully completed the DoD WPM web-based training course may apply WPM certification markings.',
        ] },
        { heading: 'Complies With/Enforces Training Requirements', ordered: true, items: [
          'Trainee will complete certification training for handling, using, managing, or auditing wood packaging material.',
          'Completion of training is required every two years. Training can be found at https://tarp.navsup.navy.mil/wpm.',
        ] },
        { heading: 'Maintains Accurate Records for Compliance and Auditability', ordered: true, items: [
          'Trainee will maintain records of lumber purchases, usage logs and certification markings for compliance and auditability.',
          'Each certified WPM activity will maintain records IAW AFRIMS.',
          'Shipping activity will maintain certifications records.',
        ] },
        { heading: 'WPM Management Overview', ordered: true, items: [
          'Primary and Alternate Site Custodians and Auditors must be appointed in writing.',
          'Upload signed appointment letter to the AFIMSC SharePoint SAC-07 Appointed WPM Auditor and Custodian site.',
          { text: 'Site Custodians and Site Auditors must have access to the following:', items: ['Most current revision of DoDM 4140.65, Issue, Use, and Disposal of Wood Packaging Material (WPM)', 'Completed WPM initial and/or refresher training', 'Access to DoD WPM website to accomplish monthly reports and audits in a timely manner'] },
          'NOTE: DoD WPM website users can directly contact Navy TARP technical support to address any website account access problems (https://tarp.navsup.navy.mil/WPM).',
        ] },
      ],
      exercises: [
        'Articulate timelines for required audits and inventories.',
        'Demonstrate proper control of the ISPM 15 and DoD Pest Free certification stamp.',
        'Demonstrate the ability to obtain proper moisture readings.',
        'Demonstrate the ability to enter monthly numbers into the systems of record.',
        'Locate WPM accountable files/records/stamp. Explain the importance of maintaining required documentation for the WPM program and where & how to properly file/store them.',
      ] },
    { id: 'ttg17-expert', level: 'Expert', title: 'Wood Packaging Material (WPM) Program: Headquarters Oversight', printed: '5.1.4.1. – 5.1.4.3.', tasks: ['5.1.4.1', '5.1.4.2', '5.1.4.3'], page: 6,
      prerequisites: ['Complete Intermediate requirements.', TIMELINE], references: ['DAFI 24-602V2 Chapter 9', 'DoD 4500.9R Chap 208', 'DoDM 4140.65'],
      supportMaterial: ['AFIMSC SharePoint SAC-07', 'https://tarp.navsup.navy.mil/WPM'],
      outcome: 'Know how to manage the WPM Program at the headquarters level.', notes: NOTES,
      objectives: ['5.1.4.1. Ensure timely completion of WPM audits of subordinate units', '5.1.4.2. Manages system of record accounts for subordinate units', '5.1.4.3. Monitors reports and takes necessary actions'],
      steps: [
        { heading: 'Ensure Timely Completion of WPM Audits of Subordinate Units, Manage System of Record Accounts for Subordinate Units & Monitor Reports and Take Necessary Actions', ordered: true, items: [
          'Air Force Installation and Mission Support Center (AFIMSC) provides oversight of the WPM program for each installation.',
          'AFIMSC tracks appointment letters, assists with granting access to TARP and monitors audit completion for each installation.',
          'To ensure timely completion of WPM audits, AFIMSC will send a reminder to Transportation Officers and Distribution leads informing them of the upcoming inspection.',
          'When installations fail to complete the annual WPM audit, the LRS commander will be notified, addressing requirements to bring the program into compliance and by the established deadline.',
          'AFIMSC may direct non-compliant installations to complete a monthly audit until they can sustain a compliant status.',
        ] },
      ],
      exercises: [
        'Demonstrate the ability to confirm that every installation has identified a primary and alternate site custodian and site auditors.',
        'Demonstrate the ability to ensure custodians/auditors meet requirements to be granted access to WPM system of record.',
        'Explain actions taken when an installation does not pass their annual audit.',
      ] },
  ] },

  18: { file: '18. CCO Program', printed: '5.1.3.1. – 5.1.3.4.; 5.1.4.4. – 5.1.4.5.', lessons: [
    { id: 'ttg18-advanced', level: 'Advanced', title: 'Container Control Officer (CCO) Program', printed: '5.1.3.1. – 5.1.3.4.', tasks: ['5.1.3.1', '5.1.3.2', '5.1.3.3', '5.1.3.4'], page: 3,
      prerequisites: ['Complete Intermediate requirements.', TIMELINE], references: ['DAFI 24-602V2 Chapter 12', 'DTR, Part VI, Chapter 605', 'AF Intermodal Container Management SharePoint', 'DoDI 4540.07'],
      outcome: 'Know how to properly implement the CCO program under the guidance of the Transportation Officer.', notes: NOTES,
      objectives: ['5.1.3.1. Complies with/enforces training requirements', '5.1.3.2. Ensures subordinates maintain active JCM accounts', '5.1.3.3. Conducts/maintains accurate inventories/inspections for compliance and auditability', '5.1.3.4. Request repairs/replacement of ISO containers'],
      steps: [
        { heading: 'Complies With/Enforces Training Requirements', ordered: true, items: [
          'The primary/alternate installation CCO will be appointed by the installation commander or designated representative.',
          'The installation CCOs will be the ITO/TO, E-6 or above, or civilian equivalent.',
          'The installation CCOs will complete container management training material and follow instructions to register for the Convention of Safe Container (CSC) re-inspection course (located on the AF Intermodal Container Management SharePoint).',
          'The installation CCO will gain access to Joint Container Management (JCM).',
          'The installation CCO will ensure units that own, manage, maintain, or use ISO containers appoint unit CCOs via appointment letter.',
          'The installation CCOs will be responsible for training Unit CCOs.',
          'The installation CCO will establish a rapport with AFIMSC & AFMC/A4RT.',
        ] },
        { heading: 'Ensures Subordinate Units Maintain Active JCM Accounts', ordered: true, items: [
          'JCM is the DoD system of record for ISO container inventory management. JCM can be accessed through Electronic Transportation Acquisition (ETA) portal.',
          'CCOs are required to log in and maintain their account on a regular basis.',
          "The installation CCO will ensure that unit CCOs report their unit's containers in JCM.",
          'Installation CCO will ensure JCM reflects current CCO personnel.',
        ] },
        { heading: 'Conducts/Maintains Accurate Inventories/Inspections for Compliance and Auditability', ordered: true, items: [
          'Review DAFI 24-602v2 para 12.2.1.',
          'CCOs perform a pivotal role during the annual physical verification and the DoD Biennial ISO inventories.',
          { text: 'In order to capture a 100% inventory of all DoD-owned intermodal distribution platform assets, there are three primary categories of verification that require validation in JCM: Owner Verification, Location Verification, and Next Inspection Date.', items: [
            'Owner Verification. The owner verification process requires the validation of assets that are registered as being owned by the unit and/or organization as identified by the "Owner DoDAAC" field in JCM as well as the DoD ISO Registry. It is important to maintain accurate ownership data for each piece of equipment so that Army Intermodal Distribution and Platform Management Office (AIDPMO) can ensure the DoD ISO registry is up to date. By reporting "Owned Assets," the owner is verifying that the information recorded in the DoD ISO Register is correct. Report owned assets in JCM by selecting "Yes" to concur with the ownership or "No" for non-concur. Every asset reported as owned by the Owner DoDAAC in JCM should be reported with a "Yes" or a "No." For any "No" reports, AIDPMO contacts the CCO to reconcile the ownership.',
            'Location Verification. The location verification process requires the validation of assets reported as on-hand at the site per JCM. Prior to conducting the location verification event in JCM, a 100% wall-to-wall inventory must be completed. The containers inventoried are first received to the location DoDAAC. The method of reporting this information with JCM is to select a "Yes" if the container is at the location or "No" if an asset is not at the CCO\'s location. Every asset reported as being at the Location DoDAAC in JCM should be reported with a "Yes" or a "No." For any "No" reports, AIDPMO contacts the CCO to reconcile the location of the assets.',
            'Next Inspection Date Verification. During the inventory process, validate the next inspection date on DD Form 2282. The "Next Inspection" column enables inspectors to input the next inspection date in the format of mm/yyyy. NOTE: Refer to the JCM training material located on the AF Intermodal Container Management SharePoint site.',
          ] },
          'Installation CCO(s) will report all ISO container program related problems or concerns to the Air Force Container Manager (AFMC/A4RT).',
          'Official inventories normally will be conducted on a biennial basis, during the first and second quarter of even calendar years, but may be conducted at other times as necessary such as, during contingencies when required by the Theater CDR.',
        ] },
        { heading: 'Request Repairs/Replacement of ISO Containers', ordered: true, items: [
          'Review DAFI 24-602v2 para 12.4, New Container & Leased Container Management.',
          'Before purchasing or requisitioning new ISO containers, the CCO(s), Program Managers, and Air Force units will contact the AF Container Manager (AFMC/A4RT) to determine whether other "government owned" containers are available within the DoD inventory.',
          'If approved, units will follow the guidance listed in DAFI 24-602v2 para 12.4.5.',
          'According to DAFI 24-602v2 para 12.5.1, Program Managers and units who purchase or own ISO containers are responsible to arrange, budget, and fund for repair of containers through an authorized repair facility or service.',
          'Program Managers and units should use DoD repair facilities in lieu of commercial facilities where economically feasible.',
          'Prior to scheduling any repairs, Program Monitors and units should consider new procurement or leasing as an alternative to round-trip shipping and repair costs.',
        ] },
      ],
      exercises: [
        'Produce mandatory required for CCO Program. (as written in the TTG)',
        'Demonstrate accessing JCM and explain required duties.',
        'Explain why CCOs must maintain active JCM accounts.',
        'Demonstrate the ability to conduct and maintain accurate inventories and manage inspections for compliance and authority.',
        'Conduct official inventory of participating unit.',
        'Review DAFI 24-602v2 para 12.4. Explain the process to request an ISO container.',
      ] },
    { id: 'ttg18-expert', level: 'Expert', title: 'Container Control Officer (CCO) Program: DAF Equity and Subordinate Inventories', printed: '5.1.4.4. – 5.1.4.5.', tasks: ['5.1.4.4', '5.1.4.5'], page: 6,
      prerequisites: ['Complete Advanced requirements.', TIMELINE], references: ['DAFI 24-602V2 Chp 12', 'DTR, Part VI, Chp 605', 'AF Intermodal Container Management SharePoint', 'DoDI 4540.07', 'DoDI 4500.57', 'Charter for the Joint Intermodal Working Group'],
      outcome: 'Know how to properly implement the CCO program under the guidance of the TO at the base level.', notes: NOTES,
      objectives: ['5.1.4.4. Maintains DAF equity at the DoD level', '5.1.4.5. Ensure subordinate units complete required ISO inventory'],
      steps: [
        { heading: 'Maintains DAF Equity at the DoD Level', ordered: true, items: [
          { text: 'If applicable, IAW DoDI 4500.57, Transportation and Traffic Management, you may be selected to serve as an Air Force representative for the Joint Intermodal Working Group (JIWG) ISO the global intermodal container program. The mission of the JIWG is to:', items: ['Facilitate and manage intermodal equipment initiatives', 'Provide recommendations to improve policy', 'Enhance integration and interoperability', 'Develop solutions to intermodal equipment problems and issues'] },
          'For more information regarding the JIWG, read the Charter for the JIWG or contact AFMC/A4RT.',
        ] },
        { heading: 'Ensure Subordinate Units Complete Required ISO Inventory', items: [
          "Installation CCOs will validate units' completion of annual physical inventory and DoD biennial container inventory ICW DTR Part VI and DAFI 24-602v2.",
        ] },
      ],
      exercises: [
        'Review the Charter for the JIWG. What are the members of the JIWG and who chairs the JIWG?',
        'Review DAFI 24-602v2. What are 3 primary categories of verification for all DoD-owned intermodal distribution?',
        'Explain what the owner verification validation consists of.',
        'Review DTR Part VI, Chp 605. Explain why it is important to maintain an up-to-date ISO container register.',
      ] },
  ] },
};
