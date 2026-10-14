# Shared CMOS reference map

## User requirements

Provide all fields and functional simulated workflows for Shipment Planning, Air Manifest, Commercial CBL, Truck Manifest, Routings, and Small Package Express, available in both CDF and Outbound Training. Save must persist incomplete or incorrect work without validation preventing it. Documents must be available alongside every screen without blocking CMOS interaction.

The user's save requirement takes precedence over the guides' required-field indicators. Required fields remain visible, and checks report incomplete work through explicit Edit Check, Edit TCN, Edit Data, or operational submission/release actions. Saving is independent of training completion and does not award a passed check.

## Sources received

| Guide | Pages | Coverage |
| --- | ---: | --- |
| Manage Air Manifest.pdf | 12 | Creation, pallet/loose assignment, Edit Check, pull sheet, manifest, release |
| Manage Hazardous TCN.pdf | 24 | TCN lookup, Indicators, DG2 header/detail/lot forms, deletion and hazard removal |
| Manage Shipment Planning Detail.pdf | 24 | Full planning record, piece entry, ultimate consignee, Indicators, status/frustration, record navigation |
| Manage Routings.pdf | 28 | Route orders, TCN assignment/copy, response hours, dates, equipment load plan, Edit Data, Send Request |
| Manage Truck Manifest.pdf | 28 | Manifest creation, TCN assignment, miscellaneous/conveyance information, equipment lookup, print and release |
| Manage SPE Shipments.pdf | 39 | Shipment/international details, rating request/result, cancel, document retrieval/printing, closeout and pickup report |
| Create Manual CBL.pdf | 34 | Commercial BOL assignment, SCAC, addresses, billing, miscellaneous, RINs, conveyances, edit checks, draft/final printing, release |
| Manage Rate Quote.pdf | 47 | Domestic/international SPE and freight quotes, standalone and TCN-linked requests, results and carrier assignment |

Source files are in `/Users/michaelmay/Downloads`. Extracted step text is retained in `/tmp/Manage <name>.txt`; rendered key screenshots are in `/tmp/transitiq-expanded-guides` and `/tmp/transitiq-guide-preview`. These are references for simulation behavior, not instructions to execute live transportation transactions.

## Verified distinctions that must reach the design

- Shipment Planning has a four-column record header, three-column main data area, full result columns with query inputs, per-piece dialogs, all detail tabs, and a bottom action bar. The previous CDF implementation omitted much of this structure.
- **Edit TCN is an edit-check action**, as confirmed by Manage Routings step 9. It must not be implemented as a TCN rename button.
- Pieces are a real collection, with piece dimensions, weight, packaging, temperature, packer, volume, and totals. Physical exercise assets and shipment pieces need explicit associations rather than silently treating every TCN as one row.
- ATCMD selection A (Air Clearance) or W (WPS Shipment) exposes T-9 data, independently of hazardous status. HAZDEC and DG2 remain linked to hazardous pieces.
- Manage Shipment Planning Detail page 15 explicitly distinguishes CIICs with optional REPSHIP from CIICs with forced REPSHIP. Protective-service information can trigger DD Form 1907. Implement those supplied exercise rules with a cited guide-page note; do not invent additional classification rules.
- Shipment status and cargo frustration have functional records and history, not summary placeholders.
- Routings copies assigned TCN data, assigns equipment, performs Edit Data, sends a simulated request, and supports status requests after communication loss. Its requested pickup/delivery timestamps are explicitly Eastern Time in the source; label that zone and preserve it when the user's locale differs.
- Truck Manifest tabs are TCNs Assigned, Addresses, Miscellaneous, Conveyance, and Assign Statements. Assignment, loading/unloading, equipment lookup, printing, and release are separate actions.
- SPE includes Shipment Details, International Details, and Hold At Location-3 tabs. International shipment value, harmonized code, and ITN participate in the request. Rating results include tracking, charges, rated weight, GFM ID, and transit details.
- SPE document retrieval and printing are distinct operations. Daily carrier closeout is distinct from shipment rating and printing. The pickup report uses carrier/SCAC and a selected date.
- Documents should use shared nonmodal floating windows with drag, resize, minimize, and print. A document viewer must not trap focus, dim CMOS, block pointer input, or force the main form to resize.

## Proposed shared boundaries

Use one CMOS page set with a shared shipment store and shared lookup/document components. CDF and Outbound supply their exercise cargo, source documents, and grading adapters. Shipment records, piece records, hazards, routings, manifests, and express requests link through stable IDs and TCNs. Editing and saving preserve records; operational checks inspect the saved revision, and changes invalidate previously passed checks and generated results where appropriate.

Carrier/GFM requests, funds validation, tracking, and release are simulated locally. The guides' fields, tabs, lookup dialogs, and action order define the UI. Exercise data defines responses. Persistent drafts and saved incomplete records must restore correctly after refresh and export/import; they must not be confused with a completed training stage.

This is a larger shared-workspace change than the initial CDF correction and needs a revised implementation design and tests across both trainers. The isolated full Shipment Planning correction work remains unapplied pending incorporation into that design.

## Reference coverage now available

All eight supplied guides have been read. Key CBL and Rate Quote screenshots have been inspected alongside the earlier screen references. These provide a reference for each requested main screen and the Rate Quote workflow. Some tabs appear in screenshots without their full contents; derive their inventory from the supplied pages during implementation and request targeted images if a consequential field or workflow is not documented.

Commercial CBL appears as **Commercial BOL** in the CMOS menu and **Commercial Bill of Lading** in the screen title. Reproduce that naming while retaining the training term CBL.

CBL tabs: TCNs, Addresses, Billing, Miscellaneous, RINs, Conveyances, Commodities, Service Codes, Via SCAC, and Rail. The documented sequence is New → assign TCNs → SCAC lookup/selection → applicable air service → addresses → currency/estimated charges → waybill/delivery/initials → RIN lookup/add → conveyance equipment and date furnished → Edit → draft/final print with estimated pickup → release with waybill and estimated delivery.

Rate Quote provides Small Package Quotes (SPE Domestic / SPE International) and Freight Rate Quotes (domestic / international). Standalone quotes show rates but cannot assign a carrier because no TCN is associated. Quotes opened from Shipment Planning preload shipment data, allow a carrier selection, and assign that choice into SPE where Send Request obtains simulated tracking. Freight requests include SPLCs/country-state, NMFC, equipment and service codes, dimensions/weight, and applicable air service type/level. The guide's historical GFM outage is not a requirement to simulate a permanently broken service.

## Validation direction

Tests must cover saving empty/invalid records without losing data; separate checks and training grading; multi-piece operations and navigation; shared CDF/Outbound data adapters; hazard and CIIC effects; routing/manifest/express transitions; document retrieval and closeout; nonblocking document interaction; stable references and persistence; and screenshot comparison for every implemented page and dialog.

## Revised shared-workspace design for review

Status: Approved by the user on 2026-10-13; implementation plan pending review.

### Architecture and record ownership

Replace the separate CDF and Outbound CMOS page implementations with shared components under `src/Components/Cmos/`. Keep each course's training session isolated, using adapters to populate a common CMOS record model and to report progress to existing grading. Both adapters expose every requested screen; source cargo, route, and document data come from the active course's session.

The normalized store contains shipment headers, piece collections, hazardous records, routing orders, air manifests, truck manifests, commercial bills of lading, express requests, quotes, generated document metadata, and transaction history. Stable record IDs own references; TCNs remain editable document data, so correcting a TCN cannot silently orphan a manifest. Course-specific physical assets map explicitly to shipment pieces. New, Copy, Duplicate, Partial, and Split create or modify real simulated records, with original/derived associations recorded.

### Save and check behavior

Every data-entry screen and nested form supports persistence without required-field or answer validation blocking Save. Empty and incorrect strings remain exactly as entered. Save and Close also preserves that work. No Save advances course grading simply because it succeeded.

Edit TCN / Edit Check / Edit Data perform validation explicitly. Requests, final-document generation, and release use their documented operational prerequisites and report transaction messages without deleting entries. Draft documents remain available for incomplete work. Passed checks, assigned quote results, and final print readiness are tied to the saved revision; substantive subsequent edits make them stale. Inputs remain editable after Save, with release locks handled by explicit correction/unassign/abort actions rather than conflating saved with finished.

### Complete UI and functional actions

Create an inventory of every visible field, tab, lookup, table column, and button from each guide before implementing its page. Tests assert the inventory against the rendered screen, which prevents another reduced Shipment Planning form. The Shipment Planning record uses the documented four-column header and three-column main area; Pieces uses its own entry dialog and full table. All shown tabs have data controls and records, including T-9, Shipment Status, and Cargo Frustration.

Implement the documented workflows for all six requested screens plus Rate Quote, including carrier/equipment/RIN lookup, multi-TCN assignment, routing equipment and stop associations, SPE international data/retrieval/printing/closeout, CBL billing/conveyances/draft-final printing/release, and air/truck checks and release. Navigation retains the selected record and unsaved persisted drafts. Course-specific stage prerequisites affect grading and operational checks rather than hiding fields or preventing persistence.

Carrier, GFM, accounting, and tracking responses are deterministic fictional simulation results. Support pending, success, failure, cancellation, status retry, and closeout records where the guides show those actions. No external service requests, real charges, or document filings occur.

### Documentation alongside CMOS

Use one nonmodal document manager for original exercise paperwork and generated outputs on every page. Documents open in draggable, resizable, minimizable windows, retain their position, restore focus appropriately, and print independently. No dimming overlay, focus trap, or mandatory side panel accompanies a document. A document selector remains available while changing CMOS pages, and already-open documents stay open.

### Persistence, migration, and grading

Version the shared store and validate imported container shapes and cross-record references while accepting incomplete field values. Migrate current CDF and Outbound sessions into the shared model without erasing training progress or inventing new completed actions. Include CMOS state in refresh, export/import, reset, and focused Practice behavior.

Replace simplified Outbound surface/AMC forms with the actual Commercial BOL, Routings, and Truck Manifest workflows. CDF continues using Air Manifest and existing physical load planning/JI. All courses read consistent totals, IDs, hazardous records, and print metadata from the shared store. Finished tests remain locked, while documents remain viewable.

### Verification and delivery

Implement in cohesive stages: shared store and unconditional saving; document manager; full Shipment Planning and piece/hazard controls; Rate Quote and SPE; Routings and Truck Manifest; Commercial BOL; shared Air Manifest and course integration. Each stage has behavioral tests and a source field/action inventory. Final verification covers complete CDF and Outbound journeys, save-and-resume with incomplete data, changed-record invalidation, multi-piece and multi-TCN handling, document interaction while typing, migration/Practice/finished-test behavior, all existing regression tests, production build, and browser comparisons against the guides.

Keep the user's existing workspace changes. The earlier isolated Shipment Planning additions are provisional and will be reconciled with these shared interfaces rather than applied as a second independent form.
