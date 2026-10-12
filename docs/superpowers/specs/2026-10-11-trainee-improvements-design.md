# CDF trainee improvements

Date: 11 October 2026
Status: Design for review; implementation has not started.

## Purpose and agreed scope

Implement all seven improvements requested after the app review: guided/assessment modes, varied discrepancies, paperwork discrepancies, after-action reporting, visual inspection, instructor controls, and saved progress with next-action guidance. Retain Precheck → Incheck → Manifest → JI and the existing equipment, DSOE, CMOS-style manifest, DG2, MSL, frustration, and ATTLA activities.

The user selected an instructor dashboard on this device with assignment/report import and export. Use the existing React app and installed dependencies, without introducing accounts, a server, or an external service. Instructor tools support local instruction; switching views is not authentication. Browser storage and exports are not a secure examination system.

Success means that trainees can process unfamiliar cargo, record a decision without being told whether it is correct, recognize discrepancies, correct or hold the asset, and receive a useful explanation of their performance. Existing mouse measurements, manual notebook entry, snap targets, and supported keyboard interactions remain available.

## Approach

Use a versioned training session around the current cargo and exercise models. Separate the physical asset, its paperwork, trainee-entered values, and the evaluator's expected decisions. Route meaningful actions through one session update function so the UI, attempt history, scoring, and persistence agree.

This approach adds the features inside the current application with a shared session and grading model. Adding them independently to each component would duplicate state and allow reports to disagree with completion. A server-backed classroom platform would support centralized results but is outside the selected scope.

Work in the shared IDE checkout and preserve existing uncommitted work. The design does not authorize deployment, publication, or changes to supplied regulatory documents.

## 1. Training session and modes

A session identifies the trainee profile, assignment, mode, scenario seed, selected deployment pieces, destination, per-piece exercise state, submitted stages, action history, and status (in progress or submitted). Each attempt has its own identifier and snapshots; retry starts a new attempt rather than overwriting an earlier report.

Guided practice is the default. It keeps current explanations, immediate checks, and worked CB calculation, with a contextual next-action strip and optional progressively more explicit hints. A hint request is recorded, so a report can distinguish independent performance from supported practice.

Assessment hides hints, expected classifications, answer-revealing discrepancy descriptions, colored correctness feedback, and the worked CB calculation until final submission. A trainee can reopen documents, inspect cargo, and edit answers before submitting a stage. Valid but incorrect readings and decisions are retained rather than silently rejected.

Structural input validation remains immediate: a number must be finite, units must be specified, and required fields cannot be empty. This feedback does not expose the expected value. A wrong finite value is an assessment response and must reach grading.

Separate procedural readiness from correctness. In assessment, a stage can be submitted when its applicable observations and responses are present; correctness is evaluated later. Subsequent stages unlock from submitted stages, while final assessment submission produces the actual competence result. The app must not display an incorrectly prepared asset as verified airworthy merely because the trainee submitted it.

Guided mode retains the current correctness-based completion gates. Assessment submission must also support an intentionally held/frustrated asset so correctly withholding an unacceptable piece is not scored as an unfinished task. A trainee states a disposition for each piece: ready for movement or hold for discrepancy. The evaluator compares that disposition with remaining discrepancies.

Assessment edits to a submitted upstream stage reopen that stage and clear downstream submissions/evidence, with a plain explanation. Final submitted attempts are read-only; new practice uses a retry attempt.

## 2. Reproducible scenarios and varied discrepancies

Add a seeded scenario builder. The same assignment seed and piece index reproduce the same asset, paperwork, and answer key. A generated attempt freezes its scenario snapshots. Reloading never rerolls defects or measurements; reset/retry creates a new attempt seed.

Keep existing dimension, weight, datum, TCN, date, destination, and paperwork-copy variations. Add valid alternatives for battery protection, fuel level, secured accessories, tie-down condition, container access, internal restraint, undeclared hazardous contents, pallet/net condition, and dunnage. Only applicable defects may be generated. Include fully satisfactory pieces and pieces with multiple discrepancies.

Scenario profiles:

- Beginner: one discrepancy per affected piece, limited variation, guided hints.
- Intermediate: zero to three discrepancies per piece with occasional paperwork mismatches.
- Advanced: mixed pieces, combined discrepancies, configuration-sensitive ATTLA cases, and documentation reconciliation.

Instructor assignments can select specific defects instead of random generation. Conflicting selections must be rejected with a useful explanation; an ISU-only defect cannot be attached to a vehicle.

Keep gross weight equal to axle-weight sums, axle stations ordered and within the physical length, and CB inside the supporting axle range. Fixed ISU and pallet footprints remain fixed. Changes must preserve an accessible tape-panel position for applicable markings. Avoid applying a universal front-axle-heaviest rule to every equipment type; preserve each supported model's load distribution constraints.

The seed randomizes fictional practice conditions. It does not rewrite supplied ATTLA letters or redefine actual equipment specifications.

## 3. Separate paperwork from physical cargo

Currently manifest/document values largely derive from the same scenario measurements. Introduce a distinct paperwork snapshot so the declared and observed values can intentionally differ.

Supported discrepancies include declared gross weight, dimensions, a document TCN inconsistent with the scheduled increment or asset label, missing listed contents, and undeclared contents. Preserve structural realism: an incorrect TCN is plausible but identifies another increment; a mismatched value is small enough to be believable.

Documents show declared values. Tape and scale tools show physical values. Notebook entry records the trainee's observation. The evaluator compares the evidence and the trainee's response rather than requiring the notebook to match erroneous paperwork.

Reconciliation flow: observe the difference → record the discrepancy and identify the affected document/field → frustrate/hold the piece → request corrected documentation from the simulated increment monitor → review the replacement → release after the discrepancy is resolved. Requests update document revisions and invalidate affected document verification, manifest, MSL, and JI evidence. Maintain the same physical asset and attempt history.

The trainee must not correct the paperwork merely by copying the evaluator's answer. In guided mode a hint may suggest remeasurement; assessment reports consequences after submission.

## 4. Manual CB in assessment

Guided mode keeps the current Calculate CB control. Assessment requires the trainee to enter the CB in inches aft of the common RDL, using their recorded axle distances and weights. The expected value remains hidden.

Record the first CB submission and subsequent edits. Grade datum selection, axle observations, gross/axle consistency, CB arithmetic and final rounding, and tape value/location separately. An incorrect recorded axle input should be distinguished from a calculation performed correctly on that incorrect input.

Provide the worked moment table and rounding explanation only in the after-action report. Use the existing Appendix P calculation function as the evaluator's arithmetic source. No change to the established final-rounding rule is proposed.

## 5. Inspection driven by visible state

Add clickable and keyboard-accessible inspection regions on the existing cargo drawings. Regions use component names rather than defect names: battery compartment, fuel gauge, cargo net, tie-down point, container door, and load contents. Do not reveal that a component is defective through its button title or pre-inspection description.

Battery and fuel close-ups remain physical interactions. Add visual representations for intact/torn nets, secured/loose equipment, locked/openable doors, serviceable/damaged tie-downs, and present/missing dunnage. ISU contents agree with the declared packing list and generated content state. Correcting a component visibly updates it; JI sees the prepared state rather than the original defect.

Keep the code-native geometry in cargoModels.js and the common orthographic/perspective renderer. Inspection regions, measured geometry, and correction overlays use that same coordinate system. Orthographic views remain the authoritative measurement views. No new 3D framework or bitmap generation is required.

A control must record an observation before its corresponding decision is accepted. Guided mode explains the observed condition. Assessment describes neutral evidence and asks the trainee to classify it, without displaying the expected answer.

Preserve actual interactions for both vehicle sides. In assessment, placing a marking on one side does not certify the other side automatically; mirrored placement can remain an explicit guided convenience.

## 6. Attempt history and after-action report

Store meaningful events with a sequence number, timestamp, piece, stage, action, entered value, and observed/document revision. Capture decision submissions, notebook records, CB submissions, manifest submissions, hint use, holds/frustrations, corrections, document revisions, JI verifications, and final dispositions. Do not log every mouse movement or keystroke.

Produce an after-action report after assessment submission, and an optional practice report for guided completion. Include:

- Trainee, assignment, mode, seed, attempt identifier, and elapsed active time.
- Results by piece and stage, first submissions, later corrections, and hints used.
- Missed discrepancies, false discrepancy reports, inaccurate measurements, datum/CB errors, manifest errors, and inappropriate final dispositions.
- The expected reasoning, the consequence of the mistake in this scenario, and the existing applicable reference link and edition where available.
- A targeted retry recommendation for the weakest category.

Use five scoring categories: paperwork 20%, measurements/CB 20%, inspection/correction 25%, manifesting 20%, and final JI/disposition 15%. Normalize for applicable tasks so equipment types are comparable. First-attempt correctness and final correctness are reported separately; they must not be conflated by overwriting answers. Guided scores are labeled supported practice rather than compared directly with assessment scores.

Default satisfactory assessment: 80% overall and no missed critical discrepancy in the final movement disposition. Instructors may adjust the numerical threshold; the critical-error rule remains visible in the assignment. Critical discrepancies include undeclared hazardous contents, unsafe terminal protection, unresolved restraint/net defects, scenario fuel-limit violations, and missing/inapplicable certification when required. Copy-count and transcription errors are tracked separately unless they affect an unsafe disposition.

Display time as context and omit speed bonuses. The result is a trainer assessment and not an official certification decision.

## 7. Local instructor dashboard

Add a distinct instructor view that manages local trainee profiles and assignments. A profile uses a display name or training identifier; no account sign-in is needed.

An assignment defines equipment types/piece count, difficulty, guided or assessment mode, destination, seed, random or selected defects, and numerical passing threshold. Validate selections before starting. Starting an assignment creates a fresh frozen session rather than altering an attempt already underway.

The dashboard lists assignment attempts and their results by category, with filters for trainee, mode, and completion status. Instructors can open individual reports and identify repeated errors. It cannot claim to collect results from other devices automatically.

Export assignments and detailed reports as versioned JSON; export category summaries as CSV and make the report printable. Import assignment/report JSON from another device through a visible file chooser. Validate the schema, identifiers, supported equipment, and numeric bounds; reject unknown versions or malformed files without modifying saved data. Use an import size limit of 1 MB and render imported text as text.

Deduplicate reports by attempt identifier. Keep imported reports read-only; importing a report does not restore it as an editable assessment. The source mode and assessment settings remain attached to the result.

## 8. Persistence and next-action guidance

Save the session, profiles, assignments, and archived attempts to versioned browser storage. Use one repository module for serialization/validation, a short debounce, and an immediate save at stage/final submission. Restore the existing attempt and frozen scenario data after refresh.

Storage errors must be visible and allow continuing the current session and exporting a backup. Corrupt or unsupported saved data must not crash the app; offer a new session while retaining a downloadable copy when possible. Starting over or deleting a profile/attempt requires a clear action and preserves unrelated history. Ordinary piece selection does not discard work.

Store at most 100 archived attempts, with an export-before-removal option when capacity is reached. Persist semantic exercise data, not DOM objects, open dialogs, transient hover state, or SVG matrices. On restore, dialogs are closed and the previously selected piece/stage reopens where it is still applicable.

Guided next-action guidance names the outstanding task and opens the relevant document, tool, or form. Example: "Incheck: record the rear axle weight, then apply RAW tape." Guidance derives from current applicable tasks and prerequisite evidence, including a held asset's required corrective action. It must update after a document revision, correction, manifest removal, or mode change.

Assessment guidance gives procedural completion counts and missing response categories, not the correct decision, missing defect, or expected value. Hints are unavailable during an assessment attempt. Changing mode requires a new attempt so a trainee cannot reveal answers and then resume the same assessment.

## Module boundaries and integration

- Training session controller: reducer/action dispatch, stage submission, invalidation, action history, and attempt lifecycle. App.js becomes the composition point rather than growing more independent callbacks.
- Scenario builder: seeded generation, supported defect profiles, independent paperwork, frozen snapshots, and model constraints.
- Evaluator: pure comparisons, first-attempt/final category results, final disposition checks, and reference mapping.
- Storage/import/export repository: versioning, validation, local persistence, and file artifacts.
- Training controls: profile/assignment selection, mode display, next action, stage submission, and resume/retry.
- Instructor dashboard and after-action report: views over stored assignments/results.
- Existing CargoWindow, paperwork, notebook, CB worksheet, and manifest components: receive mode/session actions; render evidence and collect responses without privately owning grading rules.

The existing geometry, transportability screening, paperwork applicability, CB arithmetic, and manifest functions remain the basis for the evaluator. Separate document revisions and observed geometry must be explicit inputs to those functions where they currently share a single value source.

## Validation and acceptance

Run current regression tests and the production build. Add meaningful tests for:

1. Reproducible scenario seeds, applicable defects, satisfactory shipments, geometry/weight consistency, and synchronized visual state.
2. Independent declared and measured values; correct hold/reconciliation behavior; revision-driven invalidation of manifest/MSL/JI.
3. Assessment accepting wrong finite responses, hiding answer-revealing feedback, procedural progression, and correct final grading.
4. Manual CB arithmetic versus bad observations, rounding, and both-side marking assessment.
5. Event history retaining first submissions after corrections, hint counts, category scoring, and unsafe final dispositions.
6. Persistence/restore, malformed imports, unsupported versions, storage failure, and attempt deduplication.
7. Local profile/assignment isolation, report exports, and read-only final attempts.
8. Keyboard inspection regions and guided next actions opening the intended tool/document without unintended state changes.

Exercise at least one full guided shipment and one assessment with a deliberate critical mistake. Also test a satisfactory shipment, paperwork mismatch, held asset, and resumed multi-piece deployment. Run browser visual checks if tooling becomes available; report that limitation explicitly if it remains unavailable.

## Review checkpoint

The feature direction has been authorized. This document makes the session behavior, scoring, local instructor scope, and assessment progression concrete for review. After written-spec approval, prepare the implementation plan and its required review before product-code changes.
