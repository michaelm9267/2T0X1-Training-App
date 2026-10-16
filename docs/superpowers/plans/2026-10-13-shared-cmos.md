# Shared CMOS implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan with native execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give CDF and Outbound the same complete CMOS simulator, based on all eight supplied guides, with unrestricted saving and documents that remain usable alongside the forms.

**Architecture:** Shared React pages and pure, serializable record transitions live in `src/Components/Cmos/`. Separate course adapters provide exercise cargo and grading; neither owns a second CMOS form. Shared state is embedded in the existing course session so refresh, Practice, export/import, and reset preserve their existing boundaries.

**Tech stack:** Existing React/react-scripts, JavaScript, Jest/Testing Library, CSS, localStorage, existing FloatingWindow. No new runtime dependencies are planned.

**Approved specification:** `docs/superpowers/specs/2026-10-13-shared-cmos-reference-map.md`. Execution remains native as previously selected. Preserve all unrelated working-tree changes.

## Contracts and file boundaries

- `referenceInventory.js`: each screen/tab/dialog has stable field/action IDs, label, control type, lookup, dependencies, and PDF filename/page evidence. Keep unverified coverage explicit; do not certify an invented tab as a source replica.
- `model.js`: `createCmosStore()` returns `{version:1, shipments:{}, pieces:{}, hazards:{}, routings:{}, airManifests:{}, truckManifests:{}, bills:{}, express:{}, quotes:{}, documents:{}, history:[]}`. Record references use IDs; TCN is mutable data. Every editable record contains `draft`, `saved`, `revision`, and check/result metadata. Piece-to-physical-asset associations are explicit.
- `recordLogic.js`: `editRecord(store, kind, id, patch)`, `saveRecord(store, kind, id)`, `checkRecord(store, kind, id, context)` return new stores. Save preserves raw incomplete values, increments revision only when saved data changes, and never validates or grades. Checks are revision-bound. Operational transitions return `{store, outcome:{status, messages}}`; failures retain work. UI drafts are session-persisted, distinct from explicit Save and successful checks.
- `persistence.js`: `normalizeCmosStore(raw)` accepts incomplete field data but verifies container shapes/references. `migrateCdfCmos(session)` and `migrateOutboundCmos(session)` retain old progression, saved data, and drafts without inventing checks or prints. Outbound loader accepts legacy version 4 and emits version 5; shared store has its own version 1.
- `courseAdapters.js`: build course context (`course`, source shipments/documents, physical associations, clock, test lock), project shared records into existing exercise consumers, and report only validated actions to grading. Main and focused Practice stores remain separate.
- `CmosWorkspace.js`/`CmosShell.js`: one page set for both trainers; selection and navigation persist. Menu remains accessible on narrow screens. Record entry dialogs may be modal; documents never are.
- `DocumentManager.js`/`documentLogic.js`: session-level open-window identities plus document descriptors; windows survive page changes. Reuse `Session/FloatingWindow.js`, adding position restoration if needed. Printable output consumes saved record revisions and identifies draft/final status.
- Page modules: `ShipmentPlanning/`, `RateQuote/`, `SmallPackageExpress/`, `Routings/`, `TruckManifest/`, `CommercialBOL/`, `AirManifest/`, and shared `controls/`. Split page tables/dialogs from pure transitions. Retain existing hazard logic through an adapter initially, then relocate without duplicating business rules.

Tests below exercise user-observable behavior and transitions, not every trivial configuration entry. The source inventory separately provides an exhaustive coverage checklist.

## Task 1: Establish isolated baseline and source coverage

Files: new `referenceInventory.js`, `referenceInventory.test.js`, `docs/superpowers/specs/2026-10-13-cmos-field-coverage.md`.

- [ ] Inspect AGENTS.md instructions, existing worktrees, current diff, and prior `/tmp/transitiq-cdf-cmos` provisional files. Create an isolated snapshot of the current user workspace with node_modules reused; never merge an old snapshot containing unrelated edits.
- [ ] Run current Jest suite and production build; record actual baseline and failures before changes.
- [ ] Inventory all eight PDFs by page: every visible field, tab, query column, lookup, dialog and action. Record required/conditional/editable behavior and source page. Include all previously disabled Outbound controls.
- [ ] Write a failing coverage test for missing requested pages, empty tab inventories, and actions with no behavior binding.
- [ ] Run focused test to confirm failure, implement inventory, rerun to pass.
- [ ] Flag consequential unshown controls and request targeted reference images only where supplied pages cannot resolve them; continue independent work.

## Task 2: Shared records, unrestricted persistence, and invalidation

Files: new `model.js`, `recordLogic.js`, `persistence.js`, corresponding tests; modify `src/session.js`, `Outbound/OutboundTrainer.js` loader boundaries only.

- [ ] Write failing tests: save empty/invalid strings and nested forms; save then edit again; reload drafts; preserve multi-piece references after TCN correction; failed checks retain data; unchanged save does not invalidate a passed check; substantive changes invalidate dependent results.
- [ ] Run focused tests and confirm expected failure.
- [ ] Implement common record operations, stable IDs, explicit draft/saved revisions, cross-record invalidation and deterministic history. Finalized/released corrections use explicit abort/unassign/correction operations.
- [ ] Add migration fixtures for existing CDF state, Outbound version 4, Practice and completed tests, including missing optional fields and bad container references. Preserve real old accomplishments without creating new ones.
- [ ] Implement versioned normalization and migration; run focused tests to pass. Storage failure must keep in-memory work and visibly report inability to persist.

## Task 3: Shared shell and nonblocking documents

Files: new `CmosWorkspace.js`, `CmosShell.js`, `DocumentManager.js`, `documentLogic.js`, `cmos.css`, tests; modify `Session/FloatingWindow.js`/CSS only as needed.

- [ ] Write failing interaction tests: both course contexts expose all requested pages; document stays open across navigation; typing/lookup works with document open; minimize/restore and independent print work; docs remain accessible in finished tests.
- [ ] Confirm failures; implement shell, navigation, stable callbacks, shared lookups/date controls and document selector.
- [ ] Reuse FloatingWindow for source paperwork and generated documents without modal backdrop, focus trap or forced form shrinkage. Preserve position/size through navigation and restore focus on close.
- [ ] Run focused tests; inspect desktop and narrow viewport navigation and document overlap with real browser input.

## Task 4: Complete Shipment Planning and pieces

Files: new `ShipmentPlanning/{ShipmentPlanning,PlanningList,PlanningHeader,PlanningTabs,PieceDialog}.js`, `shipmentLogic.js`, tests; reconcile provisional planning metadata into inventory.

- [ ] Write failing journeys for wildcard/status queries, multi-record selection/navigation, New/Incheck/Copy/Duplicate/Partial/Split, multi-piece add/edit/delete/totals, and invalid Save/Save and Close.
- [ ] Confirm failures, then implement four-column header, three-column main area, complete results table/query controls, action bar, piece collection/dialog and each inventoried field.
- [ ] Implement UC, full Indicators, Shipment Status and Cargo Frustration records/history. Implement lookup-backed fields, Validate Funds, Create AIT, EEI and contextual downstream navigation as simulated actions, with persistence and meaningful results.
- [ ] Implement Edit TCN as an explicit check, not rename. ATCMD A/W exposes T-9 independently of hazards. CIIC forced/optional REPSHIP and protective-service DD1907 follow supplied guide rules.
- [ ] Run focused tests and inventory comparison; inspect reference screenshots and keyboard flows. No saved-record input lock.

## Task 5: Hazardous records and source associations

Files: shared `ShipmentPlanning/Hazards/` modules and `hazardLogic.js`; adapt existing `CdfCmos/HazardousTcnDialog.js`, `AmmoLotDialog.js`, `shipmentLogic.js` and tests.

- [ ] Write failing cases for header/detail/lot incomplete saves, template/manual entry, multiple pieces, deleting DG/removing indicator, reopening drafts, and preserving existing repeated-lot-save/record-ID regression behavior.
- [ ] Confirm failures; migrate DG2 header, Page 1/Page 2, Hazard Cargo and certification controls into shared records. Keep draft preservation distinct from validation.
- [ ] Make destructive confirmations clear all corresponding saved/draft data and dependent checks without orphaning physical assets.
- [ ] Run shared and existing hazard/full-process tests; compare every source dialog against inventory.

## Task 6: Rate Quote and Small Package Express

Files: new `RateQuote/`, `SmallPackageExpress/`, `quoteLogic.js`, `expressLogic.js`, tests; reuse print rendering where appropriate.

- [ ] Write failing journeys for standalone versus TCN-linked domestic/international SPE and freight quotes; carrier assignment; stale quotes; SPE request/cancel/retry; document retrieve/print; carrier daily closeout and pickup report; incomplete Save in all tabs/dialogs.
- [ ] Confirm failures; implement all quote fields, equipment/service lookups, deterministic result tables and linked assignment. Standalone quotes cannot assign to a nonexistent TCN.
- [ ] Implement Shipment Details, International Details, Hold At Location-3, query/edit/validation/tracking/notices and every inventory action. Request results include fictional tracking, charges, rated weight and GFM ID; international value/HS/ITN participate in checks.
- [ ] Separate retrieval, printing and closeout; preserve carrier/date report records. Pending/failure/cancel/status transitions are deterministic and resumable, with no external transactions.
- [ ] Run focused tests and browser journeys; verify documents remain usable while SPE is edited.

## Task 7: Routings and Truck Manifest

Files: new `Routings/`, `TruckManifest/`, `routingLogic.js`, `truckLogic.js`, tests.

- [ ] Write failing journeys: multi-TCN assignment/copy, equipment group/load plans/stop offs, Edit Data, request/status retry, Eastern Time preservation; truck assignment/unassignment/loading, statements, equipment, print/release/abort and incomplete saves.
- [ ] Confirm failures; implement all Routings tabs: TCNs, Equip Group Mode, Stop Offs, Equip Load Plan, Response, Addresses, Water Port, Notices, Status. Label requested pickup/delivery times Eastern Time explicitly and preserve entered values independently of local timezone.
- [ ] Implement all truck tabs: TCNs Assigned, Addresses, Miscellaneous, Conveyance, Assign Statements; calculated totals, Create AIT, Ship Plan, Clear, Export, Edit Check, print and departure dialog.
- [ ] Keep assignment, load state, passed check, generated documents and departure separate, revision-bound operations. Errors never block Save or erase input.
- [ ] Run focused tests and reference/browser comparisons including multi-TCN totals and correction invalidation.

## Task 8: Commercial Bill of Lading

Files: new `CommercialBOL/`, `billLogic.js`, tests and document renderers.

- [ ] Write failing journeys: multi-TCN New/assign, SCAC and air service, billing/address edits, RIN and conveyance collection changes, Edit, draft/final print, pickup and release, invalid Save/Save and Close.
- [ ] Confirm failures; implement menu Commercial BOL/title Commercial Bill of Lading and all tabs: TCNs, Addresses, Billing, Miscellaneous, RINs, Conveyances, Commodities, Service Codes, Via SCAC, Rail.
- [ ] Implement documented fields/lookups and nested equipment/date forms from inventory; link selected shipment commodities/service data without duplicating source records.
- [ ] Implement draft/final print options with estimated pickup; release with waybill/estimated delivery. Tie successful checks/final prints to saved revisions and preserve draft printing for incomplete work.
- [ ] Run focused tests and visual comparison of headers, tab contents and dialogs.

## Task 9: Shared Air Manifest and course integration

Files: new `AirManifest/`, `airLogic.js`, `courseAdapters.js`, integration tests; modify `App.js`, `CdfCmos/useCdfCmos.js`, CargoWindow workflow/exercise/practice, Documentation consumers, Departure, `Outbound/{OutboundTrainer,OutboundPanel,outboundLogic,outboundPractice,outboundGrading}.js`.

- [ ] Write failing complete CDF and Outbound journeys demonstrating identical page components, isolated stores, multi-piece physical associations, grading independent from Save, and both courses accessing every requested screen.
- [ ] Confirm failures; port existing air pallet/loose assignment, Edit Check, pull sheet/manifest and release into shared IDs/revisions. Retain CDF JI/load-plan prerequisites and label the existing 30-minute condition as a training rule.
- [ ] Wire both courses to shared workspace and adapters. Replace simplified Outbound surface/AMC form completion with validated CBL/routing/truck/air actions appropriate to exercise mode. Keep receive/pack/mark/label course activities.
- [ ] Update grading, documentation and practice seeds to consume saved shared records and explicit successful operations. Preserve completed-test locks and viewable documents.
- [ ] Remove superseded duplicate CMOS page implementations only after adapters pass compatibility tests; preserve useful source print components. Refresh/export/import/reset must use shared state.
- [ ] Run all relevant regression/integration tests, including earlier CDF fullProcess and Outbound Practice/session tests.

## Task 10: Final evidence, review and delivery

Files: coverage document, final verification ledger; only corrective product files if verified defects require them.

- [ ] Run `CI=true npm test -- --watchAll=false --runInBand` and `npm run build`; inspect actual output, not just exit assumptions.
- [ ] Browser-check all main screens and inventoried dialogs against PDFs; complete CDF air/hazard journey and Outbound SPE, CBL and routing/truck journeys. Exercise save/resume of intentionally incomplete forms, quote invalidation, multi-TCN totals, international SPE, document retrieval/closeout, Eastern Time fields and release corrections.
- [ ] Check documentation while typing, changing pages, resizing/minimizing, narrow viewport navigation, print isolation, refresh, Practice/main isolation, imported legacy sessions and completed-test behavior. Record screenshots and console findings.
- [ ] Request the fresh final code reviewer required by native executing-plans; supply approved design, inventory, implementation diff and evidence. Resolve findings and rerun affected checks, then final suite/build if corrective changes warrant it.
- [ ] Restore only the reviewed feature delta to the user workspace, checking it against isolated baseline and preserving all prior edits. Rerun relevant root verification and inspect final diff.
- [ ] Report implemented behavior, test/build evidence and any specific source coverage limitations honestly. Do not publish/deploy unless already authorized for that action.

## Plan self-review

All six requested screens and Rate Quote have owning tasks; unconditional Save applies to records and nested forms. Documents have a persistent nonmodal owner. The shared model precedes cross-screen operations; course grading and migrations are verified separately from saving. Source evidence covers controls rather than treating screen titles as complete coverage. Implementation and final verification use the existing project tools and preserve user changes.

## Review focus

- Source tabs whose contents are not pictured: Rail, Via SCAC, Stop Offs, Water Port, Hold At Location, T-9. Distinguish functional training controls from verified source layout.
- Partial/Split/Copies and multiple physical asset associations: stable references must not duplicate course credit or lose source pieces.
- Changes to pieces, hazards, equipment, assignments, quotes, or released records: dependent checks/print readiness and course progression must become stale consistently.
- Finished tests, printing and document retrieval: viewing must work without changing finalized training state; retrieval alone must not award printing.
- Imported or refreshed legacy/main/Practice sessions: raw invalid strings are permitted, malformed containers and dangling references must not crash or reset unrelated progress.
