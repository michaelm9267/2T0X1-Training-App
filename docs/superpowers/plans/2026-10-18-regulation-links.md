# Regulation Links and Quoted Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for this plan) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give practice/reference users reliable new-tab regulatory links and exact quotations after three seconds of hover throughout the training app.

**Architecture:** Store verified passages separately from app claims, connect claims through stable citation IDs, and render them with a shared React link/popover. Resolve mode restrictions at the rendered flow and position popovers inside the trigger's own browser document. Audit every operational claim and explicitly account for unsupported or simulated rules.

**Tech Stack:** Existing React 19, CSS, React portals, Jest/React Testing Library, browser PDF links, checked-in source metadata. No new runtime dependencies or services.

**Spec:** `docs/superpowers/specs/2026-10-18-regulation-links-design.md` (approved).

## Global Constraints

- Hover delay is 3,000 ms; dismissal grace period is 200 ms.
- Guided/practice and standalone reference/after-action views receive aids; active assessments do not, including documents opened from them.
- Quote verified source wording only. Keep publication edition, exact paragraph/table, printed page, physical PDF page, retrieval provenance, and exceptions together.
- Link directly with `target="_blank" rel="noopener noreferrer"`; use actual section anchors or correct physical PDF pages.
- Work remains in the existing React application with no runtime source-fetching service, new accounts, or persistence migration.
- Preserve ongoing workspace edits. No deployment or changes to supplied source documents.
- Unverified and simulated claims must not acquire fabricated regulatory authority.
- Shared markup must remain usable inside a separate `PaperworkWindow` document and inside floating dialogs.

## Review Focus

- A publication with front matter/change notices: links reach the physical PDF page containing the named paragraph, rather than its printed page number (Tasks 1 and 8).
- Rapid movement between links and into a long quotation: timers cannot show stale content or dismiss a popup while it is being used (Task 2).
- Switching to assessment with a popup open or a paperwork child window active: all new contextual aids disappear immediately (Task 3).
- A broad citation that omits a limiting exception: only a source passage supporting the displayed claim may be attached (Tasks 1 and 8).
- A newly integrated field inside a button, label, select, or printed form: citations retain normal control behavior and document layout (Tasks 4–8).

## File and interface map

- Create `src/Components/Regulations/publications.json`: verified publication/version/URL/retrieval/fingerprint metadata.
- Create `src/Components/Regulations/passages.json`: verified quotation records, keyed by stable IDs such as `dtr3.appO.inspectionAccess`.
- Create `src/Components/Regulations/claims.js`: explicit claim-to-passage mappings, including conditional/multiple citations; no DOM text scanning.
- Create `src/Components/Regulations/catalog.js`: `getCitation(id) -> Citation|null`, `citationHref(citation) -> string`, and `citationsForClaim(claimId) -> Citation[]`.
- `Citation`: `{id, publicationId, title, edition, section, printedPage?, pdfPage?, url, quote, verifiedAt}`. A PDF citation requires `pdfPage` unless it has a verified named destination. Store original publication URL separately from the derived destination link.
- Create `src/Components/Regulations/RegulationLink.js`: `RegulationLink({citationId, children, className})`; inaccessible/unverified IDs render unlinked children, with evidence gaps recorded in the audit.
- Create `src/Components/Regulations/RegulationPopover.js` and `regulation-links.css`: the shared interactive passage popup, its per-document active-popup coordination, and styling.
- Create `src/Components/Regulations/RegulationScope.js`: `RegulationScope({view, assessmentActive, children})` and `useRegulationAids() -> boolean`; `view` is `contextual`, `reference`, or `review`, with `contextual` as the default. `assessmentActive` is supplied by the owning flow from test mode and completion state; nested reference/document views cannot disable an inherited active assessment. Completed review is rendered with `assessmentActive: false`.
- Create `docs/reference/regulation-coverage.md`: per-claim evidence and screen-integration ledger. Create `docs/reference/regulation-source-verification.md`: retrieved editions, source text checks, physical/printed page mappings, restrictions, and identified contradictions.
- Tests live next to their corresponding catalog/components. Screen integrations extend existing test files. No changes to session storage schemas.

## Task 1: Verified catalog and complete claim inventory

**Files:** Create the two catalog JSON files, `catalog.js`, `claims.js`, `catalog.test.js`, and both reference audit documents from the map above. Inspect all source areas listed in the spec, including unreferenced explanatory text and newly added screens.

**Consumes:** Existing scenario `source` metadata, DTEB JSON provenance, AFMAN catalog/review documents, `ProcessPanel/frequentLinks.js`, operational rule/data modules, and the approved spec. **Produces:** The `Citation` interface and catalog functions above, plus an inventory covering every operational screen.

- [ ] Inventory all existing citations and uncited requirements/thresholds/formulas in CDF, cargo, CMOS, outbound, documents, load planning, departure, training, and reports. Record each claim's file, rendered surface, conditions, and evidence status. Include source-free simulation assumptions explicitly.
- [ ] Obtain official documents for each required source family. Verify edition/change notices and compare the exact passage against the displayed claim. Record hashes for downloaded PDFs, physical and printed page mappings, relevant exceptions, and access failures. Use available local PDF tooling for extraction; do not install runtime dependencies.
- [ ] Write catalog tests with hand-checked real fixtures: a known claim returns its verified paragraph and verbatim passage; a PDF link uses its physical page; an official HTML citation preserves its anchor; an unknown citation returns `null`; an unknown claim returns `[]`. A small fixture with `pdfPage: 9, printedPage: '7'` must produce `#page=9`, not `#page=7`.
- [ ] Run `CI=true npm test -- --watchAll=false --runInBand src/Components/Regulations/catalog.test.js` and confirm the new behavior fails before implementing the functions.
- [ ] Implement the catalog functions and populate verified source records. Keep unsupported entries in the audit, not as quotation records. Model multi-source claims as arrays of citation IDs; never combine passages without attribution.
- [ ] Rerun the catalog tests, manually compare representative full passages and exceptions with source files, and review all recorded source discrepancies. Commit only task-owned changes after verification; preserve unrelated work.

## Task 2: Three-second link and persistent quotation popup

**Files:** Create `RegulationLink.js`, `RegulationPopover.js`, `regulation-links.css`, and `RegulationLink.test.js` under `src/Components/Regulations/`.

**Consumes:** Task 1 catalog functions. **Produces:** Shared `RegulationLink` component with the approved delay, safe source anchor, owner-document popup, and keyboard/touch access.

- [ ] Write fake-timer tests: `advanceTimersByTime(2999)` leaves the passage absent; advancing one more millisecond shows it; leaving early cancels it; movement inside one trigger preserves the original timer. Clicking immediately exposes a normal new-tab anchor with safe `rel` attributes.
- [ ] Add tests for crossing from trigger to popup within 200 ms, selecting/scrolling text without dismissal, moving keyboard focus between scopes, Escape dismissal, rapid switching between different citations, unmount cleanup, unknown IDs, and one active popup per owner document.
- [ ] Run `CI=true npm test -- --watchAll=false --runInBand src/Components/Regulations/RegulationLink.test.js`; confirm failures describe missing interaction behavior.
- [ ] Implement the components. Use a nonmodal interactive popup with a source heading, exact passage, paragraph/edition, scrollable body, and source link. Use the trigger's `ownerDocument/defaultView`, portal into that body, constrain bounds, reposition on scroll/resize, and clean up listeners/timers. Provide an adjacent touch details button. Do not trap focus or nest interactive elements.
- [ ] Rerun component tests and verify mouse crossing, text selection, long content, keyboard access, narrow-window bounds, and separate-document rendering in Chrome. Commit task-owned changes only.

## Task 3: Scope policy, child windows, and acronym coexistence

**Files:** Create `RegulationScope.js` and `RegulationScope.test.js`; modify `src/App.js`, `src/Components/Outbound/OutboundTrainer.js`, `src/Components/Cmos/PaperworkWindow.js`, `src/Components/Glossary/AcronymTooltip.js`, and its tests as needed.

**Consumes:** Existing `ModeContext`, Task 2 components. **Produces:** `RegulationScope/useRegulationAids` policy applied to both training flows, child-document content, and explicit completed review/reference surfaces.

- [ ] Test the policy matrix: guided/contextual=true; practice/contextual=true; test/contextual=false; standalone reference=true; completed review=true; a reference/document opened during active test=false. A pending/open popup vanishes on a mode change to test, including a React portal to another document.
- [ ] Test that the glossary ignores regulation triggers/popups while ordinary acronym definitions continue working. Hover delays must not be reset by acronym processing or unrelated DOM mutations.
- [ ] Run the scope and acronym tests, confirm the new cases fail, then implement policy using the effective flow mode and explicit view scope. Keep assessment exclusion dominant and ensure UI aids do not reappear in the popup window.
- [ ] Rerun tests and manually verify live mode switching, child-window closure, style availability, and print suppression. Record the policy behavior in the audit. Commit task-owned changes only.

## Task 4: CDF cargo, inspection, and handling guidance

**Files:** Modify `src/Components/CargoWindow/scenarios.js`, `workflow.js`, `exercise.js`, `dd2133.js`, `discrepancies.js`, `CBWorksheet.js`, `MeasurementNotebook.js`, `VehicleInspectionPanel.js`, `CargoWindow.js`; `src/Components/Documentation/DocumentationPanel.js`, `DD2133Form.js`, `ShipmentPaperwork.js`, `FrustrationPanel.js`; `src/Components/Training/JiInspectionList.js`; claim mappings and existing corresponding tests.

**Consumes:** Tasks 1–3; paragraph metadata in findings. **Produces:** Cited measurement/CB, inspection, documentation, and handling guidance with evidence-linked feedback.

- [ ] Add screen tests for an inspected rule (container access), a CB/formula reference, a document requirement, and one numeric handling limit. Assert correct citation identity/href and verified passage; assert assessment hides new aids and form input behavior remains intact.
- [ ] Run those named existing test files plus regulation tests and observe the missing integrations fail.
- [ ] Add stable claim IDs to existing data objects without removing `source/reference` compatibility used in saved mistakes and grading. Render shared links at the explanatory clause or beside the applicable control. Keep original instructional visibility rules.
- [ ] Account for every claim in the covered files. Resolve numeric rules and exceptions using Task 1 evidence; label simulation assumptions rather than presenting them as quotes. Verify DD 2133 labels, measurement controls, and deliberate discrepancy handling are unchanged.
- [ ] Run the affected suites, update coverage statuses, and commit only task-owned changes.

## Task 5: CMOS and reference tables

**Files:** Modify `src/Components/CdfCmos/ShipmentPlanning.js`, `ManifestAssignments.js`, `HazardousTcnDialog.js`, `HazardTemplateLookup.js`, `AmmoLotDialog.js`, `AirManifest.js`, `ReleaseAirShipment.js`; `DetailTabs.js`, `HazardousTcn.js`, `Dg2List.js`, `T9MiscTab.js`, `RoutingScreen.js`, `CommercialBolScreen.js`, `AirManifestScreen.js`, `PalletsScreen.js`, `ReleaseAirShipment.js`, `CblRelease.js`, `referenceInventory.js`, `dg2Reference.js`, and existing tests/claim mappings. Use actual catalog provenance when instrumenting the lookup renderers discovered by Task 1.

**Consumes:** Tasks 1–3 and the audit's exact field-to-source mappings. **Produces:** Cited CMOS rules, lookup definitions, release guidance, and hazardous-material information.

- [ ] Add failing tests for one AFMAN table row with the correct shipping-name variant, one DTEB code definition with its exact source table, one routing/priority rule, and a release condition. Include a select/label test proving citations do not change input selection or accessible labeling.
- [ ] Run the affected existing tests to confirm missing citation behavior, then integrate data-driven links using explicit claim IDs. Cite the matching record/row, not the first UN-number match or a generic manual URL. Attach conditions/exceptions to conditional claims.
- [ ] Audit the remaining CMOS screens and their rule/data modules. Classify screenshot-only interface conventions and simulation-only release checks separately from regulatory requirements. Record any renderer locations changed by concurrent workspace edits instead of creating duplicate screens.
- [ ] Verify citations inside modal/floating overlays and `PaperworkWindow` with practice and test modes. Rerun affected suites, update coverage, and commit only task-owned changes.

## Task 6: Outbound receipt, packing, priority, and shipment instructions

**Files:** Modify `src/Components/Outbound/outboundLogic.js`, `outboundData.js`, `OutboundPanel.js`, `OutboundCargoWindow.js`, `CmosShipmentPlanning.js`, `CmosSmallPackage.js`, `CmosPrintExpressDocs.js`, `ShippingDocument.js`, `OutboundPrintouts.js`, `OutboundGradingSheet.js`; claim mappings and existing outbound tests. Audit the related logic modules listed by Task 1.

**Consumes:** Verified DAFI 24-602V2, DTR Part II, marking/form/code sources, and Tasks 1–3. **Produces:** Cited outbound operational instructions and review explanations without changing assessment hints.

- [ ] Add failing tests for document acceptance/custody, an address-in-the-clear requirement, a transportation-priority condition including its destination/time exception, and a packing/marking rule. Verify the source claim and assessment exclusion.
- [ ] Run the affected outbound tests, then integrate links at the specific rule text or adjacent label; preserve receipt/packing state, existing document values, form interaction, and printable layouts.
- [ ] Audit every outbound instruction and feedback claim, including data-generated statements. Apply accurate source conditions and record unresolved evidence. Do not attribute a simulated consignee or exercise quantity to a publication.
- [ ] Rerun outbound suites and inspect document/reference windows in practice versus active test. Update coverage and commit task-owned changes only.

## Task 7: Documents, load planning, departure, training, and reports

**Files:** Modify `src/Components/Documentation/PaperworkDocument.js`, `AttlaCertification.js`, `Dsoe.js`, `MilitaryShippingLabel.js`, `AircraftPackage.js`, `PrintManifest.js`, `AfterActionReport.js`, `CdfGradingSheet.js`; `src/Components/LoadPlan/LoadPlan.js`; `src/Components/Departure/Departure.js`; `src/Components/Training/TrainingGuide.js`, `QuickDrills.js`; `src/Components/ProcessPanel/ProcessPanel.js`, `frequentLinks.js`; `src/Components/Session/Grading.js`; claim mappings and corresponding tests.

**Consumes:** Tasks 1–3 and the earlier integration mappings. **Produces:** Remaining contextual/reference/review coverage, including source annotations that preserve supplied form structures.

- [ ] Add failing tests for a completed review citation, a HAZDEC field explanation, a verified load/departure requirement, and a quick-drill explanation. Assert simulated load-floor limits, fictional schedules, and pending ATTLA thresholds do not receive false authoritative quotations.
- [ ] Run affected suites, then integrate explicit links and reference annotations without making simulated form values clickable controls or exposing answer hints during tests. Keep public reference resources intentionally distinct from documents opened inside active assessments.
- [ ] Verify quoted ATTLA text against the actual issued letter before exposing it as a quotation; mark access gaps when the letter cannot be independently located. Audit source editions and correct broad frequent links only where a specific claim has a verified section.
- [ ] Check Execution Load List and marshaling placards at 500, 768, 1024, and 1440 px, including long quotations in floating/popup windows; verify every rightmost column remains visible and remarks values are unchanged. Rerun affected suites, update coverage, and commit task-owned changes only.

## Task 8: Coverage closure and final verification

**Files:** Finalize `docs/reference/regulation-coverage.md`, `regulation-source-verification.md`, and affected tests. Make only fixes supported by newly observed failures.

**Consumes:** All integrated screens, catalog, verification evidence, and audit ledger. **Produces:** Reviewable evidence of completed coverage and an explicit list of any unavailable/unsupported claims.

- [ ] Reinspect every source area against the ledger, including uncited numeric constants, instructions, form help, discrepancy explanations, reference tables, and dynamic feedback. Every operational claim has a verified citation, an identified assumption, an evidence gap, or an explained nonregulatory classification. Search hits alone are not proof of completeness.
- [ ] Validate catalog integrity: every mapped ID resolves, verified records contain exact passages and editions, URLs use the verified source, and physical PDF page mappings were checked. Compare representative passages including exceptions directly against original source files; manually click their destinations in Chrome.
- [ ] Manually test the full interaction matrix: 3-second delay, cancellation, pointer crossing, selection, internal scrolling, focus, Escape, touch details, quick citation switching, nested overlays, child-window closure, and mode changes while pending/open. Check all four browser widths and print output.
- [ ] Run `CI=true npm test -- --watchAll=false --runInBand` and `npm run build`; inspect every failure and warning. Record unrelated baseline failures by name rather than overwriting others' work. Run `git diff --check` scoped to task-owned changes.
- [ ] Obtain one final independent review of evidence accuracy, coverage gaps, assessment isolation, timers, browser-document behavior, and existing-work preservation. Resolve actionable findings and rerun only affected checks, then the required final checks when the change warrants them.
- [ ] Report exactly which app areas are covered, tests/build results, and every unresolved evidence/access gap. Do not claim complete verified authority where gaps remain. No deployment unless separately requested.

## Execution handoff

Recommended method: **Native**. Source verification and UI integration share the same evolving catalog and coverage ledger; implementing sequentially in this session avoids repeatedly copying that context. One independent review at the end checks the complete change. The alternative is **Subagent-driven**, with fresh implementer/reviewer contexts per task and greater context cost.

The user must review this plan and select the execution method before implementation, per the writing-plans workflow. No product changes are included in this planning stage.
