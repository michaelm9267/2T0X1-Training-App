# Shared CMOS implementation and verification

Both CDF and Outbound render `Components/Cmos/CmosWorkspace.js` and use the same record model, screen inventory and operations. Each course and Practice session retains its own state. All eight supplied PDFs were used as reference material, not as authority to initiate real shipments or external transactions.

## Delivery scope

Shipment Planning, DG2, Air Manifest, Commercial BOL/CBL, Truck Manifest, Routings, Small Package Express and Rate Quote share editable fields, child collections, lookups, operational actions and frozen document snapshots. Save and Save and Close preserve incomplete or incorrect input. Explicit checks and operational requests validate saved work. Documentation windows can move, resize, minimize, print and remain open across screen navigation. Finished sessions permit record browsing and document previews while edits remain locked.

Source coverage and limits are detailed in [the field coverage map](2026-10-13-cmos-field-coverage.md). Unopened Rail, Via SCAC, Stop Offs, Water Port, Hold At Location and T-9 tab contents cannot be certified as exact copies from the supplied PDF pages.

## Final review and corrective pass

A fresh read-only review examined the feature delta against the snapshot of the user's existing changes. It reported no Critical findings and fourteen Important findings. All fourteen were addressed in one corrective pass:

1. Normalize malformed nested hazardous lots, carrier rates, saved shapes and history while retaining raw scalar training input.
2. Move Split/Partial physical piece and hazardous ownership together; derive course associations from stable physical assets and credit each asset once.
3. Bind document print credit and applied labels to the owner and its child dependencies; clear manifest and pull-sheet prerequisites after corrections.
4. Invalidate assigned SPE checks/rating when its quote changes; require a current quote before checking again.
5. Require a current Final CBL print for release; Draft printing is insufficient.
6. Abort/Unrelease clears operational prerequisites and withdraws the actual CDF departure release.
7. Deleting managed cargo/SPE withdraws CMOS accomplishments and rating while preserving physical receiving/packing work.
8. Retire record identifiers permanently, including across export/import, so historical documents cannot attach to replacement cargo.
9. Viewing documents is read-only; explicit Print actions award printing credit only for current documents.
10. Nonmodal print options retain their original record across navigation.
11. Finished sessions can select other records through local view state without saving changes.
12. Shipment Planning searches the same derived status, piece count, weight and cube displayed in the result rows.
13. Routing edits require saved, current equipment data rather than an empty unsaved row.
14. CDF paperwork displays unresolved source discrepancies until their corrections are made.

The review's Minor omission of Shipment Status fields was treated as Important because the user requested all documented fields; all seven source history columns are now shown. An additional confirmed Incheck defect was fixed so Next/Previous respect the selected subset. Regression tests live in `lifecycle.test.js` and `lifecycleUi.test.js` alongside the full journey tests.

## Design rulings and limits

- Keep one declarative screen inventory/common renderer for both courses. This prevents drift; highly specific future layouts may need further page components.
- Keep functional training controls for tabs not opened in the guides, with their source limits explicit. Additional screenshots may reveal fields to add.
- Keep carrier, GFM, funds, tracking and pricing deterministic and fictional. These simulations do not establish real prices or perform transactions.
- Do not invent a mandatory truck Load prerequisite where the supplied guide does not establish one. Further source evidence could add that requirement.
- Keep the approved quote-to-SPE assignment workflow. A different freight quote destination requires more specific source evidence.
- Restore only the verified feature delta onto the user's existing working files. Never merge the worktree's snapshot commit, which contains unrelated pre-existing user changes.

No code review Minor finding was deferred; the source and simulation limits above remain explicit.

## Verification evidence

- Baseline before implementation: 236 tests in 38 suites, production build passed.
- Before final review: 284 tests in 46 suites, production build passed.
- Corrective pass: the 21 initial regression cases reproduced the defects before fixes; 305 tests in 48 suites passed after the first fixes. Three additional dependency/departure regressions cover the final edge checks.
- Final production build: compiled successfully with CI treating warnings as errors.
- Chrome browser checks: all seven main pages, documentation across navigation and typing, movable/minimized windows, narrow viewport navigation, incomplete Outbound save surviving reload, and a CBL print window retaining its original target after navigating to Planning. No browser runtime errors.

Final isolated complete suite: **308 tests in 48 suites passed** (`/tmp/transitiq-review-final-tests.log`). Final CI build passed (`/tmp/transitiq-review-final-build.log`). Chrome checks passed without runtime errors (`/tmp/transitiq-review-final-browser.log`), including the retained CBL print target. Before restoration, every existing feature path in the root workspace matched the snapshot baseline; no conflicting user changes were found. Root delivery verification is recorded below after restoration.

## Delivered workspace verification

The feature delta was applied to `/Users/michaelmay/Documents/Coding/Projects/2t0x1_training_app`; all 39 delivered files matched the isolated feature. The user's pre-existing changes and main branch history were preserved. No push or deployment was performed.

- Complete root suite: **308 tests in 48 suites passed**, `/tmp/transitiq-root-final-tests.log`.
- Root CI production build: **compiled successfully**, `/tmp/transitiq-root-final-build.log`.
- Feature diff whitespace check passed. The root's existing trailing blank line in `Outbound/outbound.css` predates this feature and was left untouched.

The isolated feature branch remains available for inspection; the snapshot commit was not merged into main.
