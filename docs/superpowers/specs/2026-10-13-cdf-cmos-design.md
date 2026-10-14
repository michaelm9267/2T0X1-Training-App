# CDF CMOS process fidelity

Date: 2026-10-13
Status: Proposed specification, pending user review

## Intent and approved scope

Make CDF Training teach the complete CMOS process shown in the user's Manage Air Manifest and Manage Hazardous TCN PDFs. The user chose the complete process and approved the conversational design: shipment search and preparation, hazardous records, manifest creation and assignment, edit checks, printing, and release. Guided mode explains the work; Test mode requires independent entry. Branding remains Transit IQ / 2T0X1 Training Portal.

The PDFs are process and visual references, not instructions to perform live shipment operations. This remains a local simulation with fictional exercise data.

## Sources and fidelity boundary

- Manage Air Manifest.pdf, pages 1–12: navigation, creation, pallet and loose-cargo assignment, edit check, cargo pull sheet, manifest print, and release.
- Manage Hazardous TCN.pdf, pages 1–24: TCN search, Indicators, DG2 creation, template selection, certifying official, Page 1 / Page 2 / Hazard Cargo, lot records, saving, deletion, and indicator-removal confirmation.
- Match screenshots' field names, ordering, tabs, tables, toolbar actions, and dialog hierarchy. Preserve usable keyboard navigation, focus handling, and scrolling on smaller screens.
- Inspect all relevant screenshot pages during implementation, especially manifest creation, release, DG2 header, and lot-entry dialogs. Screenshots supply UI structure; fictional documents supply exercise answers. Do not infer unshown CMOS business rules or hazardous classifications from example screenshots.
- The existing 30-minute release window remains an explicitly labeled training rule; neither PDF establishes it. No regulatory reference-data expansion is included.

## Chosen approach

Use an integrated CMOS workspace with separate Shipment Planning and Air Manifest pages. Reuse or extract the existing Outbound CMOS shell where practical, adding configurable navigation without changing Outbound behavior. A sequential wizard would hide the navigation skills being taught. Independent mock screens would risk diverging from the manifest, load plan, and departure records.

## User flow

### Shipment Planning

Open CMOS from the CDF Manifest stage. Use Cargo Management → Outbound → Shipment Planning. Search by TCN, select a result, and open its record. Query results reflect the active exercise's shipment records; an unmatched query shows an empty result table.

Enter and save shipment information from the paperwork and verified Incheck readings. Saving a shipment does not assign it to a manifest. Keep editable drafts separate from committed records, and implement Save / Save and Close / Close with a discard confirmation for unsaved edits. Validation preserves entered values and reports transaction outcomes.

### Hazardous TCN

On Indicators, select the hazardous identifier. Misc T-9 Required is editable, rather than permanently checked. DG2 becomes available for hazardous indicators. The fictional paperwork specifies whether T-9 remarks are needed; do not require them for every hazardous shipment.

DG2 New opens Maintain Hazardous TCNs with piece number, DG2 Template ID, template type, and certifying official name/title. Template IDs support both manual entry and a searchable lookup. A template ID is modeled separately from its UN/NA ID, even when a training template uses a UN-style ID. Save the header, then complete the detail tabs:

- Page 1: screenshot's special-condition flags and applicable technical-name/approval information.
- Page 2: proper shipping name, UN class/division and ID, packaging, quantity and units, aircraft limitation, and shipper/emergency details shown in the guide.
- Hazard Cargo: hazard code and ammunition lot table. New opens a lot-entry dialog; Save and Close commits its record. Ammunition/explosives scenarios require applicable lot data.
- Certification Statement: reproduce the guide's tab; use fictional scenario certification text, not invented legal language.

Fields not applicable to the exercise remain available without being required. Keep all hazard details tied to their TCN and piece. DG2 records can be reopened and edited before assignment; Delete removes the selected record. Changing to a nonhazardous indicator prompts for confirmation, then removes that TCN's associated hazardous data. Cancel preserves it. A scenario that still requires hazardous preparation cannot pass assignment/edit checks after its data is removed.

Extend fictional paperwork with internally consistent DG2, certifier, template, T-9, and lot answers. Include a deterministic ammunition practice/test fixture so the lot branch can be exercised. Do not silently reinterpret the current UN reference table as an authoritative CMOS template database.

### Air Manifest

Navigate through Cargo Management → Outbound → Air Manifest. New Cargo Manifest generates a stable manifest number and opens the creation dialog. The trainee enters mission, DSOE ID, chalk, POD, destination, completion selection, and applicable remarks according to screenshot fields and fictional mission paperwork. System-calculated fields remain read-only. Save creates the manifest and enables assignment actions.

Assigned Pallets → Unassigned Pallets opens a searchable pallet table. Select and Assign the eligible training pallet. View Loose Cargo → Assign TCNs opens a searchable loose-cargo table. Select and Assign eligible TCNs. A pallet is assigned as a pallet with its contents, not duplicated as loose cargo. Assignment retains links to saved shipment records; reject duplicate assignment, unsaved records, unmet Precheck/Incheck, and active frustrations. Unassign makes a shipment editable again and invalidates dependent work.

Use one active air manifest for the current CDF deployment. Distinguish pallets using explicit scenario metadata and a stable fictional pallet ID. Other pieces remain loose cargo. Creating multiple missions or pallet-building workflows is outside this change.

### Edit checks, printing, and release

Edit Check evaluates the saved manifest header, assigned cargo, destination consistency, and required hazardous details. It reports actionable CMOS transaction messages; instructional explanations appear only outside Test mode. A cargo/header change invalidates the previous passed check.

Print Cargo Pull Sheet and Print Manifest produce separate printable documents from the saved manifest and assignments. Use the same stable manifest number, mission details, totals, pallet grouping, TCNs, and hazardous summaries in CMOS, printed documents, and the aircraft paperwork package. Track successful opening of each print view as the simulation's print task; browser printing cannot be confirmed by the app. Printing is required for full-process training completion, and is labeled an exercise requirement rather than an undocumented CMOS restriction.

Release opens Release Air Shipment with the fields shown by the guide. Completing that dialog performs the existing departure release transition. Both Manifest and Departure stages can open the same CMOS workspace and manifest; Departure has no separate one-click bypass. Require a valid saved header, all expected cargo assigned, a current passed edit check, completed print tasks, current accepted load plan, all pieces through JI, and the existing training release window. Read-only views remain available after release. Unassignment or record changes withdraw release and dependent completion.

## State and integration

- Per-piece exercise: shipment draft, committed shipment, hazardous drafts/records, and assignment reference. Preserve existing manifest record fields consumed by MSL, load planning, grading, and printouts through explicit adapters.
- Deployment CMOS state: manifest header draft/record, generated number, assigned pallet/TCN references, revision, edit-check revision, print revisions, release details, and mistake history.
- Pure domain functions implement save, assign/unassign, hazard deletion, edit check, and release validation. UI components own transient searches, selected rows, and dialog visibility.
- App coordinates deployment state and passes callbacks; avoid embedding the new workflow into a single growing App or ManifestScreen component.
- Manifest-stage completion means saved valid shipment plus assignment and MSL application. Deployment edit checking/printing can happen once all pieces are assigned, before load planning/JI; release stays after JI. Update checklist wording and DSOE milestones to reflect these distinctions.
- Reconcile load-plan/JI/release dependencies when substantive assigned data changes. Merely opening a dialog or changing an uncommitted draft does not invalidate committed work.
- Finished tests lock every mutation, including CMOS dialogs. Scoring records failed submissions and release attempts, not ordinary navigation. Full process is reflected in the existing grading sheet and after-action report.

## Persistence and practice

Persist committed records, drafts, assignment links, generated IDs, check/print revisions, and release data through save/load/export/import. Validate restored shapes and references. Add defaults for older compatible sessions without erasing unrelated training progress. Old manifest entries can be retained as saved shipments, but do not fabricate creation/check/print achievements; show the trainee which new CMOS steps remain.

New full Guided/Test sessions begin without a created manifest or automatically completed CMOS tasks. Practice continues to support focused sections: manifest practice prepares Precheck/Incheck only, while departure practice may seed predecessor work with an explicit notice. Switching modes preserves the main session as it does today.

## Verification and acceptance

1. Follow both PDFs' click paths in the simulation; confirm navigation, table selection, lookup, tab, save, and release behavior against screenshots.
2. Test loose cargo and pallet assignment, duplicates, unassignment, empty searches, and blocked unready/frustrated records.
3. Test hazardous header/detail saving, multiple applicable records, T-9 optionality, ammunition lot entry, Delete, and confirmed/cancelled hazard removal.
4. Test draft/committed separation, stale checks and print tasks, totals, and one manifest number across all documents.
5. Test release prerequisites and boundaries, dependency invalidation, finished-test locks, and grading integration.
6. Test fresh sessions, refresh/export/import, older compatible sessions, and focused Practice isolation.
7. Run affected tests, the repository test suite, and the production build. Manually inspect the complete Guided and Test paths and print layouts using available browser tooling; report any unavailable visual verification.

## Implementation boundaries

Preserve unrelated uncommitted workspace changes. No live CMOS connections, deployment, repository rename, or changes to Outbound workflow. Shared-shell changes must retain Outbound regression coverage. Existing branding edits remain separate from this feature.
