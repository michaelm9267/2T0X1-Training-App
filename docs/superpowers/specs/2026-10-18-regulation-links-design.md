# Regulation links and quoted tooltips

Date: 18 October 2026
Status: Written specification approved by the user; implementation plan awaiting review and execution-method selection.

## Purpose and approved behavior

Audit the entire training app and attach evidence to regulatory references and operational information that reasonably prompts “why?” This includes requirements, numerical limits, formulas, document rules, inspection criteria, release conditions, and explanations of mistakes. Clicking cited information opens the governing source in a new tab. Hovering for three continuous seconds shows the exact relevant source wording. The quotation stays open while the pointer is over its trigger or popup, including while selecting text or scrolling within the popup.

The user explicitly selected practice and reference views only. Guided and practice modes receive contextual links and quotations. Active assessment views do not receive these new aids. Standalone reference resources and completed after-action review may show citations; an assessment screen does not become a reference view simply because it contains a document or opens another browser window. Existing independent reference links are audited for accuracy, without expanding assessment hints.

Work remains in the existing React application with no runtime source-fetching service, new accounts, or persistence migration. Preserve ongoing workspace edits. This specification does not authorize deployment or changes to supplied source documents.

## Current app and evidence gaps

- The initial search found references in at least 45 non-test source files. Coverage must also include unreferenced rules and explanatory text, rather than stopping at those search matches.
- `CargoWindow/scenarios.js` already stores paragraph and printed-page metadata for inspection findings. `DocumentationPanel`, `DD2133Form`, and `JiInspectionList` render some PDF page links.
- `Glossary/AcronymTooltip` detects acronyms throughout the DOM. Its popup has `pointer-events: none` and is unsuitable for selecting or hovering over regulatory passages.
- CMOS includes checked-in AFMAN and DTEB reference tables. The existing scripts and review documents supply useful provenance, but generated lookup data is not sufficient evidence for unrelated operational claims.
- Some ATTLA screening criteria explicitly say official paragraph verification is pending. Load planning and certain document quantities are simplified training assumptions. They must not acquire invented regulatory authority.
- `Cmos/PaperworkWindow` renders into a separate browser document. Tooltip placement, listeners, style availability, and mode restrictions must work in that document too.
- CDF and outbound have their own mode handling. The feature must use the effective mode of the rendered flow rather than relying on one global screen state.

## Chosen approach

Use a shared, verified citation catalog and an explicit React link/popover component. Call sites identify the relevant claim; catalog records hold its source passage and location. Data-driven findings reference stable citation IDs so repeated explanations use the same evidence.

Page-specific implementations would duplicate hover behavior and source text. Automatically converting arbitrary DOM text into links risks citing the wrong claim and modifying editable controls or document content. Explicit components and data mappings make coverage and source correctness reviewable.

## Source verification and catalog

Create a regulation catalog under `src/Components/Regulations/`. Separate publication metadata from passages. A publication records its identifier, official URL, exact edition/change information, retrieval date, and document fingerprint where a downloadable file is available. A verified passage records a stable citation ID, publication ID, exact paragraph/table/row, printed page, physical PDF page when applicable, exact source text, and the applicable claim or conditions.

Verify text against the actual official document, not an existing app summary, search snippet, or inferred paragraph. Normalize PDF layout whitespace only; preserve words, negation, punctuation, units, enumerated conditions, and relevant exceptions. Include enough adjoining text to avoid turning a conditional rule into a universal requirement. Mark clearly any intentional noncontiguous excerpts; do not silently join them into a quotation.

Source families identified for the audit include:

- USTRANSCOM DTR Part II chapters and appendices used by outbound, shipment identification, routing, hazardous cargo, documentation, and funding.
- DTR Part III deployment, joint inspection, center of balance, marshaling, and load-planning material, including Appendices O, P, Q, and V where applicable.
- DAFI 10-403, DAFI 24-602V2, DAFI 24-605V2, and AFMAN 24-604 for the claims actually presented in the app.
- Official DTEB code definitions, relevant public 49 CFR sections, MIL-STD-129 provisions, DLM/MILSTRIP/MILSTRAP instructions, and issued ATTLA letters when an app claim depends on them.

Use the official source that actually supports each claim. A broad reference to an entire manual is not verified paragraph evidence. Confirm that the edition matches the linked file; resolve superseded guidance and citation errors encountered by this audit with targeted, evidence-backed corrections. Do not silently preserve an obsolete requirement while linking it to a contradictory newer edition.

If a source is inaccessible, restricted, proprietary, missing, or does not support the claim, do not fabricate a passage or display an app paraphrase as an exact quotation. Record the evidence gap in the coverage audit. Identify actual simulation assumptions as such in the relevant reference explanation, with no false regulatory link. Existing user-supplied criteria remain identifiable as training criteria until independently verified. No wholesale reproduction of proprietary publications.

## Links and exact locations

Verified links use `target="_blank"` and `rel="noopener noreferrer"`. The ordinary rendered anchor opens the source directly, without waiting for the hover timer or requiring JavaScript navigation.

Prefer official HTML paragraph anchors or verified PDF named destinations. When a PDF has no paragraph destination, link to its correct physical `#page=` location, optionally with a tested search fragment. Always show the exact paragraph/table identifier in the popup and source label. Do not derive physical PDF page numbers solely from a printed footer, since covers and change notices can offset them. Do not promise paragraph highlighting that the PDF viewer cannot provide.

When a claim needs multiple passages, display each relevant citation with its own quotation and link. Field labels that control inputs retain their label association; place a citation link beside them rather than nesting an anchor inside a button, select, or editable value. Printed document facsimiles retain their form structure; reference annotations must not obscure values or become simulated official form entries.

## Link and popup interaction

Build one shared `RegulationLink` and associated popup implementation with mode policy supplied through context or explicit props where the existing flow requires them.

- Start a 3,000 ms timer on pointer entry. Movement within the same trigger does not restart it. Leaving before the threshold cancels it. Re-entering starts a fresh timer.
- Show no popup before the full delay. Clicking opens the source immediately through the anchor.
- Once open, keep the popup mounted while the pointer or keyboard focus is within either the trigger or popup. Use a short dismissal grace period, approximately 200 ms, to allow crossing the visual gap. Cancel dismissal when either area is re-entered.
- The popup allows pointer interaction, text selection, vertical scrolling, and activation of its source link. A long passage fits within the viewport and scrolls internally.
- Escape dismisses it. Moving away from both scopes dismisses it after the grace period. Trigger unmount, owner-window closure, mode changes, and source changes cancel pending timers and remove stale popups.
- Keyboard focus opens the citation content without requiring a mouse hover; focus can move into the popup and to its source link. Avoid a focus trap. Provide an accessible description and appropriate nonmodal popup semantics; an interactive popup must not be mislabeled as a purely textual tooltip.
- Touch users can open the normal link, with an adjacent accessible details control for reading the passage without navigating away.
- Only one quotation popup is visible at a time per browser document. When switching triggers, an old passage cannot appear under the new trigger.
- Position relative to the trigger’s `ownerDocument` and `defaultView`. Portal to that document’s body, stay within its viewport, and layer above the app’s floating documents and dialogs. Scrolling/resizing must reposition or close a detached popup predictably.
- Existing acronym definitions remain available. Suppress competing acronym popups over a citation trigger or its open passage. Hide interactive citation overlays in print output.

## App-wide coverage audit

Maintain `docs/reference/regulation-coverage.md` during implementation. Each entry records the screen/data location, claim, source/citation IDs, verification result, and integration status. Every audited operational claim must end in a supported citation, an identified simulation assumption, an evidence gap, or a reason it needs no regulatory authority. This ledger bounds the “anything someone would ask why” request and makes completeness reviewable.

Audit both rendered components and their data/logic definitions:

1. CDF process steps, cargo measurements and CB worksheets, labels, notebook instructions, inspection findings, packing/fuel/battery limits, discrepancy explanations, and correction/hold guidance.
2. Shipment documents, HAZDEC review, DD 2133 blocks, ATTLA screening/certification information, LOGMOD/placard annotations, DSOE, and printable review material.
3. CMOS shipment planning, pieces, indicators, hazardous records and code lookups, manifests, pallets, routing, commercial bills of lading, release/cancellation conditions, and source-table definitions.
4. Outbound receipt, document checks, packing/marking, shipment priority, consignee/address rules, CMOS entries, and release instructions.
5. Load planning, departure checks, processing schedules, training guide, quick drills, reference lists, and after-action explanations.

Citation IDs augment existing data without changing saved answers or grading criteria. Do not rewrite simulation mechanics just to find a nearby source. If verification reveals a materially incorrect training rule, document the evidence and make only the necessary correction with a regression test.

## Validation and completion criteria

Use fake timers for interaction tests: absent at 2,999 ms, visible at 3,000 ms, early exit cancellation, stable hover during trigger movement, safe crossing into the popup, persistence during scrolling/selection/focus, dismissal on exit/Escape, rapid trigger switching, and cleanup on unmount and mode changes.

Verify ordinary links open in a new tab with safe relationship attributes and the expected source location. Test citation policy in guided/practice, active assessment, standalone reference, after-action review, and the outbound flow. Active assessment must expose neither new contextual links nor hidden quote content via accessible labels or mounted popups.

Catalog checks validate required provenance, known IDs, usable URLs, paragraph identifiers, and valid PDF page mappings. Check representative quotations against the original source files. Component tests cannot establish that a quotation is authentic; source comparison and the coverage ledger are required evidence.

Manually check popup placement, pointer travel, long quotes, nested scrolling, keyboard operation, narrow viewports, floating dialogs, and the separate paperwork window in a real browser. Run the appropriate existing tests, the full test suite, and a production build before reporting completion.

Completion requires an audited coverage ledger across every listed app area, working three-second hover behavior, accurate source text and locations for verified claims, explicit accounting for unresolved evidence, and no new assessment aids or document-width regressions. Do not claim all statements have verified authority if evidence gaps remain; report those gaps by claim and publication.

## Handoff

After the user reviews and approves this written specification, write the implementation plan using the writing-plans skill. The plan must separate source verification/coverage work, shared interaction implementation, screen integration, and final verification into reviewable tasks. Execution method is selected after the plan is presented. Product code changes have not started at this specification stage.
