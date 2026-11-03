// Personal Property Operations Task Training Guides (Attachment 5, TTGs 5-10), transcribed from the
// TTG documents. Same shape as ./passenger.js. Every line item in these TTGs matches the 2026 STS.
// Where a TTG cites "DAFI 24-604V4" it means DAFI 24-602V4; those citations are corrected here.

const NOTES = 'This lesson plan is designed for hands-on training (demonstration-performance). Traffic Management missions are different from station to station; training sessions may or may not easily lend themselves to hands-on training. Therefore, it is imperative that trainers demonstrate, document, and verify training using a variety of hands-on and scenario-based techniques to achieve the desired proficiency prior to signing the member\'s training records. For the purpose of this TTG, the term "publication" refers to any written document such as a DAFI, pamphlet, manual, or technical order.';
const TIMELINE = 'Trainer will establish a timeline for completing the required training with the trainee.';
const PPCIG = 'Personal Property Consignment Instruction Guide (PPCIG) (ustranscom.mil)';

// The two briefing guides the TTG 6 briefings lesson embeds as examples.
const counselingChecklist = { title: 'Personal Property Counseling Checklist Breakdown (DD Form 1797)', sections: [
  { heading: 'Household Goods (HHG)', intro: 'Items associated with the home and personal effects belonging to you and your dependents on the effective date of your orders. Only items that may be legally transported by commercial carrier are allowed.', items: [
    { text: 'HHG may include:', items: ['Weapons', 'Vehicles other than POV: Such as motorcycles, mopeds, jet skis, hang gliders, snowmobiles, golf carts and their associated trailers.', 'A small vessel used to travel on the water, powered either by wind, oars, or motor.', 'Spare parts for POV: Including extra tires, wheels, battery chargers; replacement parts subject to normal wear such as spark plugs, filters, hoses, fan belts; tools, tune-up, or repair kits; seasonal items such as snow and ice removal equipment and heaters; special seats and beds for children.'] },
    'HHG may not include: Live ammunition, live animals, including birds, fish and reptiles, mobile homes, camper trailers, airplanes, farming vehicles, privately-owned vehicles (POV) such as a car, van, or truck (except motorcycle), building materials or cordwood, goods for sale or commercial use, perishable items, including plants (except for local move), goods not for member or dependent use or items acquired after effective date of orders.',
  ] },
  { heading: 'Part I – Household Goods (HHG)', intro: 'Your entitlements are based on the type of orders issued to you; however, your basic entitlements include the shipment of your household goods to your next duty station.', items: [
    { text: 'Block 1: Weight Allowance. There are two kinds of weight allowances:', items: ['PCS weight allowance, which is based on your pay grade and whether you have or do not have dependent(s).', 'Temporary weight allowance, which is for those of you who are going on temporary duty or PCS with temporary duty en route. It is strictly for items required by you while you are on temporary duty; it is not intended for dependents. Upon completion of your temporary duty, you may ship this weight to your ultimate duty station.'] },
    "Block 2: Weight Restriction at New Duty Station (if any). Some overseas areas restrict the amount of weight you are authorized to ship. Review the personal property consignment guide to view if there are any types of shipping restrictions based on your shipment's destination. You are authorized to store your personal property at government expense or your personal property to a designated location if a weight restriction is in place.",
    { text: 'Block 3: Servicing/Deservicing of Appliances. It is your responsibility to get your household goods ready before the pack date.', items: [
      'You must disconnect all appliances.', 'The hose to your washer should be unhooked and water drained.', 'Refrigerator, freezer, and air conditioners should be cleaned and dry prior to pack date.', 'Waterbed should be drained completely, no water dripping on pack date or movers will not pack it.', 'Leave china in cabinet and clothes in dressers and closets; do not remove.', 'If you have original containers available place them next to the items and have movers pack them.', "Do not pack anything. It is the carrier's responsibility.", 'If you have a brand-new item, do not unpack it; carrier will annotate it as such and will not assemble items for you at destination.', 'Outdoor items such as swing set, playground equipment, utility shed, and chain link fence must be disassembled by you. Chain link fence must be rolled.', 'Outdoor TV antenna must be brought down by you.', 'Whatever you disassemble or are required to do so, you must assemble at destination. Whatever the movers disassemble, they are required to assemble at destination.', 'Secure items that you will be taking with you, such as: Plane tickets, important papers, jewelry, etc. Do not leave them in the house.', 'If you have more than one shipment, segregate the items. Do not release your unaccompanied baggage items with your household goods if you have a separate application for it. If you decide to ship your unaccompanied baggage shipment with your household goods shipments, you must cancel it 48 hours prior to scheduled pack date or you will be paying a dry run charge.',
    ] },
    { text: 'Block 4: Temporary Storage (short term storage that is part of HHG transportation). Temporary storage may be authorized at origin, in transit, or at destination.', items: [
      'This type of storage is in connection with shipment, i.e. You must designate a city and a state and take delivery. You may have 90 days temporary storage.',
      'If you need to have additional storage time, request an extension from the destination transportation office.',
      'Civilians are authorized storage-in-transit in connection with authorized HHG transportation. The Member may request (in writing) an additional period, NTE 90 days, that is authorized/approved by a Service/Defense Agency designated official. If no additional storage is authorized/approved, the employee is financially responsible for the additional storage expense. (The maximum storage time limit for Civilians will NTE 180 days).',
      'Once authorized temporary storage period expires, you must bear the cost for further storage and make payment directly to the storage company.',
      "Domestic: The TSP's responsibility for a shipment and its liability under the bill of lading for a shipment in SIT shall terminate, and the warehouse shall become the final destination of the shipment, on midnight of the day specified in the notice which the TSP receives through DPS advising that the government nature of the shipment will terminate.",
      'International: Temporary storage will be for a period not to exceed 90 days unless additional storage is authorized by the PPSO. When the shipment is not removed from SIT during the period authorized by the PPSO, the TSP liability will terminate at midnight of the last day the TSP or warehouseman receives notice from the PPSO (via DPS and/or in writing) that the entitlement has ended. The Government bill of lading character of the shipment will cease, the warehouse will be considered the final destination point of the shipment, the warehouseman will become the agent for the shipper, and the shipment then becomes subject to the rules, regulations, charges, and liability of the warehouseman.',
    ] },
    { text: 'Block 5: Checking Inventory at Origin and Destination. You will be asked to sign the household goods descriptive inventory. This is an important document, because it will provide supporting evidence, in the event you must file a claim for loss and damage.', items: [
      'As the packers pack your goods, they will assign symbols or abbreviations next to items being packed. These symbols document pre-existing damage to your property and are explained on top of the inventory. The numbers indicate the location of the damage.',
      'If you disagree with the packers on the descriptive symbols he assigns to your property, circle the number and in the remarks section of the document, put your own description of the item in question.',
      'Before you sign the inventory, go through the house, checking the closets and cabinets to see that everything has been packed. You should be provided a legible copy of the inventory.',
    ] },
    { text: 'Block 6: Checking DD Form 619, Statement of Accessorial Services Performed, prior to signing. Check this form for accuracy before signing.', items: ['Never sign a blank copy.', 'Verify the quantity, type of containers, and any accessorial services identified by the TSP.', 'New cartons must be used for clothing, linens, bedding, mattresses, and box springs. Used cartons may be utilized for other items but must be in good condition. All marks pertaining to a previous shipment must be obliterated.'] },
    { text: 'Block 7: Signing Delivery Documents. It is your responsibility to sign the delivery documents immediately upon delivery of property.', items: ['Boxes showing exterior damage should be unpacked and examined for interior damage. Boxes containing high-value/highly pilferable items should always be opened in the presence of the TSP and the contents inventoried before the TSP is released. Make sure the TSP records missing/damaged items on all copies of the inventory and notice of loss/damage at delivery.'] },
    { text: 'Block 8: Arrange Partial Delivery with origin PPSO. At destination, you are also authorized a partial delivery of certain items from your household goods shipment.', items: ['If you intend to request a partial delivery, you must identify this on your shipment request, so that your application form can be so noted. Prior to the scheduled pickup date, it is your responsibility to separate these items from the rest of the household goods and identify these items as partial delivery items to the packers. If you fail to do so, you will be held responsible for the handling cost for the removal of these partial delivery items.'] },
    { text: 'Block 9: Extra Pickup or Delivery Charges (when applicable).', items: ['Military members are entitled to extra pickup and delivery. If you have goods in government or commercial storage at your own expense or if you have professional books at your office, you may have this extra pickup.'] },
    { text: 'Block 10: Ensuring Personal Property Is Clean.', items: ['Ensure your personal goods are pest and bug-free. If your goods are infested, you may incur additional costs before they can be moved.', 'If your move needs to be rescheduled because of pests, you will be liable for those additional costs as well.', 'Also, please read information on gypsy moths.'] },
  ] },
  { heading: 'Part II – Unaccompanied Baggage', items: [
    'Block 1: UB weight allowance is a part of your HHG weight allowance.',
    { text: 'Block 2: Weight allowances.', items: [
      'Unaccompanied baggage is subject to specific limitations.',
      'If the new PDS is a location on the Administrative HHG Weight Allowance Location List, then the unaccompanied baggage weight is the lesser of the administrative weight limit for the PDS location.',
      'If the location is not on the Administrative HHGs Weight Allowance Location list: 2,000 pounds for an active-duty Service member with command-sponsored family members (the 2,000-pound weight limit is for the entire family, not for each traveler); 10% of the authorized weight allowance for an unaccompanied active-duty Service member normally assigned to furnished Government quarters; 2,000 pounds for an unaccompanied active-duty Service member not normally assigned to furnished bachelor enlisted quarters or bachelor officer quarters.',
    ] },
    { text: 'Block 3: Items that can be shipped as UB:', items: ['Clothing, uniforms', 'Essential cooking utensils', 'Light housekeeping items', 'Dishes, cutlery', 'Collapsible items such as: baby cribs, playpens, carriages, infant-care articles', 'Toiletries', 'Ironing boards, iron', 'Small kitchen appliances such as: electric coffee pots, toasters, juicers', 'Small electronics such as: portable TVs, small radio, stereo components', 'Sewing machines', 'Voltage Transformers', 'Portable air conditioners', 'Sports equipment', 'Linens', 'Small portable refrigerator', 'NOTE: UB does not include large furniture items such as: chairs, tables, cabinets, washer, dryers, freezers, large refrigerators, beds, and mattresses, etc.'] },
    'Block 4: Preparation. Unlike HHGs shipments where your goods are crated and sealed, UB shipments are placed in cardboard containers with a shipping label attached. To prevent lost shipments, place a copy of orders in each container to help identify your shipment in case the label falls off.',
    { text: 'Block 5: Items of extraordinary value.', items: [
      'High value items are small, pilferable items not normally listed in detail on the carrier-prepared inventory.',
      'Hand Carry Special Items. Don\'t ship small, extremely valuable items such as stocks, bonds, jewelry, coins, coin collections, or items of great sentimental value, such as picture albums. Pack them in hand-carry luggage -- not as checked baggage.',
      "Members should have their own inventory or proof of ownership which may be in the form of purchase receipts, cancelled checks, photographs, video, or statements of disinterested persons who observed such items in the member's home.",
      'A member-prepared inventory should be descriptive and in detail and list those personal property items of $200 value or more that will not otherwise appear on the carrier-prepared inventory. For example: an antique chair would not be packed in a carton but would normally be listed separately on the carrier prepared inventory; however, a $200 movie camera would normally be packed in a carton with other items being listed on a carrier-prepared inventory.',
      "The member's prepared inventory shall be countersigned by a disinterested person, and the member should retain the original in case it is needed to file a loss or damage claim.",
      'Members must be prepared to provide evidence to support the loss or damage.',
    ] },
  ] },
  { heading: 'Part III – Non-Temporary Storage (NTS)', items: [
    'Block 1: Weight allowance is a part of your HHG weight allowance.',
    'Block 2: Location & length. NTS storage will remain in the local area for the duration of your oversea tour. When NTS is authorized from Overseas locations, HHG are normally returned to a CONUS port of entry for NTS. NTS Overseas is only authorized when approved facilities are available.',
    'Block 3: Retirees/Separatees Expiration Date. For retirees, 1 year from the effective date on the retirement orders. For Separatees, 180 days from the effective date on the separation orders.',
    { text: 'Block 4: Appliance servicing. Disconnect all electronic appliances.', items: ['Electronics: Dismantle TV and radio antennas. Disconnect and prepare all components such as stereos, turntables, compact disc players, video disc players, printers, computers, televisions, and VCRs.', 'Refrigerator: Empty, defrost, and thoroughly wash the inside of refrigerators and freezers at least 24 hours before pickup. Empty the refrigerator bottom pan.', 'Hot Tub/Waterbed: Drain all water from hot tubs and water beds and allow to dry.', 'Appliances: Disconnect all appliances, washer hoses and dryer exhaust vents.', 'Electrical Items: Remove and unplug all electrical items, including window air conditioners'] },
    'Block 5: Descriptive inventory. As in Part I, Block 5: if you disagree with the packers on the descriptive symbols assigned to your property, circle the number and in the remarks section of the document, put your own description of the item in question.',
    'Block 6: Items of extraordinary value. As in Part II, Block 5.',
    { text: "Block 7: Member's Responsibility. It is your responsibility to keep the origin/destination PPSO updated on your latest status.", items: [
      'Changes to OCONUS status: if the OCONUS tour has been extended, you must forward copies of extension documents to the PPSO managing your NTS. This will extend your NTS expiration. Failure to submit will result in storage fees converting to your expense.',
      'Also, if your next assignment is to another OCONUS location, you must submit a copy of your new PCS orders to the PPSO managing your NTS for an extension. NOTE: If you prefer to release your NTS to your next OCONUS location, notify the origin TMO and schedule an NTS release.',
      'Retirees: Retirees have 1 year to release NTS. If an extension is needed, contact PPSO managing your NTS for extension (if applicable).',
      'Separatees: Separatees have 180 days to release NTS. If an extension is needed, contact PPSO managing your NTS for extension (if applicable).',
    ] },
  ] },
  { heading: 'Part IV – Weapons', items: [
    { text: 'Block 1: Limitations and Restrictions. The shipment of firearms is subject to various laws and regulations, and you must comply with all local, state, and federal laws.', items: [
      'CONUS: You can transport firearms as part of your total household goods shipment, assuming that it complies with all local and state laws. If you intend to self-transport firearms in your vehicle, make sure you do not carry your weapon on your person and check all the laws of every state you intend to drive through to your new duty station.',
      "OCONUS: the PPCIG will provide country guidelines weapon authorization. If allowed, you must abide by host country's laws. You can transport firearms as part of your total household goods shipment, assuming that it abides by all the laws of your host country and your new country. When returning to the United States, you must identify firearms on your individual customs forms and obtain an ATF Form 6.",
    ] },
    { text: 'Block 2: US Government Requirements. Actions required by the member to ship firearm.', items: ['Make the firearm inoperable by removing the bolt, firing pin, trigger assembly and other arming parts.', 'Completely describe the firearm on the inventory to include make, model, serial number and caliber or gauge. (Make sure to hand carry a copy of this information with you).', 'Remember, you may not ship ammunition.'] },
    { text: 'Block 3: Special Forms.', items: [
      'Shipping OCONUS: Ensure firearm information is annotated on DD Form 1299, Application for Shipment/Storage of Personal Property; DD Form 1252-1, US Customs and Border Protection (CBP) Declaration for Personal Property Shipments.',
      'Return from OCONUS: DD Form 1299 (ensure information is annotated); original DD Form 1252-1 & supporting documents; CBP Form 4455, Certificate of Registration (for proof of ownership in the United States); ATF Form 6 Part I, Application and Permit for Importation of Firearms, Ammunition and Defense Articles (civilian employees and non-active-duty service members); ATF Form 6 Part II (active-duty military members only).',
      'NOTE: Antique firearms may be imported without any documentation or special procedures.',
    ] },
    'Block 4: Shipments of ammunition at government expense is prohibited.',
  ] },
  { heading: 'Part V – Privately Owned Vehicles (POV)', items: [
    { text: 'Block 1: Authorization. Uniformed Service members and DOD civilian employees are authorized to ship/store a POV at government expense under the following conditions:', items: [
      'Uniformed Service member: Assigned CONUS to OCONUS, OCONUS to OCONUS; meet CONUS to CONUS requirements.',
      'DOD Civilian Employee: Have been transferred in the government\'s interest; are a new appointee; or are a student trainee assigned to your first permanent duty station.',
      "CONUS to CONUS: The cost of transporting a POV to the new duty station is the member's responsibility. Exception: If you can't drive due to medical reasons, you must contact the local military personnel office for further guidance. Once the authorization is annotated on your orders, the POV moves at government expense.",
      'CONUS to OCONUS; OCONUS to OCONUS: One POV (owned/leased) is authorized at government expense. Exceptions may apply, for an example, mil to mil members are each entitled a POV shipment. The government will ship one POV measuring 20 metric tons or less (vehicles exceeding this amount the member may be subject to excess cost).',
      'POV Storage: The PPCIG will determine if a POV shipment is authorized. Members/employees PCSing to a location where a POV shipment is restricted/prohibited, will be authorized POV storage at government expense. You must obtain POV storage letter from local Transportation Office.',
    ] },
    { text: 'Block 2: Applicable POE/POD. To schedule a POV shipment you must visit www.PCSmyPOV.com. The local Transportation Office will identify authorized VPC/port.', items: [
      'The designated VPC used to ship/store a POV is nearest to the current and/or next PDS or a VPC in between the old and new PDS.',
      "Alternate Ports/VPCs: Approved ports/VPCs are located on www.pcsmyPOV.com. For allowance purposes, shipments to/from a port located in a different country than the designated port's country, requires PPA HQ approval (exceptions may apply). Within CONUS, you can elect to use an alternate VPC, however you may be subject to excess cost. You also can elect to self-procure POV storage. Keep in mind that reimbursement is limited to the government constructive cost.",
    ] },
    'Block 3: Preparation to ship POV. The member/employee will coordinate POV shipment/storage directly with the VPC. You must visit www.PCSmyPOV.com and follow the preparation instructions on the website/turn-in brochure provided by the VPC.',
    'Block 4: DD Form 788. A joint inspection (between the inspector and yourself) will be conducted during turn-in. You and inspector will sign the DD Form 788. You will be provided a copy and should read the liability statements on the reverse side of the form. Maintain a copy of the DD Form 788 for claim purposes (if applicable in the future).',
    { text: 'Block 5: Excess Cost. A customer may incur excess due to the following:', items: ["Vehicles exceeding 20 metric tons (Members requesting shipment of an oversized POV for medical reasons are directed to send requests through the Installation Surgeon General and MPF. The member's PCS order should include a statement authorizing shipment of an oversized vehicle for medical purposes)", 'Using a VPC other than the designated port/VPC', 'Excess storage cost due to exceeding authorized time limits'] },
    { text: 'Block 6: Inventory for Items left in vehicle (Contractor Responsibility).', items: ['The contractor will document items that will remain in POV in a provided accessory box', 'You are required to sign the inventory, witness the taping of the box, and sign the tape to ensure security of the contents.', 'You will be provided a copy of the inventory'] },
    { text: 'Block 7: Title/Lien holders.', items: ['If the vehicle is owned, a legible copy of the car title/Bill of Sale is required to export POV from the U.S. to a foreign country/U.S. territory.', 'If the POV is leased, financed, or has a recorded lien and you plan to export the vehicle from the U.S. to a foreign country/U.S. territory, a written approval from the lienholder is required.'] },
    { text: "Block 8: Licensing and Insurance Requirements. If required, it will be the customer's responsibility and should be obtained prior to taking delivery of POV.", items: ['CONUS Registration Requirements: The DMV for most states will issue a certificate of title or a registration for an imported vehicle when the applicant submits proof the POV properly entered the US through U.S. Customs and Border Protection. The VPC will have applicable forms required to register your vehicle. You must ensure to collect applicable forms prior to leaving the VPC.', 'OCONUS Registration Requirements: Insurance, taxes and licensing varies from country to country. You should contact overseas sponsor or local Transportation Office for information.'] },
    { text: 'Block 9: Foreign manufactured POVs. The rules for importing vehicles to the United States and U.S. Territories:', items: ['All POVs less than 25 years old must comply with all applicable federal motor vehicle safety standards.', 'All POVs less than 21 years old must comply with federal emissions standards.', 'Vehicles manufactured to meet the federal motor vehicle safety standards have a certification label affixed by the original manufacturer in the area of the driver-side door.', 'Vehicles manufactured to meet the federal motor vehicle emissions standards have an emissions label affixed in the engine compartment stating that the vehicle meets U.S. EPA emissions standards.', 'Vehicles lacking these certification labels are nonconforming and must be brought into compliance.'] },
    { text: 'Block 10: Delivery of POV. To track POV status visit www.pcsmypov.com.', items: ["Once POV has arrived at the port of debarkation, it's your responsibility to pick-up the vehicle within the port's established timeframe (normally 45 days).", 'Failure to respond to pick-up notifications is considered vehicle abandonment. Abandoned POV will be processed for disposal.'] },
    'Block 11: Additional Information. For additional information on shipping or storing POV, the customer should visit www.pcsmypov.com.',
    'Block 12: Authorized Storage locations. The designated VPC is nearest to the current and next PDS. The members have the option to store their POV at a DoD Global POV Contract (GPC) or personally procured commercial storage.',
    { text: 'Block 13: Customer responsibilities. Following these rules will make shipping your POV overseas much easier. Failure to follow these rules may result in the POV not meeting the standards for shipment.', items: ['Country instructions listed in PPCIG', 'POV turn-in instructions at Origin', 'POV pick-up instructions at Destination', 'Process for loss and Damages'] },
  ] },
  { heading: 'Part VI – Boats', intro: 'Blocks 1-6: A boat eligible for shipping consist of a small vessel used to travel on the water, powered either by wind, oars, or motor.', items: [
    '14 feet or less in length and 6 feet 10 inches or less in width and 6 feet 5 inches or less in height: boats with or without associated trailer can be shipped in your HHGs.',
    'Boats over 14 feet in length or over 6 feet 10 inches in width or over 6 feet 5 inches in height: boats with or without associated trailer can be processed as a One-Time-Only (OTO) shipment.',
    'Employees are not authorized to ship a boat/personal watercraft at government expense if the overall length of the boat/personal watercraft (with or without associated trailer) is over 18 feet (exception – primary residence).',
    'Shipping a boat may result in excess costs for the member/employee. The member/employee will be responsible for paying all accessorial charges associated with shipping your boat.',
    'The customer is responsible for removing pilferable gear, clothing, televisions, skis, and similar items.',
    'All antennas, masts, fishing/trolling poles and outriggers must be lowered to meet dimensional requirements or removed.',
  ] },
  { heading: 'Part VII – Liability, Claims, Protection', items: [
    { text: 'Block 1: Your shipment has full replacement value coverage. TSP liability is determined by $7,500 per shipment or $6.00 times the net weight for household goods or gross weight for unaccompanied baggage, whichever is greater, up to a maximum of $75,000. The transportation service provider is responsible to obtain cost estimates for the following:', items: ['Repair of damaged property to original condition.', 'Replace with an item of like kind and quality.', 'Payment of replacement cost of the item.'] },
    { text: 'Blocks 2-7: In order to be eligible for Full Replacement Value (FRV):', items: [
      'The member/employee must file a claim directly with the Transportation Service Provider (TSP) via DPS within 9 months from the date of delivery.',
      'If the claim is filed more than 9 months from the delivery date, or immediately with the Military Claims Office (MCO) after delivery, you will only be eligible for depreciated value up to two years from delivery.',
      'Quick claims are when the delivering TSP offers outside of DPS to promptly resolve minor loss or damage. Claims will not exceed $1,500. File paperwork with TSP and payment will be sent within 5 calendar days of claims submission. Claims cannot be filed in DPS for the same item later, however, claims can be filed for other loss or damaged items.',
    ] },
    { text: 'Block 8: Contractor and Government liability for POV. When Full Replacement Value (FRV) applies to a shipment that includes one or more motor vehicles (automobiles, vans, pickup trucks, motorcycles, or sport utility vehicles):', items: [
      "The TSP's maximum liability for the vehicles shall be the value stated in the current issue of the National Automobile Dealer's Association's Official Used Car Guide (the Guide) for such vehicle(s), adjusted for mileage and other factors considered in the guide.",
      'However, if either the owner or the TSP has obtained an appraisal of the vehicle from a qualified appraiser, settlement will be based on the appraised value rather than the book value.',
      'For boats, personal watercraft, ultra-light aircraft, pianos, organs, firearms, objects of art, all-terrain vehicles, and snowmobiles, the TSP may replace the item with a comparable used item or pay the un-depreciated replacement cost, because these are large, expensive items that are not part of the typical shipment and have an active, widespread secondary market.',
    ] },
    { text: 'Block 9: Inconvenience Claims. If TSP does not meet required pickup and delivery dates and the member/employee was not able to use necessary items to establish their new household, they may qualify for an inconvenience claim, paid by TSP, to offset expenses caused by that inconvenience. A claim is authorized and payable when:', items: [
      'The TSP fails to pick up a shipment on the agreed date.',
      'The TSP fails to deliver on or before the required delivery date, provided the member/employee are in possession of residence and are available to receive the delivery.',
      'The TSP places the shipment into storage in transit, or SIT, at the destination location without notifying member/employee, unless your TSP has documented two unsuccessful attempts to contact them (each attempt must be at least six hours apart).',
      'The member/customer have requested for their shipment to be released from SIT at the destination and the carrier is unable to deliver the shipment out of SIT within seven government business days from the date the customer made first contact requesting delivery, or within two government business days when the customer requested delivery date is more than seven business days out. Note: These rules do not apply to SIT at origin shipments.',
      "To file an inconvenience claim, the customer should: notify the TSP of the intent to file a claim and ask for the inconvenience claim form if they have not already offered it; fill out and return the form to the TSP. The TSP must acknowledge the intent to file within five business days of being contacted by the customer or the local transportation office.",
    ] },
    { text: 'Blocks 10-11: Items of extraordinary value.', items: ['Keep your own inventory or proof of ownership (purchase receipts, cancelled checks, photographs, video, or statements of disinterested persons).', 'A member-prepared inventory should list personal property items of $200 value or more that will not otherwise appear on the carrier-prepared inventory.', 'Appraise Expensive and Valuable Items. Artwork, collectibles, heirlooms, etc. should be appraised. The government will not pay for the appraisals.', 'Photograph or Document Valuables. Take close-up photographs or videos of expensive and valuable items, as well as receipts.', 'Lastly, members/employees should consider additional insurance (at their expense) for high-valued items.'] },
    { text: "Block 12: Customer's responsibilities to acquire liability coverage for SIT/NTS converted to their expense.", items: ['You must be aware of your SIT/NTS expiration date.', 'When SIT/NTS is about to expire, you will be notified and provided options to extend or schedule your shipment for delivery.', 'Failure to respond to notices, once expired the SIT/NTS will convert to your expense.'] },
  ] },
  { heading: 'Part VIII – General Instructions', ordered: true, items: [
    'Maintain important documentation! Documents pertaining to your HHGs move should be maintained in the event a claim has to be filed.',
    'Once your shipment is booked you will be contacted by the TSP to discuss pick-up dates/estimated time of arrival/estimated time of delivery…etc. If you are not contacted by your TSP within 72 hrs after this briefing, contact your local Transportation Office to get the status of your shipment.',
    'On the day of pack/pick-up, ensure you or a designated representative is available and present between 0800-1700 to prevent attempted pack/pick-up charges. Also, if the TSP does not show up, contact your local Transportation Office.',
    "If PCSing overseas, review the host country's instructions in PPCIG.",
    '(Items 5-8) You are responsible for updating your contact information (phone numbers, address, email address) in the system of record once you arrive to your new duty station or final destination. If there are any changes to your orders, it is your responsibility to contact the origin/destination PPSO to provide updates.',
    'Do not ship any unauthorized items.',
    'Ensure PBP&E is identified on your DD Form 1299 for you and/or spouse. At the time of pack/pick-up, make sure pro-gear is separated and identified to the TSP prior to packing. If you and your spouse are shipping pro-gear, ensure it is identified on the inventory as (M) for military and (S) for spouse. NOTE: If the spouse is shipping pro-gear, a list and description of the spouse profession must be certified by the military member and provided to the origin PPSO before it can be included in the shipment.',
    'If you cannot be available for pack/pick-up or delivery, you must designate a releasing/receiving agent or a Power of Attorney.',
    'If shipping alcohol, ensure you follow Federal and state laws/requirements.',
    '(Items 13-14) Retirees/Separatees with HOS entitlement must be aware of their expiration date. If extensions are needed, follow the instructions on the Home of Selection form. Retirees have 3 yrs from the effective retirement date to extend/use the entitlement. Separatees have 180 days from the effective date of separation.',
    '(Items 15-19) If shipping a mobile home, be aware of authorized services at government expense and services you are financially responsible for. Prior to shipment, review the "It\'s Your Move" Moving your Mobile Home pamphlet and follow its instructions for preparing your mobile home for shipment. Ensure items to remain in the mobile home are properly inventoried and remove items that cannot remain in the mobile home. A mobile home shipment is considered your HHG shipment. A separate shipment is not authorized unless for safety reasons or if you are PCSing OCONUS.',
  ] },
] };

const ppmBriefing = { title: 'Personally Procured Move Briefing (DD Form 2278)', sections: [
  { heading: 'Personally Procured Move', intro: 'A PPM is a move that you perform or arrange yourself instead of using a DOD arranged Transportation Service Provider (TSP). It can be done for either a full or partial move. You must obtain approval from your Transportation Office (TO) prior to performing a PPM move.', items: [
    { text: 'Ways to conduct a PPM:', items: ['Rent portable moving and storage containers', 'Rent trucks or trailers', 'Use your own vehicle and/or trailer', 'Hire a commercial moving company', 'Ship via a small package carrier (e.g., USPS, FedEx, UPS)'] },
  ] },
  { heading: 'Application for Personally Procured Move and Counseling Checklist', items: [
    'Blocks 3a-d: Ensure that your name, rank, last 4 and service agency is correct. If not, please correct, and initial.',
    'Block 4: Review order information.',
    'Block 5a: Ensure that your state of legal residence is correct.',
  ] },
  { heading: 'Block 6. Entitlements', items: [
    'a. Type of Vehicle: You can use any privately owned vehicle, direct hire and/or rental of a conveyance (with or without operator) to move HHG. Under no circumstances is the use of a government owned/leased vehicle and/or privately owned plane authorized for a PPM.',
    'b. PPM Move Authorization: You are authorized to move your HHG to/from the locations identified on your orders. If you choose to use alternate locations not identified on your orders, you will only be reimbursed up to what you are authorized.',
    { text: 'c. Maximum Authorized Weight: Your entitlements are based on the type of orders issued to you:', items: ['PCS weight allowance is based on your pay grade and whether you have or do not have dependent(s).', 'Temporary weight allowance, which is for those of you who are going on temporary duty or PCS with temporary duty en route. It is strictly for items required by you while you are on temporary duty; it is not intended for dependents. Upon completion of your temporary duty, you may ship this weight to your ultimate duty station. (NOTE: TDY/deployment for 90 or more days)'] },
    { text: 'd. Estimated Weight: This is the estimated weight for your PPM move:', items: [
      'PPM entitlement is a part of your full JTR weight allowance.',
      'You are entitled to an advancement of funds up to 60% based on your estimated weight.',
      'If you elected for an advance, the amount will be listed in block 7a. After this briefing, take this signed form to finance and provide a copy for processing.',
      'Partial PPM (PPM in conjunction with a HHG move): You must not exceed your JTR weight allowance. Your PPM will be calculated once your HHG has been delivered. Based on the weight of your delivered HHG, the rest of your weight allowance will be applied to your PPM move. Example: Your JTR weight allowance is 7,000 lbs. Your HHG shipment weighed 5,000 lbs, meaning you only have 2,000 lbs left on your entitlement. After conducting your PPM move, your weight tickets determined that you moved 3,000 lbs. Based off your remaining entitlement, you will only be reimbursed up to 2,000 lbs.',
    ] },
    { text: 'e. Unauthorized Items:', items: ['Live ammunition', 'Live animals, including birds, fish, and reptiles', 'Mobile homes, camper trailers, airplanes, farming vehicles, privately-owned vehicles (POV) such as a car, van, or truck (except motorcycle)', 'Building materials or cordwood, goods for sale or commercial use', 'Perishable items, including plants (except for local move)', 'Goods not for member or dependent use or items acquired after effective date of orders', 'NOTE: If unauthorized or hazardous items are included in a PPM, the member forfeits any monetary allowance or reimbursement. The case file is forwarded to appropriate investigative authorities.'] },
    'f. Power of Attorney: If you cannot complete your move or turn-in for processing, you must designate a Power of Attorney.',
    { text: 'g. Loss and Damage: If your HHG is lost and/or damaged due to circumstances beyond your control (vehicle accidents, leakage, fires, or thefts in which the member is free of negligence), you are entitled to file a claim under the Military Personnel and Civilian Employees Claims Act.', items: ['The government basic value coverage for loss and/or damaged items is $40,000.', 'Members should consider purchasing private insurance if they believe the basic valuation coverage is not sufficient. NOTE: The expense of additional insurance for shipment or storage is not reimbursable.'] },
    { text: 'Temporary Storage:', items: ['You are authorized storage up to 90 days.', 'You are responsible for coordinating storage and payment with storage facility.', 'You are authorized reimbursement up to 90 days. Types of storage: extension of rental time for rental truck, trailer, or portable storage container; use of mini-warehouse or commercial storage facility.', 'Documents required for reimbursement: storage contract; final receipt from storage facility; PPM weight tickets; orders.', 'You are authorized to file for a storage extension if you go beyond 90 days. Visit local TMO for assistance.'] },
  ] },
  { heading: 'Block 7. Customer Responsibility', items: [
    'a. Operating Allowance: If you elected for an advance, this is the amount you will receive to conduct your move. After this briefing, take this signed form to finance and provide a copy for processing. Finance office might require you to settle your PPM in a specific number of days. Contact your local finance office for more information.',
    'b. Start Date: You have 45 days from the start date listed here, to turn in required documents needed to process your PPM.',
    'c. Empty/Loaded Weight Tickets: You are required to submit empty and full weight tickets for every vehicle used to conduct your move. You must ensure weight tickets are legible and obtained from a certified government, commercial or public scale. Weight tickets are required. Failure to provide can result in you not getting reimbursed for your move.',
    { text: 'd. Weight Ticket Requirements. The required information on your weight tickets when you turn in your PPM for final processing:', items: ['Complete name and location of the scale', 'Date of each weighing', 'Identification of weight entries as tare, gross or net weights', 'License plate number for any POV, trailer, rental vehicle or commercial company vehicle used', 'Your full name and last 4', "Weighmaster's signature"] },
    'e. Trailers: A member who uses a personally owned utility trailer may claim the weight of the utility trailer only once in the net weight. If using a trailer to move HHG, empty and full weight tickets are required.',
    'f. DD Form 1351-2: This DD Form 1351-2 is for your PPM ONLY, not your PCS/TDY travel voucher that you will complete with Finance. This 1351-2 will be turned in to TMO with your complete PPM package. Fill out the required blocks identified by your local Transportation Office.',
    { text: 'g. DD Form 2278: In order to receive payment for this move you must submit the following to your origin/destination Transportation Office:', items: ['DD Form 2278', 'PPM checklist and certification of expenses', 'DD Form 1351-2', 'Empty and Full weight Tickets', 'Orders'] },
  ] },
  { heading: 'Blocks 8-9', items: [
    'Block 8a (1-4) Cost Computation: This block shows the estimated GCC, Advance Operating Allowance, Gross Incentive and Incentive/Reimbursement based off the weight estimate provided by the member.',
    'Block 8b: Members who request advance payment will submit a copy of this form to the local finance. Finance will complete this portion of the form.',
    "Block 9 (a-d) Member's and Counselor's date/signature: Member will sign & date 9a & b; TM Counselor will sign & date c & d.",
  ] },
  { heading: 'PPM Checklist and Certification of Expenses', intro: 'This form identifies required documentation needed to file your PPM and claim expenses. PPM incentive payment is taxable income. Claim all PPM expenses to reduce the taxed portion of your incentive.', items: [
    'Ensure all claimable expense is supported by receipts/contracts (IRS can audit tax records up to 6 years).',
    { text: 'Eligible expenses include:', items: ['Rental trucks, trailers', 'Hand/appliance dollies, and furniture pads', 'Weighing fees', 'Authorized moving company services', 'Tolls and parking fees', 'Packing & crating material'] },
    'NOTE: Examples of items that cannot be claimed: tow dollies, auto tow bars/hitches, auto transport, insurance, sales tax, general repairs, maintenance, meals, and lodging.',
  ] },
  { heading: 'PPM Turn-In', items: [
    'Keep all original PPM documents and provide copies when filing your PPM.',
    "If you're PCSing to another location, you will file your PPM at your destination Transportation Office.",
    "If you're retiring/separating, you will mail all documents to the address listed in block 5 of this form.",
    "If you're missing documentation, you must provide justification. For an example, if you're missing a weight ticket due to a vehicle accident, submit a copy of the accident report. If this is the case, contact your local Transportation Office for assistance.",
  ] },
] };

export const personalPropertyTtgs = {
  5: { file: '05. Shipment Application Process', printed: '4.2.1.1. – 4.2.1.4.; 4.2.2.1. – 4.2.2.2.; 4.2.2.7. – 4.2.2.8.', lessons: [
    { id: 'ttg5-basic', level: 'Basic', title: 'Shipment Application Process', printed: '4.2.1.1. – 4.2.1.4.', tasks: ['4.2.1.1', '4.2.1.2', '4.2.1.3', '4.2.1.4'], page: 3,
      prerequisites: ['Trainee has no prerequisites.', TIMELINE],
      references: ['AFI 24-602, Vol 4, Personal Property', 'Joint Travel Regulations (Defense Travel Management Office)', 'Defense Travel Regulations (ustranscom.mil)', `${PPCIG}`],
      supportMaterial: ['Orders'],
      outcome: 'Know how to identify valid orders and understand the shipment application process.', notes: NOTES,
      objectives: ['4.2.1.1. Verify order validity', '4.2.1.2. Analyze travel orders to determine entitlements', '4.2.1.3. Research movement entitlements', '4.2.1.4. Input shipment data and prepare documentation in applicable system of record'],
      steps: [
        { heading: 'Verify Order Validity', intro: 'The primary mission of Personal Property Operations is to ensure a smooth transition for DoD service members, Coast Guard members, civilian employees, and their families. Certain steps must be followed in order to execute properly.', items: [
          { text: 'Before preparing a movement, the customer must have valid orders. The Personal Property Technician will examine the travel orders to validate the following:', items: ["Customer's Name", 'Rank/grade', 'Social Security Number (SSN)', 'Funding (Long line of accounting/standard document number (SDN))', 'Issuing Authority'] },
          "After validation, the Personal Property Technician will analyze the orders to determine entitlements. NOTE: If there is an error identified on the customer's official travel orders, direct the customer back to the local Military Personnel Section (MPS) for correction/amendment to the orders.",
        ] },
        { heading: 'Analyze Travel Orders to Determine Entitlements', items: [
          { text: 'Travel orders will determine what the customer is authorized. The type of order will determine what entitlement is authorized for the movement of Household Goods (HHG), Unaccompanied Baggage (UB), Privately Owned Vehicle (POV), and/or Non-temporary Storage (NTS) shipments. The location & branch of service can determine if there are any restrictions/requirements for specific locations and pay grade & dependent status will determine weight authorization. The Personal Property Technician must review the following to determine entitlements:', items: ['Type of Orders (PCS, SEP, RET, TDY, etc.)', 'Location (CONUS/OCONUS)', 'Branch of Service', 'Pay Grade', 'Dependent Status'] },
          'Once reviewed, utilize the appropriate publication(s) to determine customers entitlements (e.g., DAFI 24-602v4, PPCIG, or JTR).',
        ] },
        { heading: 'Research Movement Entitlements', intro: 'Below is a list of publications and guides with directive used to determine personal property entitlements and ensure compliance with governing laws. Depending on the situation, the Personal Property Technician may have to use one or more publications to determine entitlements.', items: [
          'The DAFI 24-602v4, Personal Property Moving and Storage, serves as the Air Force Traffic Management Operations guidance for moving personal property within the Continental United States (CONUS) and Outside the Continental United States (OCONUS) locations. This publication applies to all civilian and uniformed members of the Regular Air Force, Air Force Reserve and Air National Guard. Information in this publication is cross-referenced to the JTR and provides guidance for counseling on the shipment of personal property, privately owned vehicles, mobile homes, and special circumstances. This publication can be found on the Air Force Publication Website.',
          'The Joint Travel Regulations (JTR) provides travel and transportation policies, laws and allowances for all Uniformed Service members and DoD civilian employees and their dependents. This regulation is located on the Defense Travel Management website.',
          'The Defense Travel Regulation (DTR) prescribes procedures and guidance and assigns responsibilities for performing traffic management functions for the movement and storage of personal property, POV, and mobile homes. The DTR is composed of seven parts; Part IV contains the instructions on movement of personal property.',
          "The Personal Property Consignment Guide (PPCIG) provides branch of service requirement, shipment restrictions and routing instructions for OCONUS locations and GBLOC information for all CONUS locations. The PPCIG is located on the United States Transportation Command's website.",
        ] },
        { heading: 'Input Shipment Data and Prepare Documentation in Applicable System', items: [
          { text: 'Once orders have been validated and entitlements determined, the Personal Property Technician will input and/or validate the following information in the applicable system of record:', items: ['Order Number, Order Date, and Issuing Headquarters', 'Fund Cite (IAW Service specific guidance)', 'Rank, Name, Dependent Status', 'Location (Losing/Gaining Assignment)', 'Estimated Weight', 'Pro-Gear', 'Type of Move'] },
          'Once information has been entered into the system of record, depending on the type of move, the system will produce movement documents (e.g., DD Form 1299, Application for Shipment and/or Storage of Personal Property, DD Form 1797, Personal Property Counseling Checklist, DD Form 2278, Application for Do It Yourself Move and Counseling Checklist). The Personal Property representative will review them with customer to ensure their validity through an interactive process.',
        ] },
      ],
      exercises: [
        'Demonstrate validating travel orders. Explain what makes orders invalid.',
        'Demonstrate searching the Joint Travel Regulation. Find the table that references the PCS and NTS Weight Allowances. What is the weight allowance for an E-5 with dependents?',
        'Utilizing the PPCIG, find the country instruction for Germany.',
        'Demonstrate the ability to identify required data from orders needed to prepare shipment documents in the applicable system of record.',
        'Utilizing shipment documents from applicable system of record, demonstrate counseling members and employees.',
      ] },
    { id: 'ttg5-intermediate', level: 'Intermediate', title: 'Shipment Application Process: Exceptions and Restrictions, BLUEBARK, and Advisories', printed: '4.2.2.1. – 4.2.2.2. & 4.2.2.7. – 4.2.2.8.', tasks: ['4.2.2.1', '4.2.2.2', '4.2.2.7', '4.2.2.8'], page: 7,
      prerequisites: ['Complete Basic Requirements.', TIMELINE],
      references: ['DAFI 24-602v4, Personal Property', 'Joint Travel Regulations (Defense Travel Management Office)', 'Defense Travel Regulations (ustranscom.mil)', PPCIG, 'United States Transportation Command Website (https://www.ustranscom.mil/dp3/pdfs.cfm)', 'Personal Property Activity Headquarters SharePoint (https://usaf.dps.mil/teams/aetc-lak-hqppa/default.aspx)'],
      supportMaterial: ['Orders'],
      outcome: 'Know how to identify valid orders and understand the shipment application process.', notes: NOTES,
      objectives: ['4.2.2.1. Determine Exceptions, Restrictions, and CONUS/OCONUS Requirements', '4.2.2.2. Describe BLUEBARK procedures and entitlements', '4.2.2.7. – 4.2.2.8. Personal Property Advisories/Disseminate PPTY guidance to base populace'],
      steps: [
        { heading: 'Determine Exceptions, Restrictions, and CONUS/OCONUS Requirements', intro: 'At times there are circumstances that will affect HHG entitlements. You, as the Personal Property representative, must know which regulatory guidance to use to properly inform the customer and ensure their move is seamless.', items: [
          { text: '1. Authorized PCS Weight Allowances', items: [
            'Depending on the OCONUS location, PCS weight allowance may be administratively restricted. Factors such as limited space, limited storage for excess HHGs or provided fully furnished government quarters may be the reason. See the Administrative HHG Weight Allowance Locations located in the JTR to determine which locations applies. In addition to the JTR, utilize the PPCIG to determine other country restrictions and customs requirements.',
            'Affected members have the option to place their goods in Non-temporary Storage for the duration of their overseas tour. If restricted weight limit is insufficient, the service member may request an exception through the Secretarial Process. Exceptions may be granted based on the circumstances listed in JTR 051402, C.',
            'Review JTR 051402 and DAFI 24-602v4 Attachment 2, to see other exceptions to authorized weight allowance.',
          ] },
          { text: '2. Separations', items: [
            'Members separating under honorable or general conditions are authorized HHG transportation to their home of record or place of enlistment and a NTS shipment with storage to 180 days. Members can elect alternate location, however, may be subject to excess cost.',
            'When members are separating within CONUS under "other than honorable" conditions, neither HHGs transportation nor NTS is authorized. For OCONUS members separating "other than honorable" see JTR 052009.',
          ] },
        ] },
        { heading: 'Describe BLUEBARK Procedures and Entitlements', intro: 'The shipment of a deceased member\'s personal property is labeled as a "BLUEBARK." The member\'s next of kin is entitled to receive the shipment of the personal property. Counseling Offices will provide clarification and assistance, as needed.', items: [
          { text: 'Utilize the DTR Part IV, Chapter B-408; JTR; and DAFI 24-602v4 to describe the entitlements for a BLUEBARK shipment. At minimum discuss the following:', items: ['Responsibilities of the Casualty Assistance Officer (CAO), Summary Courts Officer (SCO) or Next of Kin (NoK) as applicable', 'The responsibility of the Outbound Personal Property Operations', 'The responsibility of the Inbound Personal Property Operations', "The Quality Assurance's (QA) role"] },
        ] },
        { heading: 'Personal Property Advisories/Disseminate PPTY Guidance to Base Populace', ordered: true, items: [
          'The purpose of advisories is to provide Traffic Managers essential updates when there are issues affecting day-to-day operations.',
          'Advisories bring awareness and provide temporary or permanent solutions to critical issues. Traffic Managers must be aware of these advisories to make the necessary adjustments and/or inform customers.',
          { text: 'Traffic Managers must subscribe or know where to locate advisories. Personal Property advisories are primarily received from the following entities:', items: ['Personal Property Headquarters (PPA HQ)', 'United States Transportation Command (USTC)'] },
          { text: 'When advisories come down, the Personal Property personnel must review, interpret, and apply specific guidance/policy to Personal Property Operations. Disseminate personal property guidance received from higher headquarters to the base populace. Some examples of avenues to utilize to disseminate the information would be:', items: ['Social media', "Installation's Public Affair announcements", 'Notice to Airman (NOTAM) to base E-Mail', "Commander's Calls", 'NOTE: These are just examples of (not limited to) avenues that CAN be utilized to disseminate information to the base populace. Please seek Installation guidance from your Installation Transportation Officer on the method of choice for distribution.'] },
        ] },
      ],
      exercises: [
        'In the JTR, locate the link for "Administrative Household Goods (HHG) Weight Allowance Locations." Determine the weight allowance for a USAF Service member PCSing accompanied to Kuwait.',
        'Go to the PPA HQ SharePoint or USTC website. Locate published advisories. Pull up one advisory for review. Interpret advisory and brief your trainer.',
        'Explain BLUEBARK entitlements and procedures.',
      ] },
  ] },

  6: { file: '06. Communicating PPTY Entitlements', printed: '4.2.1.5., 4.2.2.3., & 4.2.3.1.', lessons: [
    { id: 'ttg6-basic', level: 'Basic', title: 'Communicating Entitlements, Resources, and Moving Processes Through Shipment Completion', printed: '4.2.1.5.', tasks: ['4.2.1.5'], page: 3,
      prerequisites: ['Trainee has no prerequisites.', TIMELINE], references: ['DAFI 24-602V4', 'JTR', 'DTR'],
      supportMaterial: ['DP3 Counseling Requirements – FINAL v1.2 (18 NOV 2021), DP3 Website (USTRANSCOM)'],
      outcome: 'Know how to effectively communicate entitlements, resources and moving processes through shipment completion.', notes: NOTES,
      objectives: ['4.2.1.5. Communicate entitlements, resources and moving processes through shipment completion.'],
      steps: [
        { heading: 'Communicating Effectively', intro: "An essential mission of the Personal Property Operations is to ensure standardized customer service is experienced and provided to DoD service members, Coast Guard members, civilian employees, and their families. In Personal Property, the technician must be able to interpret regulatory guidance, effectively communicate entitlements and provide resources to enhance the customer's move. Effective communication is important because it can have a positive or negative impact on the customer's move.", items: [] },
        { heading: 'Communicating Entitlements', intro: "In the previous training guide, you have learned how to research and brief entitlements. You as the Personal Property Technician must ensure customers understand the do's & don'ts to avoid excess cost, out-of-pocket expenses, or delays. The Personal Property Technician will utilize the appropriate publications and advisories to brief the customer. To enhance counseling skills, the Personal Property Technician should review the following references:", items: [
          { text: 'DAFI 24-602v4:', items: ['8.4 Personally Procured Move (PPM)', '11.2 Household Good (HHG)', 'Attachment 9 Home of Record (HOR)'] },
          { text: 'DTR Part IV:', items: ['Appendix A-M Defense Personal Property Program Counseling (DPS/ETOPS)', 'B-402 Counseling (MilMove GHC)'] },
          'Defense Personal Property Counseling Requirements (USTC DP3 Website).',
        ] },
        { heading: 'Resources and Providing Customer Service Through Shipment Process', intro: "Once the customer's shipment is picked up at origin, the moving process does not end there. Shipment completion does not end until delivery at the destination. At times, you as the Personal Property Technician may have to get involved to follow-up or provide additional information throughout a customer's move (e.g., reshipment of same property, reweigh, providing shipment status…etc.). In most cases, assistance required from Personal Property technicians may only be for informational purposes. Throughout shipment completion, brief members and civilian employees of all entitlements and resources pertaining to their move. Below are some helpful information and resources to guide customers during their move:", items: [
          'Answer questions', 'Further explain entitlements/provide reg reference(s)', 'QA contact information', 'When to expect contact from TSP', 'Confirm shipment is booked/Confirm TSP information', 'Assistance with DPS', 'PPM information (unauthorized items, weight scale locations...etc.)', 'Origin/Destination JPPSO/PPSO', 'Military OneSource website', 'PCSmyPOV website', 'Claims Process', 'Customer Satisfaction Survey',
          'NOTE: Any reoccurring trends should be identified as well. For an example, issues with customers performing PPMs prior to receiving orders, missing PPM weight tickets, missed pick up dates…etc. If problems occur, ensure future customers are informed to prevent reoccurrence. If necessary, host townhall meetings or utilize Public Affairs outlets to get the word out to the base populace.',
        ] },
      ],
      exercises: [
        'Complete a household good shipment within the applicable system of record. (a) Print the DD Form 1299, Application for Shipment and/or Storage of Personal Property form and the Personal Property Counseling Checklist. (b) Assemble briefing documents and demonstrate the ability to review/brief forms to customer.',
        "Demonstrate the ability to query and validate a service member's shipment status utilizing the applicable system of record. (a) Explain how to determine if a shipment has been submitted by the Personal Property Technician. (b) Demonstrate the ability to locate TSP information within the applicable system of record.",
      ] },
    { id: 'ttg6-intermediate', level: 'Intermediate', title: 'Communicating Accessorial Services and Excess Cost', printed: '4.2.2.3.', tasks: ['4.2.2.3'], page: 6,
      prerequisites: ['Complete Basic requirements.', TIMELINE], references: ['DAFI 24-602V4', 'JTR', 'DTR'],
      supportMaterial: ['DP3 Counseling Requirements – FINAL v1.2 (18 NOV 2021), DP3 Website (USTRANSCOM)'],
      outcome: 'Know how to effectively communicate accessorial and excess cost entitlements.', notes: NOTES,
      objectives: ['4.2.2.3. Communicate excess cost and accessorial services responsibilities and procedures'],
      steps: [
        { heading: 'Excess Charges', intro: 'Service members/employees can incur excess charges as a result of special services performed, excess weight, or request for higher cost mode. When excess cost is expected, the member will be financially responsible. As the Personal Property Technician, you must inform the customer on any possible excess cost then follow the origin or destination responsibilities listed in DAFI 24-602V4, Chapter 12, Excess Cost Responsibilities/Procedures.', items: [] },
        { heading: 'Government Maximum Obligation', intro: 'According to the JTR 051301 para-A, service members can move their property in as many lots as desired from one or multiple locations. However, the government maximum obligation is limited to the cost of transporting the member\'s maximum HHG weight allowance in one lot between authorized locations at the Government\'s "Best Value" cost. A member may be subject to excess cost for moving HHGs in more than one lot or shipping to a location not authorized on their orders (See JTR 051301, para-B, Table 5-35 for authorized locations). When this is the case, conduct a cost comparison, brief the customer, and follow the origin/destination responsibilities listed in DAFI 24-602V4, Chapter 12. JTR paragraph 051306 lists ways members can incur excess charges, for example:', items: [
          'Exceeding the authorized weight allowance', 'Choosing to ship to an alternate location that cost more', 'Transportation of articles that are not HHG', 'Request for special routing or services', 'Transportation cost caused by negligence', 'More than one HHGs shipment from same origin to the same point of destination lot',
        ] },
        { heading: 'Avoid Excess Cost', intro: 'Ensure customers avoid the following to prevent excess cost:', items: [
          'Avoid scheduling extra shipments when basic household goods shipments are from the same point of origin and going to the same destination.',
          'Avoid shipping unauthorized items. If unauthorized items are discovered in a shipment, the member will incur extra costs.',
          'Dispose of unwanted items to avoid excess weight.',
          'Make sure the customer or a designated agent is available at the pickup and delivery addresses between 8:00am and 5:00pm on the date that the packers and movers are scheduled to arrive. If there is an attempted delivery/pick-up, the member will incur excess cost.',
        ] },
        { heading: 'Accessorial Service', intro: 'Any special services provided/performed by a carrier that are beyond their normal services is considered accessorial service. If approved by the Traffic Management office, the government will cover the cost. However, if the member requests special services they will be financially responsible. Some examples of accessorial services include:', items: [
          'Crating (furniture with unique features)', 'Debris Removal', 'Servicing Front-Load Washer', 'Shuttle Services', 'Extra Pick-up/Delivery',
          { text: 'Items requiring special services will be identified by the TSP during the pre-move survey. The TSP will then submit a pre-approval to the Traffic Management Office for approval/disapproval. At the time of pick-up/delivery, the TSP will present the DD Form 619, Statement of Accessorial Services Performed to the customer for signature. The customer must verify service(s) were rendered before signing. During the counseling session, brief the member on the following:', items: ['Never sign a blank DD Form 619', 'Verify the quantity, type of containers, and any accessorial services identified by the TSP', 'Ensure new cartons are utilized for clothing, linens, bedding, mattresses, and box springs. Used cartons may be utilized for other items but must be in good condition. All marks pertaining to a previous shipment must be obliterated.'] },
        ] },
      ],
      exercises: [
        "Demonstrate the ability to brief a customer of their allowances, special services, accessorial services, and potential for excess cost with the following request: Member is an E-5 with dependents PCSing from Ramstein AB, Germany to Lackland AFB, Texas. The member has a special oil painting, that they have requested to be crated with premium packaging. The shipment is estimated to weigh 11,500 lbs. They live on a very narrow road, that will require a shuttle. (i) What is the member's weight allowance? (ii) What service did the customer request? (iii) What accessorial service did the member require? (iv) Is there any potential excess cost?",
        'Demonstrate completing a cost comparison form and briefing the customer on possible excess cost.',
      ] },
    { id: 'ttg6-advanced', level: 'Advanced', title: 'Plan Personal Property Briefings', printed: '4.2.3.1.', tasks: ['4.2.3.1'], page: 9,
      prerequisites: ['Complete Intermediate requirements.', TIMELINE],
      references: ['DAFI 24-602, V4 (https://www.e-publishing.af.mil/)', 'JTR, Joint Travel Regulations (dod.mil)', 'DTR (ustranscom.mil)'],
      supportMaterial: ['Counseling Requirements DTR Part IV, B-402 and Appendix A-M'],
      outcome: 'Know how to effectively plan personal property briefings.', notes: NOTES,
      objectives: ['4.2.3.1. Plan personal property briefings'],
      steps: [
        { heading: 'Types of Briefings', intro: 'The Personal Property Technician will be responsible for planning personal property briefings for all members and employees. Some examples of type briefings include but not limited to are:', items: ['One-on-one briefings', 'Mass briefings (HHG/UB/NTS/PPM)', 'Virtual briefings (e.g., video chat, teleconference, e-mail, TEAMS, etc.)'] },
        { heading: 'Planning Briefings', items: [
          'Scheduling: It is recommended to schedule briefings at least 3-4 weeks prior to the requested pick-up date (this is to ensure important information is given in a timely manner, preparing the customer for the move). NOTE: Expedite short fuse shipments to get the customer booked in a timely manner (if possible). If a shipment cannot be booked by the desired date, recommend alternatives such as PPM or Power of Attorney.',
          "Be Prepared: The best way to be comfortable with briefing is to be knowledgeable on the subject. Be familiar with entitlements for HHG, UB, NTS and PPM shipments. Research regulatory guidance and acquire as much information for each move. Also, utilize the Defense Personal Property Counseling Requirements (USTC DP3 Website), to maintain a standardized level of excellence for the customer's relocation experience.",
          'Group Briefings: If possible, group common briefings. For an example, conduct HHG/NTS briefings Mon, Wed & Fridays, PPMs on Tues & Thurs and Overseas briefing on Tues and Thurs. This is to ensure pertinent information is given to the right group and does not interrupt the flow of the briefing.',
          'Uniformity: Ensure counselors are briefing the same information. When conducting the HHG/UB/NTS briefings, use the DD Form 1797, Personal Property Checklist and/or DD Form 2278, Application for Do It Yourself Move and Counseling Checklist for PPM as guide. This is to prevent miscounseling, ensure entitlements are covered and customers understand their responsibilities as well as the TSP. The two example briefings embedded in the TTG are below.',
        ] },
      ],
      attachments: [counselingChecklist, ppmBriefing],
      exercises: [
        'Utilizing the DD Form 1797, demonstrate the ability to brief NTS entitlements.',
        'Utilizing the JTR Appendix A, find the definition of HHG. Explain what is not considered HHGs.',
        'Utilizing DAFI 24-602 V4, explain when CONUS to CONUS POV shipment is authorized.',
        'If authorized, what is required to ship a firearm OCONUS?',
      ] },
  ] },

  7: { file: '07. PPM', printed: '4.2.2.4. – 4.2.2.5.', lessons: [
    { id: 'ttg7-finalize', level: 'Intermediate', title: 'Finalize PPM and Storage Reimbursement', printed: '4.2.2.4.', tasks: ['4.2.2.4'], page: 3,
      prerequisites: ['Trainee will complete Basic requirements.', TIMELINE], references: ['DAFI 24-602V4', 'Joint Travel Regulations', 'Defense Travel Regulations'],
      additionalReferences: ['PPA HQ Advisory 21-005, Personally Procured Move (PPM) Receipts/Checklist & Expense Certification Form', 'PPA HQ Advisory 21-006, Service member and employee submissions of DD Form 2278, Application for Do It Yourself Move and Counseling Checklist, for Personally Procured Move (PPM) to Financial Services Office (FSO)'],
      supportMaterial: ['Orders', 'DD Form 2278', 'Weight Tickets', 'Applicable Receipts'],
      outcome: 'Know how to finalize a PPM and storage reimbursement.', notes: NOTES,
      objectives: ['4.2.2.4. Finalize PPM and storage reimbursement'],
      steps: [
        { heading: 'Finalize PPM', intro: "The Traffic Management Office will be responsible for PPM/Storage closeout once the customer's relocation is complete.", items: [
          { text: '1. Verify the Remaining Weight. If the customer completed multiple shipments under the same order, the Personal Property technician must verify the remaining weight entitlement. All moves must be delivered to prevent overpayment of the PPM.', items: [
            "Login to the system of record and review the customer's shipment(s) on the applicable order number.",
            'If other shipments exist, once the property has been delivered, calculate the total weight of personal property moved on the current orders.',
            'The remaining weight will be applied to the PPM entitlement. Example: the member is authorized 11,000 lbs. They elected to do a government move as well as a partial PPM. The final weight of the government move was 7,000 lbs. This means 4,000 lbs is remaining on their current entitlement. If the member PPM weighed 5,000 lbs, they are authorized reimbursement up to the 4,000 lbs which is their remaining weight entitlement.',
          ] },
          { text: '2. Review Required Documents and Verify Weight Ticket(s) are Valid', items: ['Review required documents needed to complete the PPM. Ensure documents are completed and signed', 'Validate weight tickets for each POV used for the move', 'Ensure required information is on the weight tickets', 'If weight tickets or documents are missing, the member must provide justification', 'If justification is approved by the ITO, print documents, and compute the constructive weight(s) in accordance with the Joint Travel Regulation, Chapter 5.'] },
          { text: '3. Complete PPM in System of Record', items: ['Go into the Shipment Management Tab', 'Go into the Search/Reports', 'Go into the Find Shipments/Customer', "Enter the customer's SSN or DoDI", 'Select PPM Awaiting Closeout under Shipment Status', 'Select the View/Edit Shipment for the applicable PPM', 'Enter the validated weight into the applicable system of record to compute the Government Constructive Cost (GCC).'] },
          { text: '4. Finalize PPM. The system of record will populate a complete DD Form 2278, Application for Do it Yourself Move and Counseling Checklist.', items: ['Printout completed DD Form 2278', 'Review all documents to ensure information is correct', 'If everything is correct, complete blocks 11a-d on the DD Form 2278', 'Upload all documents to appropriate data storage repository', 'Return the packet to the customer and instruct them to turn it into Finance for payment.'] },
        ] },
        { heading: 'Finalize Personally Procured Storage', items: [
          { text: '1. Documents needed to file storage reimbursement', items: ['Storage contract', 'Storage receipt', 'Weight tickets (empty & full)', 'Orders'] },
          { text: '2. Review Required Documents', items: ['Verify that an approved storage facility was used by reviewing the contract and receipt(s)'] },
          { text: '3. Complete Storage Reimbursement', items: ['Compute the NTS GCC per DTR Part IV, Chapter 411', 'Review all documents to ensure information is correct', 'Upload documentation into appropriate data storage repository (e.g., cPPPO (Marks))', 'Return completed documentation to member to turn into Finance for processing'] },
        ] },
      ],
      exercises: [
        'Explain what documents are needed to process a storage reimbursement.',
        'Log into system of record and demonstrate processing a PPM.',
        'Log into system of record and demonstrate processing a storage reimbursement.',
        'Review the PPM chapter in DAFI 24-602v4. Explain how you would guide a customer that is missing required documentation to finalize their PPM.',
      ] },
    { id: 'ttg7-no-approval', level: 'Intermediate', title: 'Assist Members with Shipments Performed without Prior Approval', printed: '4.2.2.5.', tasks: ['4.2.2.5'], page: 6,
      prerequisites: ['Trainee will complete Basic requirements.', TIMELINE], references: ['DAFI 24-602V4'],
      supportMaterial: ['Orders', 'DD Form 2278', 'Weight Tickets', 'Applicable Receipts'],
      outcome: 'Know how to assist customers with shipments performed prior to approval.', notes: NOTES,
      objectives: ['4.2.2.5. Assists members with shipments performed without prior approval'],
      steps: [
        { heading: 'Personally Procured Transportation and/or NTS of HHG without Prior Approval', intro: 'According to DAFI 24-602V4, para 8.4, it states, "It is imperative that members in receipt of orders, obtain counseling and authorization for their moves." However, there are times when situations occur beyond a member\'s control during their PCS move. When this happens, the member may be forced to make decisions out of the norm. During this frustrating time, the Personal Property technician must remain patient and guide them through this process.', items: [
          { text: "The ITO may authorize monetary allowance when an event beyond the member's control prevents prior approval and issuance of the DD Form 2278. Eligibility Requirements:", items: ['Member must provide justification (MFR) for completing move prior to authorization', 'Must have orders prior to move or funded housing assignment/termination', 'Member must obtain weight tickets or qualify for constructed weight'] },
          'If the member does not have weight tickets, the Transportation Office must certify using the constructed weight.',
          'If the case seems questionable, forward case to Customer Service at PPA HQ for review.',
          'If everything is validated, and all required documentation has been obtained, closeout the PPM.',
        ] },
        { heading: 'Members That Move Without Prior Approval & Without Orders', items: [
          'DAFI 24-602V4 para 8.12 states, "the member must possess a special order or funded housing assignment/termination authorization prior to accomplishing the move to qualify for an allowance."',
          'Members who complete a PPM without orders will not qualify for a PPM allowance.',
          'Members who complete a PPM without orders but have a strong justification as to why the move was complete prior to the issuance of orders must forward their case to the BCMR.',
        ] },
      ],
      exercises: ['Review DAFI 24-602v4, Chapter 8. Explain when the use of constructed weight is considered.', 'Explain how the constructed weight for PPM is obtained.'] },
  ] },

  8: { file: '08. PPTY Rebuttals and BCMR Requests', printed: '4.2.2.6.', lessons: [
    { id: 'ttg8-rebuttals', level: 'Intermediate', title: 'Identify Excess Cost and Assist Members With Rebuttals and BCMR Request', printed: '4.2.2.6.', tasks: ['4.2.2.6'], page: 3,
      prerequisites: ['Complete Basic requirements.', TIMELINE], references: ['DAFI 24-602V4, Chp. 12'],
      outcome: 'Know how to process excess cost rebuttals and assist customers with BCMR request.', notes: NOTES,
      objectives: ['4.2.2.6. Identify excess cost and assist members with rebuttals and BCMR request'],
      steps: [
        { heading: 'Rebuttal Procedures', intro: 'Previously you learned member/employee can incur excess cost. When excess cost exists, the customer is required to reimburse the government. You as the Personal Property Technician will inform the customer of the excess cost and follow the instructions listed in DAFI 24-602V4, Chp 12, para 12.3. If the member/employee does not agree with the excess charges, they have the option to submit a rebuttal or BCMR request.', ordered: true, items: [
          { text: 'Review DAFI 24-602V4, Chp. 12 para 12.4, Member/Employee Responsibilities. Members can file an excess cost rebuttal for the following:', items: ['Shipment and storage of PPTY', 'POV shipment'] },
          'You as the Personal Property Technician will assist the customer in preparing their rebuttal.',
          'When submitting the final case, the member must include all supporting documentation supporting their justification.',
          'Forward case to PPA HQ/ECAF for approval/disapproval.',
          'If the rebuttal is disapproved, the member will be required to pay. If the member disagrees, follow the instructions in DAFI 24-602V4 12.2.1 - 12.3.9.',
        ] },
        { heading: 'Air Force BCMR Request', ordered: true, items: [
          { text: 'The BCMR has the authority to correct military records as well as forgive indebtedness. Those eligible are:', items: ['Military members', 'Former members', 'Dependents or heirs of deceased members'] },
          'To file a case the member must have completed the rebuttal process with PPA HQ/PPEX.',
          'Members must submit a DD Form 149. All supporting documentation is required including the final adjudication from PPA HQ/PPEX.',
          "If the member's BCMR request is approved, PPA HQ/PPEX will modify/terminate charges.",
        ] },
      ],
      exercises: [
        'Review DAFI 24-602V4, Chp. 12. When it comes to submitting rebuttals, what is considered "acceptable evidence" to support the member\'s case?',
        'When excess cost is identified, explain the responsibilities of the origin TO for members and employees in pay and non-pay status.',
      ] },
  ] },

  9: { file: '09. Quality Assurance Operations', printed: '4.2.3.2. – 4.2.3.7.', lessons: [
    { id: 'ttg9-qa', level: 'Advanced', title: 'Quality Assurance Operations', printed: '4.2.3.2. – 4.2.3.7.', tasks: ['4.2.3.2', '4.2.3.3', '4.2.3.4', '4.2.3.5', '4.2.3.6', '4.2.3.7'], page: 3,
      prerequisites: ['Trainee must complete Intermediate requirements.', TIMELINE],
      references: ['DAFI 24-602V4, Chp 14', 'DTR Part IV Chp A-405', 'DTR Part IV, Appendix A, B, E & P (https://www.ustranscom.mil/dtr/index.cfm)'],
      additionalReferences: ['DoD 5500.7-R, The Joint Ethics Regulation', 'PPA HQ Training Resources (dps.mil)'],
      supportMaterial: ['Quality Assurance (QA) Pre/During/Post (PDP) Inspection Training Guide', 'DD Form 1812, Warehouse Inspection Report', 'DD Form 619'],
      outcome: 'Know how to utilize and interpret publications & (the sentence ends here in the TTG)', notes: NOTES,
      numbering: 'The TTG\'s criterion objective is cut off after "Know how to utilize and interpret publications &". Its task steps header lists 4.2.3.2 – 4.2.3.6, but its objectives and cover include 4.2.3.7.',
      objectives: ['4.2.3.2. Conduct residential/warehouse inspections IAW regulatory and service contracts', '4.2.3.3. Resolve issues between member and civilian employees concerning TSP discrepancies', '4.2.3.4. Report installation personal property data and carrier violations to HHQ', '4.2.3.5. Execute punitive action processes', '4.2.3.6. Validate services rendered by TSPs', '4.2.3.7. Describe TSP reconciliation process'],
      steps: [
        { heading: 'Quality Assurance Information Sources', intro: 'The DTR Part IV, the International Tender, the Domestic 400NG Tariff, and other guidance provided by USTRANSCOM specify the requirements of service that the TSP agrees to fulfill in the movement of DoD sponsored personal property shipments. The provisions of these business rules and specific QA requirements in the DTR Part IV provide guidance for the use of QA procedures for all shipments processed in the Defense Personal Property Program (DP3).', items: [
          'DTR Part IV, Chp A-405 (Quality Assurance): This chapter provides an overview of the DP3 Quality Assurance program, including inspection volume requirements, what shipments to inspect and when to inspect shipments. Chapter A-405 prescribes the forms used for inspections and provides requirements for TSP performance files. It also details punitive actions policies and procedures.',
          { text: 'DTR Part IV, Appendix A-P (Guidelines for the Quality Control Inspector): This appendix details qualifications, resources and procedures for QA Inspectors and inspections at both origin and destination as well as basic records guidance. According to this reference, the skills needed to be an inspector include:', items: [
            'Communicate effectively in writing and orally. Every observation requires a record for later evaluation of the TSP or contractor or as information for use by the member/employee or the Government. These reports must be clear, concise, and accurate. Inspectors, because of their direct contact with the member/employee and TSP, must be adept at personal property counseling.',
            'Work effectively under stress. The inspector must arbitrate differences between TSP personnel and member/employee without being intimidated by either party. Decisions must often be made at the scene without coordination with higher authority. These decisions must be made based on broad working knowledge to avoid criticism and delays.',
            'Work independently and effectively plan day-to-day activities. Under many circumstances, inspector positions may be scarce. This means that inspectors are often working alone as they conduct inspections. To that end, they must be able to work independently and manage/plan their workload each day with minimal intervention from supervisors or coworkers.',
          ] },
          'DTR Part IV, Appendix A-E (Warehouse Inspections): This appendix details procedures on how to perform warehouse inspections.',
          'DTR Part IV, Appendix A-B (Tender of Service): This appendix details qualifications, resources, and procedures for TSP. When agreeing to move shipments for the DoD, each TSP agrees to perform prudent traffic management per the DTR TOS.',
          'DAFI 24-602V4 (Chapter 14), Personal Property Quality Control provides service specific guidance for Air Force Quality Control Inspectors. It includes Inspector qualification, AF inspection standards and training requirements.',
          'The 400NG Domestic Tariff. This document is the principal DoD domestic tariff that governs the transportation of household goods, personal effects, property, and other similarly defined articles in all points of the CONUS. This tariff was developed by USTRANSCOM in partnership with all the Military Services and commercial industry associations. The tariff contains two components: (1) a printed tariff that contains the governing rules and regulations and an explanation of the transportation charges and the additional services that apply (2) an electronic rating engine programed into DPS that calculates transportation charges and the rates (discounts) that apply for additional services performed in the U.S. and then computes the cost of moving the shipments. Transportation charges in this tariff include shipment loading at the point of origin, vehicle transportation to point of destination, and shipment unloading at destination. Transportation charges in this document do not include the additional services (also known as accessorial services).',
          'The International Tender (IT). The IT is similar in content to the 400NG Tariff and provides guidelines, rules, regulations, and other information required to participate in the movement of personal property worldwide. This Tender is applicable to DoD-approved TSPs eligible to transport household goods, unaccompanied baggage, and boat shipments between designated rate areas including inter-theater, intra-theater shipments, and intra-country shipments. This tender gives QA personnel a baseline of what to expect and also allows TSPs to file rates.',
        ] },
        { heading: 'Perform Residential and Warehouse Inspections IAW Regulatory and Service Contracts: Residential Inspections', items: [
          'The DTR outlines the inspection goal as not less than 50 percent and must be set by individual Service policy. DAFI 24-602V4 para 14.1.1, outlines the Air Force inspection goal as, "80 percent of all personal property shipments in their area of responsibility."',
          'Telephonic and virtual inspection are authorized when physical inspections are not feasible, however, these inspections will not count towards meeting this AF 80 percent standard. When conducting an inspection via telephone, utilize the checklist provided in DAFI 24-602V4 Attachment 10.',
          'Before conducting inspections, the inspector must determine the property location, the TSP performing the services, the type of shipment, and the pack, pickup or delivery date and time.',
          "When essential, the QA Inspector can contact the TSP's dispatcher for an estimate of the pickup or delivery time to ensure the member or a designated representative is at the residence.",
          'When the workload exceeds capability, the inspector must decide which jobs will not be inspected. Such as jobs that are: the least urgent or involve the most time. When geographically feasible, BLUEBARK shipments will be given priority.',
          'Inspectors should comply with Origin & Destination Inspection requirements listed in DAFI 24-602V4, Chp 14, DTR Part IV A-405 and DTR Part IV Appendix P.',
          'Inspectors must be familiar with the Tender of Service (TOS) and ensure TSPs are following terms and performance requirements.',
          'Identify and address poor performance, assist customers on moving day, and ensure adequate review of preapprovals.',
          'Initiate punitive actions against moving companies who have violated terms specified in the TOS.',
          'Once inspections are complete, input results in applicable system of record.',
        ] },
        { heading: 'Warehouse Inspections', intro: 'The Storage Management Office (SMO) and/or the QA Inspector will conduct a warehouse inspection. DTR Part IV, Appendix E provides general instructions on how to complete a warehouse inspection.', items: [
          'Pre-plan inspection by reviewing previous findings, complaints, or other general information',
          'Conduct inspection IAW DTR Part IV Appendix E, para B, C & D',
          'Review the DD Form 1812, Warehouse Inspection Report. This form is to be utilized when performing warehouse inspections. Follow preparing instructions listed in DTR Part IV Appendix E, para F, Instructions for Preparation of the DD Form 1812.',
          'Once the inspection is complete, brief rating & results to management officials and distribute the DD Form 1812 IAW DTR Part IV Appendix E.',
        ] },
        { heading: 'Resolve Issues Between Member and Civilian Employees Concerning TSP Discrepancies', intro: 'It is important that the inspectors have a strong personal property background. While conducting inspections, there are times you might have to resolve issues between the member/employee and TSP. If this occurs, you as the Quality Control inspector must be able to think on your feet, maintain professionalism, remain tactful and deescalate the situation.', items: [
          'If the demands of a member/employee exceed the service agreed to by the TSP and the Government, the inspector must support the TSP and notify the member/employee accordingly. TSP representatives that are unfamiliar with personal property shipping requirements will require counseling by the inspector. This is especially important during summer months when the TSPs may increase the use of summer hire employees.',
          'Service to Members/Employees. Maximum service to customers must always be forefront in the mind of the inspector. However, the entitlements established by law and the regulations of the military department concerned cannot be exceeded.',
          'Review DTR Part IV, Appendix P, para F which provides guidance on conduct of the inspector when faced with conflict situations.',
        ] },
        { heading: 'Report Installation Personal Property Data and Carrier Violations To HHQ / Execute Punitive Action Processes', intro: "Some DTR Part IV TOS violations may be serious enough to warrant punitive action. Similarly, there could be certain TSPs who repeatedly violate business rules. When a TSP violates any provision of its agreement and/or business rules, the PPPO (working with the PPSO) may issue a letter of warning (LOW) or letter of suspension (LOS). QA Inspectors must be knowledgeable of warehouse requirements in order to identify and correct substandard facilities. Inspectors may also recommend higher level actions, such as program non-use, to USTRANSCOM. Along with direct observation by an inspector or customer, CSS comments may be used as supporting evidence in the issuance of a LOW/LOS. Regardless, prior to taking punitive actions, the issuing authority must take into consideration the severity of the violation, impact on the DoD customer, the quality of the TSP's past performance, and the actions the TSP may have taken to correct the deficiencies. To execute administrative actions, refer to DTR Part IV, chp A-405 para D-G. QA actions in the DP3 are summarized below:", items: [
          "LOW: serve as notice to a TSP that if violations or performance problems continue, suspension action may follow. LOWs are generated via the PPSO who must input the TSP's violations into DPS. When a TSP commits the same violation three or more times during a 180-day period, suspension action may be considered.",
          'A LOW may be issued for any violation(s) and is not limited to those listed on the DD Form 1780, Shipment Evaluation, and Inspection Record.',
          { text: 'LOW, DD Form 1814, Carrier Notice Form is issued by the PPSO to a TSP for unacceptable performance. The QA Inspector should mark the form appropriately and have the following information to support the LOW, at minimum:', items: ["DoD customer's name.", 'BL number.', 'The DTR Part IV reference or regulation for the violation that resulted in a LOW.'] },
          'The TSP may view the DD Form 1780, which supports the warning in DPS. Notification of the LOW is sent to the TSP via DPS. Unless a written response is requested by the PPSO, TSPs are not required to respond to LOWs.',
          'LOS: is used to temporarily suspend a TSP from getting additional business for a specific amount of time. All LOS are overt actions by the PPSO to ensure the suspension action is appropriate and not due to system error. When a LOS is issued, DPS notifies the TSP of the suspension action.',
          { text: 'The LOS must state the following to substantiate the suspension:', items: ["DoD customer's name.", 'BL number'] },
        ] },
        { heading: 'Validate Services Rendered by TSP', intro: 'At times, special packing or other non-standard actions completed by the TSP may incur additional cost to the government (accessorial services). In cases where these actions are required to complete the shipment, TSPs must request pre-approval of the actions prior to executing them. Failure to do so can result in punitive action but can also lead to TSPs shouldering the cost of the special service in question. The applicable system of record tracks pre-approvals requested by a TSP.', items: [
          'Preapprovals can be requested on both origin and destination services. TSPs enter accessorial services requiring preapproval in system of record.',
          'Preapproval records assigned will have the following status: Pending (when they are created); "Approved" or "Denied" (according to PPSO action).',
          'The PPPO/PPSO is required to approve or disapprove accessorial within three GBDs and/or prior to services being performed, whichever is earlier.',
          'Review DAFI 24-602V4, para 14.9 for additional information regarding accessorial services.',
        ] },
        { heading: 'TSP Reconciliation Process', intro: 'You may be responsible for certifying/approving the TPPS Summary Invoice. In order to approve/certify you must be:', items: [
          'Appointed by the Commander', 'Complete required training', 'Complete the DD Form 577, Appointment/Termination Record', 'Once appointed read the Certifying Officer (CO) business rules listed in DTR Part IV Appendix A para 5, CO Business Rules',
        ] },
      ],
      exercises: [
        'Utilizing DAFI 24-602V4, explain the post-inspection duties.',
        'Review DTR Part IV, Chp A-405. Describe the items maintained in the TSP Performance File.',
        'Demonstrate locating the Tender of Service. What is the TSP responsibility when it comes to Storage in Transit (SIT)?',
        'Utilizing the Tender of Service, what is the process when certified weight tickets are lost?',
        'Utilizing the DTR Part IV Appendix E, after completing a warehouse inspection, how is the DD Form 1812 distributed?',
      ] },
  ] },

  10: { file: '10. Personal Property Management', printed: '4.2.4.1. – 4.2.4.5.', lessons: [
    { id: 'ttg10-management', level: 'Expert', title: 'Personal Property Management', printed: '4.2.4.1. – 4.2.4.5.', tasks: ['4.2.4.1', '4.2.4.2', '4.2.4.3', '4.2.4.4', '4.2.4.5'], page: 3,
      prerequisites: ['Complete Advanced Requirements', TIMELINE], references: ['PPA HQ SharePoint', '2T0X1 CFETP'],
      outcome: 'Know how to manage & mentor PPTY teams through situations that may occur at your installation/work-center.', notes: NOTES,
      objectives: ['4.2.4.1. Advise Traffic Managers on PPTY Metrics', '4.2.4.2. Provide continuous formal and informal Quality Control Inspector training', '4.2.4.3. Communicate TSP Shortfalls and LIMFACs', '4.2.4.4. Collaborate with Traffic Managers on Allowances, Requirements & PPTY Procedures', '4.2.4.5. Provides Recommendations for AF PPTY Execution to focus on Standardizing Procedures'],
      steps: [
        { heading: 'Advise Traffic Managers on PPTY Metrics', items: [
          'PPA HQ/Compliance and Training sends out monthly surveys highlighting QA, Counseling and Tender of Service reports. To gain access to their SharePoint, send a request to ppahq.af.workflow@us.af.mil.',
          'As the PPTY manager, you are required to review & analyze monthly data. If you discover any issues, work with your team to identify issues and make the necessary adjustments to improve future shipments.',
        ] },
        { heading: 'Provide Continuous Formal and Informal Quality Control Inspector Training', items: [
          'According to DAFI 24-602V4 part 14.3, the Transportation Officer will "provide continuous formal/informal training in Personal Property and its automated systems for QC inspectors."',
          'ITOs and supervisors should engage with PPA HQ and unit Training Managers for training requirements/recommendations and workshops offered by various federal agencies and commercial sources.',
        ] },
        { heading: 'Communicate TSP Shortfalls and LIMFACs', items: [
          { text: 'Due to your location, you may experience shortfalls and LIMFACs during the Peak Season. This can occur for various reasons such as:', items: ['TSP labor shortage', 'Supply shortage (lumber, paper, packing material due to supply chain congestion)', 'Limited carriers in local area', 'Challenges due to weather/pandemics'] },
          'Establish a working relationship with JPPSO/CPPSO for assistance and to communicate any challenges.',
          { text: 'If your installation experiences shortfalls/LIMFACs, remember that preparation is key! No later than 2 months prior to the peak season, start preparing customers by informing them of the possible challenges. In addition, brief all options and encourage customers to do the following:', items: ['Book shipment as soon as they receive their orders', 'Self-procurement moves (PPM)', 'Consider a Power of Attorney'] },
          'Be creative and think of ways to get the information out there. For an example, hold Town Hall meetings, update office/installation social media/splash page or through Public Affairs.',
          'Informing the customer in advance, helps put them at ease, minimize last minute moves, and helps them plan in advance. It also alleviates stress for Traffic Managers.',
        ] },
        { heading: 'Collaborate with Traffic Managers on Allowances, Requirements & PPTY Procedures', intro: 'As technology advances one thing you can guarantee is change. When change occurs within the PPTY arena, you as manager/change agent must ensure everyone receives proper training. Change can occur in processes due to:', items: [
          'Change in system of record used to input customer data', 'Change in rates', 'Processes becomes digitized', 'New contracts', 'Changes in Policy',
          'Whatever the change, you as the manager/change agent must be in the know and ensure your personnel are informed.',
          'Change notifications usually come from your PPA HQ, USTRANSCOM or your ITO. Ensure they have access to required SharePoint and advisory websites to stay informed.',
          'Conduct training with your team and collaborate on ways to execute the new guidance/policy.',
        ] },
        { heading: 'Training Plan', items: [
          "As the Personal Property Manager, it's your job to ensure procedures are standardized within the work center. Our career field is small and there are times where you might face manpower challenges due to leave, deployments, TDYs & etc. By standardizing procedures, it ensures that everyone is proficient and is able to manage the workload during manpower shortages.",
          'Training does not stop with upgrade training…it\'s a continuous process. As the manager, it is your job to establish a monthly training plan. Each installation varies on how training days are conducted. Some installations designate one day each month for training. Some installations leave it up to the unit. If it is left to the unit, identify the day/time training will be conducted. Because PPTY is a customer service operation, ensure customers are aware of training days in advance (e.g., Public Affairs page, TM social media page, signage on office door/counter).',
          'Establishing a Training Plan: There are several ways to establish a training plan. You could task each person a topic to train on each week/month. Choose topics from the CFETP or common tasks normally handled in your office. Your team could use tools such as the Task Training Guides or Training tools from the PPA HQ website. Once training is complete, you as the manager must ensure journal entries are made in the electronic training record.',
        ] },
        { heading: 'Provides Recommendations for AF PPTY Execution to Focus on Standardizing Procedures: Routing Recommendations to Higher HQ', items: [
          "There's always room for improvement! Ideas can consist of ways to make processes better or restricting or reinstating entitlements. To present an idea, PPA HQ is the best agency contact. Keep in mind that every idea may/may not be a success, but striving to make processes better to serve Traffic Managers and customers should always be the goal.",
          'Restrict/reinstate entitlements. You may be at an installation where your assistance to restrict or reinstate an entitlement is required. For an example, you are at a remote location that once allowed pet shipments. Due to a specific event, the entitlement to ship pets was restricted. Five years has passed since the incident. Currently assigned, you and the ITO were informed the wing wants the entitlement reinstated. As a PPTY manager (with the assistance of your Transportation Officer), your expertise is required. You may be required to conduct research, participate in a Tiger Team, and assist with providing courses of actions (COA) to the wing. To assist with reinstating the entitlement, PPA HQ is the best agency to receive guidance from.',
        ] },
      ],
      exercises: [
        'Go to the PPA HQ SharePoint. Locate the QA metrics tab. In the most current month, how many TOS violations did your installation have this month? Additionally, what is the average for your MAJCOM?',
        "Scenario: You've recently PCS'd to your installation and been placed in charge of PPTY. After communicating with your ITO and a few coworkers, you've learned that last peak season was stressful and chaotic. It is now the end of March; explain how you would prepare your team and installation for the upcoming peak season.",
        'Review the 2T0X1 CFETP. Demonstrate developing a 1-month training plan.',
      ] },
  ] },
};
