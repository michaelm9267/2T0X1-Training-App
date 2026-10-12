# CDF Trainee Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended by the skill) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all seven approved trainee improvements in the existing CDF application with local instructor assignments, reproducible assessment attempts, and saved results.

**Architecture:** A training session controller owns scenario snapshots, per-piece exercises, submitted stages, meaningful action history, and attempt lifecycle. Pure scenario, assessment, evaluation, and repository modules support mode-aware existing components and new training/instructor/report views. Existing operational correctness gates remain in guided practice; assessment uses procedural submission gates and evaluates correctness at the end.

**Tech Stack:** Existing React, react-scripts, Jest, React Testing Library, SVG models, and browser storage/file APIs; no additional dependencies.

**Spec:** `docs/superpowers/specs/2026-10-11-trainee-improvements-design.md`, approved by the user on 11 October 2026.

## Global Constraints

- Retain Precheck → Incheck → Manifest → JI, supported equipment, DSOE, CMOS/DG2, MSL, frustration, and ATTLA activities.
- Use the existing React app and installed dependencies, without introducing accounts, a server, or an external service.
- Work in the shared IDE checkout and preserve existing uncommitted work; do not create a worktree missing it, stage unrelated files, or commit without user instruction.
- Guided practice is the default; switching mode creates a new attempt.
- Assessment retains finite wrong values and classifications, hides correctness/hints/worked CB until submission, and never labels procedural submission as airworthiness approval.
- Use five scoring categories: paperwork 20%, measurements/CB 20%, inspection/correction 25%, manifesting 20%, and final JI/disposition 15%.
- Default satisfactory assessment: 80% overall and no missed critical discrepancy in the final movement disposition.
- JSON import limit: 1 MB. Maximum archived attempts: 100. Imported results and submitted attempts are read-only.
- Preserve fixed container/pallet footprints, inch/lb units, common RDL, axle weight/gross consistency, and supplied reference/letter contents.
- Product source changes begin after plan review and execution-method selection.

## Review Focus

1. An upstream edit after submission must reopen the affected/downstream stages while preserving event history (Tasks 2, 6).
2. Selecting another trainee, resetting a piece, or importing a result must not overwrite someone else's active/history data (Tasks 7, 8).
3. Assessment controls must not reveal expected answers through messages, labels, disabled-button behavior, colors, or CB calculations (Tasks 4, 6).
4. A held unsafe asset must be a submit-able and correctly assessable outcome; falsely declaring a safe asset unsafe must also be recorded (Tasks 2, 3, 6).
5. Storage failure, malformed imports, and refresh during a document correction must recover without rerolling physical cargo or silently discarding records (Tasks 5, 7).

## File map and canonical interfaces

Create `src/Training/` for the shared training model and related views; keep existing cargo/document modules in their current directories. Tests live alongside their owning modules, as in the existing project.

Canonical plain-object shapes (schema version 1):

- `Assignment`: `{id, title, mode:'guided'|'assessment', difficulty:'beginner'|'intermediate'|'advanced', seed:string, equipmentIds:string[], pieceCount:number, destination:string, defectSelection:'random'|string[], passThreshold:number}`. Bounds: 1–12 pieces; threshold 0–100; nonempty seed ≤128 characters; title/profile display names ≤120 characters. Equipment/destination/defect IDs must be supported.
- `DocumentPacket`: `{revision:number, values:Record<string,string|number>, contents:Record<string,string[]>, copies:Record<string,number>}`. Values use existing manifest field IDs, including TCN, origin, destination, APOE/APOD and hazard indicator.
- `TrainingPiece`: `{key, scenario, initialDocuments:DocumentPacket, answerKey}`. The key and initial snapshots do not change during an attempt. `answerKey` contains physical measurements, initial conditions, applicable paperwork/ATTLA requirements, and existing reference metadata.
- `PieceState`: `{exercise, documents:DocumentPacket, preparedState:Record<string,boolean|number|string>, submittedStages:string[], disposition:null|'ready'|'hold', discrepancyReports:Array<{documentId,fieldId,observedValue,note}>}`. Current document revisions and prepared-state changes are distinct from frozen initial conditions.
- `TrainingEvent`: `{sequence:number, at:number, pieceKey:string|null, stage:string|null, type:string, payload:object, revision:number|null}`. Only explicit records/submissions/corrections are logged, not mouse moves or draft typing. Event payloads capture first submissions before later edits overwrite live state.
- `TrainingSession`: `{version:1,id,profileId,assignment,pieces:TrainingPiece[],pieceStates:Record<string,PieceState>,selectedPieceKey,selectedStage,status:'in-progress'|'submitted',events:TrainingEvent[],startedAt:number,lastActiveAt:number,activeMs:number,submittedAt:number|null}`.
- Category IDs: `paperwork`, `measurement-cb`, `inspection`, `manifest`, and `ji`, in the stated weighting order.
- `EvaluationReport`: `{version:1,attemptId,profileId,assignment,mode,seed,activeMs,firstScore:number,finalScore:number,passed:boolean,categories:Array<{id,weight,firstScore,finalScore}>,pieceResults:Array,criticalErrors:Array,events:Array,retryCategory:string}`.
- `TrainingLibrary`: `{version:1,profiles:Array<{id,displayName}>,assignments:Assignment[],sessions:TrainingSession[],reports:EvaluationReport[],activeSessionId:string|null}`.

No DOM nodes, matrices, callbacks, open-modal state, or random-generator closures are serialized. `preparedState` overlays renderable condition changes; `exercise.answers.corrected` alone is not proof that a generated physical discrepancy was corrected.

All commands enter `trainingReducer(library, action) -> TrainingLibrary`. Actions carry `{type, sessionId?, pieceKey?, stage?, payload?, at:number}`. Commands are named: `START_SESSION`, `SELECT_PIECE`, `SELECT_STAGE`, `RECORD_OBSERVATION`, `RECORD_NOTEBOOK`, `RECORD_DECISION`, `RECORD_CB`, `PLACE_TAPE`, `REMOVE_TAPE`, `SUBMIT_MANIFEST`, `APPLY_MSL`, `RECORD_DOCUMENT_REVIEW`, `VERIFY_COPIES`, `REQUEST_COPIES`, `RECORD_ATTLA_DECISION`, `VERIFY_ATTLA_LETTER`, `REPORT_DISCREPANCY`, `REVISE_DOCUMENTS`, `HOLD_PIECE`, `CORRECT_COMPONENT`, `RELEASE_PIECE`, `VERIFY_JI`, `SET_DISPOSITION`, `REQUEST_HINT`, `SUBMIT_STAGE`, `SUBMIT_ATTEMPT`, `RETRY_ATTEMPT`, and library CRUD/import commands defined in Tasks 7–8. Form draft changes use `EDIT_RESPONSE` and are not scored events; they still invalidate affected submissions.

Use the reducer to bridge existing helpers, with mode policy owned by the assessment/controller modules. Remove opaque `onWorkflow(updateFunction)` writes as components migrate, so events cannot be skipped by an unaudited callback.

---

### Task 1: Seeded scenario builder and independent paperwork

**Files:** Create `src/Training/{random,defects,scenarioBuilder,fixtures}.js` and `scenarioBuilder.test.js`; modify `src/Components/CargoWindow/{scenarioVariants,pieces,scenarios}.js`.

**Interfaces:** `seededRandom(seed:string)->()=>number`; `validateAssignment(assignment)->string[]`; `buildTrainingPieces(assignment)->TrainingPiece[]`; `buildDocumentPacket(scenario)->DocumentPacket`. `fixtures.js` exports `safePalletAssignment`, `criticalVehicleAssignment`, and `paperworkMismatchAssignment` for later tasks.

- [ ] Write tests named `same_seed_reproduces_all_snapshots`, `only_applicable_defects_are_generated`, `safe_and_multiple_defect_pieces_are_possible`, and `physical_and_declared_values_are_independent`. Assert identical pieces for the same seed, container-only defect rejection on vehicles, gross/axle sums, ordered in-body stations, usable tape panels, and a weight-mismatch document whose physical weight is unchanged.
- [ ] Run `CI=true npm test -- --watchAll=false --runTestsByPath src/Training/scenarioBuilder.test.js`; confirm new tests fail before implementation.
- [ ] Implement the interfaces. Use a small deterministic integer PRNG seeded from the string. Choose defects without replacement from equipment-specific registries: beginner 0–1, intermediate 0–3, advanced 0–5; an explicit empty defect list produces satisfactory cargo. Add battery/fuel/restraint/access/net/tie-down/dunnage/content variants and document mismatch variants. Constraints filter impossible combinations before selection; generator retries at most 20 times and then reports an assignment error rather than hanging.
- [ ] Generate `DocumentPacket` independently of physical measurements after applying selected mismatches. Freeze initial snapshots by treating them as immutable and making fresh per-piece copies. Preserve supplied letter text and model-specific load distributions; remove the blanket front-axle-heaviest constraint from generic randomization.
- [ ] Run the new tests and existing `scenarioVariants.test.js`, `transportability.test.js`, and `notebook.test.js`; expect PASS. Review task changes against the approved geometry/applicability constraints.

### Task 2: Session controller, history, and assessment progression

**Files:** Create `src/Training/{session,assessment,trainingReducer}.js` and `trainingReducer.test.js`; modify `src/Components/CargoWindow/exercise.js` with explicit policy options.

**Interfaces:** `createSession({profileId,assignment,id,at})->TrainingSession`; `getStageReadiness(session,pieceKey,stage)->{ready:boolean,missing:string[]}`; `getStageStatus(session,pieceKey,stage)->'pending'|'ready'|'submitted'|'complete'`; `trainingReducer(library,action)->TrainingLibrary`; `remainingConditions(session,pieceKey)->Array<{id,critical,reason,source}>`.

- [ ] Write tests `wrong_finite_responses_can_submit_in_assessment`, `guided_keeps_correctness_gates`, `upstream_edits_reopen_downstream_without_erasing_events`, `held_piece_has_a_submission_path`, `final_attempt_is_read_only`, and `first_submissions_survive_edits`. Assert an incorrect observed weight is retained, a submitted manifest is not called verified, and an unsafe held piece does not require acceptance into the manifest to finish an attempt.
- [ ] Run `CI=true npm test -- --watchAll=false --runTestsByPath src/Training/trainingReducer.test.js`; confirm FAIL for missing interfaces.
- [ ] Implement reducer actions and immutable session updates. Stage snapshots are recorded by `SUBMIT_STAGE`; direct record actions retain field-level first submissions. Guided mode delegates correctness checks to existing helpers; assessment readiness checks observed evidence and structurally complete responses only. Do not gate wrong judgments on hidden expected answers.
- [ ] Implement these assessment readiness rules without consulting expected correctness: Precheck needs DSOE review, document-presence/copy-count responses for all four document types, and an ATTLA review response when screening applies; a present required letter must be opened before its response. Incheck needs recorded finite dimensions/gross/axle values, tape/scale observations in the applicable views, inspected component decisions, and—for vehicles—a manual CB response and typed tapes on both sides. Manifest needs all main fields plus DG2/T-9 when the trainee-selected indicator is hazardous, followed by a submission and MSL action. JI needs fresh document/component/measurement/marking observations and explicit final responses. A syntactically valid wrong endpoint or datum is retained for grading; readiness must not demand the expected endpoint. Missing or forgotten documents can be reported and held rather than magically opened.
- [ ] Define a held path: once the piece has applicable observations, classifications, and an identified hold reason, later stages record “held—not manifested/released” with final `hold` disposition rather than requiring a manifest/MSL. False holds remain possible responses and are graded. Final attempt submission requires a disposition for every selected piece and all applicable procedural responses on ready pieces.
- [ ] Invalidate downstream submission/MSL/JI evidence on upstream edits; document-only corrections preserve physical readings. Ignore mutation commands for submitted sessions. Accumulate active time as `max(0,min(at-lastActiveAt,120000))` per interaction; ignore time spent hidden or suspended and add no speed score. Log hints once per request, and use monotonic event sequence numbers across resume.
- [ ] Run reducer and existing `exercise.test.js`, `frustration.test.js`, and `workflow.test.js`; expect PASS. Review invalidation, held-path, and event semantics.

### Task 3: Pure evaluation and after-action reporting

**Files:** Create `src/Training/{evaluation,referenceMap,AfterActionReport}.js`, `evaluation.test.js`, `AfterActionReport.test.js`, and `training.css`.

**Interfaces:** `evaluateAttempt(session)->EvaluationReport`; `evaluateCategory(session,categoryId,{first:boolean})->{score,items}`; `<AfterActionReport report onRetry onExport />`. Item results contain `{pieceKey,taskId,actual,expected,correct,critical,reason,consequence,source}`.

- [ ] Write `weights_sum_to_100_and_only_applicable_items_count`, `unsafe_ready_disposition_fails_above_80_percent`, `correct_hold_is_not_an_incomplete_attempt`, `false_hold_is_scored`, `first_score_is_not_overwritten_by_corrections`, and `bad_observation_is_distinguished_from_cb_arithmetic`. Use frozen fixtures and submit events from Tasks 1–2.
- [ ] Run `CI=true npm test -- --watchAll=false --runTestsByPath src/Training/evaluation.test.js`; confirm FAIL.
- [ ] Implement the five exact category weights and threshold/critical-error rule. Compare first-record events and first stage snapshots independently from final state. Within a category score applicable rubric items equally; each supported piece contributes the same normalized category weight. Omit genuinely nonapplicable categories and renormalize their weights. Calculate internal precision without rounding until final display.
- [ ] Use existing `calculateCB` for both physical truth and arithmetic on recorded inputs. Grade arithmetic even if the inputs are wrong; report an invalid axle/gross combination separately when the calculator cannot evaluate it. Evaluate marking values/locations on each side and final unresolved critical conditions before marking a piece ready. Pure evaluation does not mutate exercises or reveal results to an active assessment.
- [ ] Implement the report view with category/first/final results, hints, active time, per-piece errors, corrective explanations, reference edition/link, and targeted retry. Guided results say “Supported practice”; assessment results say “Assessment”. Report viewers are read-only and text is rendered without HTML interpretation.
- [ ] Run evaluator/report tests; expect PASS. Review scoring fairness, final-disposition grading, and reference mapping; keep unverified training rules labeled as such.

### Task 4: Integrate mode-aware session actions and manual assessment CB

**Files:** Modify `src/App.js`, `src/Components/CargoWindow/{notebook,MeasurementNotebook,CBWorksheet,LabelingTape,vehicleInspection}.js`, `src/Components/Documentation/{DocumentationPanel,ShipmentPaperwork,ManifestScreen,FrustrationPanel,FrustrateButton,Dsoe,ManifestView,MilitaryShippingLabel}.js`; create `src/Training/ModeControls.js` and `assessmentFlow.test.js`; preserve existing test files.

**Interfaces:** `<ModeControls mode onNewAttempt />`; training-aware component props `{mode,dispatch,session,pieceKey}`; existing guided helper calls default to `{mode:'guided'}`. Use Task 2 commands rather than independent callback mutation.

- [ ] Write an assessment integration test: record a viewed wrong finite weight, choose a wrong inspected classification, enter wrong CB, submit each stage, and verify the wrong values remain recorded while no “Correct decision”, expected CB, mismatch field highlighting, or answer-based disabled action is shown. Also test a single-sided tape response is retained and not mirrored in assessment.
- [ ] Run `CI=true npm test -- --watchAll=false --runTestsByPath src/Training/assessmentFlow.test.js`; confirm FAIL.
- [ ] Replace App's independent shipment/exercise/session state with the reducer and session selectors. Keep destination/piece selection, DSOE, manifest table, modal close behavior, and MSL interactions. Initialize a default guided session with the current equipment set so existing users can start without instructor setup.
- [ ] Add manual CB entry/submission in assessment and defer moment/result display to the report. Assessment tape validates finite coordinates and readable values only, retaining wrong values/locations for evaluation; guided validation remains immediate. Require observations before actions but remove answer-key gates from assessment physical correction controls.
- [ ] Separate submitted manifest data from an operationally accepted manifest. Assessment may submit wrong fields and produce a training MSL from its own submitted fields; compare these later. Do not build an assessment label from hidden canonical values. A held piece uses the Task 2 alternative path. Hide ATTLA expected-disposition feedback, manifest correctness highlighting, frustration validity feedback, correct-answer colors, and explanatory corrections during active assessments.
- [ ] Update existing guided tests only for intentional session UI changes; preserve behavioral assertions. Run `assessmentFlow.test.js` plus the full existing App/cargo/workflow regression set; expect PASS. Review every hidden-answer surface, including tab error markers, automatic UN metadata fills, labels, button states, and global stage locks.

### Task 5: Document reconciliation and visible cargo corrections

**Files:** Create `src/Training/{documentRevisions,inspectionRegions}.js`, `documentRevisions.test.js`, `inspectionRegions.test.js`; modify `src/Components/CargoWindow/{frustration,cargoModels,CargoPerspective,CargoWindow,VehicleInspectionPanel}.js`, `src/Components/Documentation/{PaperworkDocument,ShipmentPaperwork,ManifestScreen}.js`, and relevant CSS.

**Interfaces:** `documentValues(session,pieceKey)->Record`; `reviseDocuments(session,pieceKey,{documentId,fieldId,observedValue,note},at)->TrainingSession`; `inspectionRegions(scenario,view)->Array<{id,title,x,y,width,height,interior}>`; `effectiveConditions(scenario,preparedState)->Record`.

- [ ] Write `mismatch_uses_documents_not_physical_truth`, `correction_increments_revision_and_invalidates_document_evidence_only`, `incorrect_correction_request_does_not_resolve_mismatch`, and `refreshable_revision_state_is_plain_data`. Add tests that a corrected net renders intact, secured cargo changes visibly, and generated missing dunnage is added only after correction.
- [ ] Run document/inspection tests before implementation; confirm FAIL.
- [ ] Route all document/manifest defaults to the current packet values; scale/measurement/model geometry continues using physical state. Add a discrepancy report form and simulated increment-monitor correction request that requires the document/field and the trainee's observed value. Retain wrong requests in assessment without silently repairing the document. Record revision events and require re-review/recount of affected documents before release in guided mode. In assessment, corrections are available after the applicable observation and discrepancy report, without first revealing or requiring the correct classification.
- [ ] Render generated and corrected conditions using `effectiveConditions`, including nets, restraint straps, doors/access, equipment, tie-downs, contents, and dunnage. Pass prepared state into both orthographic and perspective models so text, visuals, and evaluation agree. Keep official source letter content unchanged.
- [ ] Add component-named SVG inspection regions, keyboard focus/Enter/Space support, and equivalent accessible controls. Interior regions require opened doors. Assessment titles/readouts show observations rather than “undeclared”, “damaged”, or the expected classification before inspection.
- [ ] Run new tests plus cargo/model/document/frustration tests; expect PASS. Review coordinate alignment, no visual spoilers, and revision invalidation.

### Task 6: Guided next actions, hints, and final submission UI

**Files:** Create `src/Training/{guidance,NextAction,TrainingToolbar}.js`, `guidance.test.js`, `NextAction.test.js`; modify App, ProcessPanel, DocumentationPanel, CargoWindow, and relevant modal launchers.

**Interfaces:** `getNextAction(session,pieceKey)->{title,stage,target,tool?,documentId?,fieldId?}|null`; `getHint(session,pieceKey,taskId,level)->string`; `<NextAction action onOpen />`; `<TrainingToolbar session onSubmitStage onSubmitAttempt onRetry onHint />`. Opening a target uses UI navigation state, not scoring mutations.

- [ ] Write `guided_action_targets_missing_observation_before_response`, `held_asset_guidance_targets_correction`, `new_revision_changes_next_action`, `assessment_guidance_never_names_a_hidden_defect_or_value`, and `hint_requests_are_counted_and_unavailable_in_assessment`. Test that opening a tool does not mark the task complete.
- [ ] Run guidance/view tests; confirm FAIL.
- [ ] Implement next actions from applicable tasks and structural prerequisites. Provide two guided hint levels: method/reference, then a more explicit action; record each request via Task 2. Assessment shows missing response categories/counts only. Next-action links open the corresponding document, view/tool, or form and move focus accessibly.
- [ ] Add stage/final submission, disposition selection, outcome report navigation, and retry controls. Explain reopened stages after upstream edits and enforce read-only final attempts. Request an explicit new-attempt action for a mode change. Confirm reset/new attempt when replacing unsaved active work; archive completed work rather than overwriting it.
- [ ] Run tests and assessment integration tests; expect PASS. Review guided action usability and assessment confidentiality.

### Task 7: Persistence and safe artifact import/export

**Files:** Create `src/Training/{validation,repository,artifacts,useTrainingLibrary}.js`, corresponding test files; modify App, report view, and `src/setupTests.js`/test setup for isolation.

**Interfaces:** `validateLibrary(value)->{ok,value?,errors}`; `loadLibrary(storage)->{library:null|TrainingLibrary,error:null|string,raw:null|string}`; `saveLibrary(storage,library)->{ok,error?}`; `parseImport(text,byteLength)->{kind:'assignment'|'report',value}` or a caught validation error; `mergeImport(library,artifact)->TrainingLibrary`; `exportJson(kind,value)->string`; `exportCsv(reports)->string`; `useTrainingLibrary()->{library,dispatch,saveStatus,recovery,exportBackup}`.

- [ ] Write `resume_does_not_reroll_or_lose_revisions`, `corrupt_and_unknown_version_data_is_retained_for_recovery`, `storage_failure_allows_current_work_and_backup`, `oversize_and_malformed_imports_do_not_mutate_library`, `report_import_is_read_only_and_deduplicated`, and `archive_limit_requires_explicit_removal`. Include formula-like CSV strings such as `=1+1` and assert neutralized exported cells.
- [ ] Run repository/validation/artifact tests; confirm FAIL.
- [ ] Use storage key `cdf-training:v1`, 250 ms debounce, immediate saves on stage/final submission, and best-effort flush on `pagehide`. On restore close all modals and preserve valid selected piece/stage. Catch storage errors and retain an in-memory usable library plus recovery/export controls. Tests clear storage and control seed/time so persisted attempts do not leak between tests.
- [ ] Validate schemas, versions, enum IDs, numeric finiteness, references, and array bounds without executing imported objects. Limit file bytes to 1 MB. Assignment imports do not activate sessions automatically; report imports remain archived results. Reject unsupported versions with a visible explanation and preserve current data.
- [ ] Implement JSON/CSV/print downloads using browser Blob/object URLs; revoke URLs after use. CSV quotes fields and neutralizes formula-leading text. At 100 archived attempts, ask for export/removal rather than evicting silently. Profile/attempt deletion preserves unrelated sessions/history; export a raw backup for unreadable saved data.
- [ ] Run module tests and App reload integration tests; expect PASS. Review data isolation, recovery, and export/import round trips.

### Task 8: Local instructor dashboard and assignment/profile controls

**Files:** Create `src/Training/{InstructorDashboard,AssignmentEditor,ProfileSelector}.js`, `InstructorDashboard.test.js`; extend trainingReducer/validation; modify App and `training.css`.

**Interfaces:** `<InstructorDashboard library dispatch onOpenReport />`; `<AssignmentEditor assignment onSave onCancel />`; `<ProfileSelector profiles selectedId onSelect onCreate />`. Library actions: `UPSERT_PROFILE`, `DELETE_PROFILE`, `UPSERT_ASSIGNMENT`, `DELETE_ASSIGNMENT`, `IMPORT_ARTIFACT`, `DELETE_ATTEMPT`, and `OPEN_SESSION`.

- [ ] Write `profiles_and_assignments_are_isolated`, `unsupported_defect_configuration_is_rejected`, `starting_assignment_keeps_previous_attempt`, `filters_and_report_details_agree`, and `importing_result_does_not_create_an_editable_assessment`. Assert threshold default 80 and equipment/count/destination/seed validation.
- [ ] Run instructor/reducer tests; confirm FAIL.
- [ ] Implement local instructor view with profile management, assignment editor, defect applicability filtering, mode/difficulty/destination/seed/count/threshold controls, and a results table. The critical-error condition is always visible. Filter by trainee, mode, completion status; inspect reports and recurring error categories. No sign-in or claimed online result collection.
- [ ] Wire assignment/report JSON import/export, summary CSV, and printable reports to Task 7. Changing assignment or profile never overwrites another attempt; offer resume/new session explicitly. Make submitted/imported report actions read-only. Deleting an assignment does not delete its historical attempt snapshots.
- [ ] Run instructor and full App regressions; expect PASS. Review device-local behavior and keyboard/form accessibility.

### Task 9: Full acceptance checks and completion

**Files:** Create `src/Training/trainingAcceptance.test.js`; update existing tests only for intentional changes; append `docs/superpowers/plans/cargo-simulator-progress.md` with evidence and limitations.

- [ ] Write end-to-end tests for a guided shipment, satisfactory assessment, critical error accepted for movement, correct held asset, paperwork mismatch/revision/release, multi-piece profile isolation, and persisted resume. Assert report contents and no answer leakage before submission, not only button-click completion.
- [ ] Run `CI=true npm test -- --watchAll=false`; all current/new tests must PASS. Run `npm run build`; require successful production compilation with no new lint warnings. Run `git diff --check`; require no whitespace errors. Do not claim these results before seeing their actual output.
- [ ] If browser tooling is available, inspect desktop/mobile layouts and keyboard navigation through cargo hotspots, documents, CMOS/DG2 modal, report, and instructor views. Check focus trapping/return in modal flows and make a complete guided/assessment attempt. If unavailable, report the limitation without claiming a visual check.
- [ ] Request the final independent code review using the requesting-code-review skill. Resolve important findings and rerun the affected tests/build; preserve existing uncommitted work throughout.
- [ ] Document delivered behavior, exact test/build results, import/export instructions, local storage scope, and any remaining material limitations. Deliver a self-contained user summary with access points for mode, instructor dashboard, reports, and resume. Do not deploy or commit unless the user requests it.

## Dependency order and execution recommendation

Execute Tasks 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Each deliverable has a focused failing-test/implementation/passing-test cycle before proceeding; the app keeps guided compatibility while later views are connected. This is one coherent training/session subsystem, so shared interfaces belong in this plan rather than unrelated parallel plans.

Recommend native execution in this session with a final independent review: the nine tasks share session, event, scenario, and grading interfaces. Native execution keeps that context together and avoids repeated handoffs. Subagent-driven execution remains available if the user prefers per-task independent implementer/reviewer gates.

## Self-review and handoff

Coverage: all seven user improvements map to Tasks 1–8, with acceptance in Task 9. Held outcomes, independent paperwork, first-attempt history, profile isolation, missing evidence, no-answer-leak assessment behavior, invalidation, imports, and storage failure have owning tests above. Types/function names follow the canonical interfaces; implementation should extend these deliberately rather than introducing anonymous parallel state.

Status: plan ready for user review. Product code has not changed as part of this planning work. After approval, use the selected execution skill and implement all tasks.
