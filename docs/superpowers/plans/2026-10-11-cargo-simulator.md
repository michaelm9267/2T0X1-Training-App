# Cargo Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline implementation, or superpowers:subagent-driven-development if the user chooses delegation. Track the steps below.

**Goal:** Build a visual guided cargo-processing exercise with two-point measurement, weighing, and inspection.

**Architecture:** App owns separate exercise state for each cargo scenario. CargoWindow renders physical-coordinate SVG views; DocumentationPanel renders stage tasks, the notebook, and regulatory feedback. Pure geometry functions keep mouse measurements independent of display size.

**Tech Stack:** Existing React, CSS, SVG, Jest, and React Testing Library; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-11-cargo-simulator-design.md`

## Global Constraints

- Preserve the dark theme and existing four-stage navigation.
- Use the supplied Appendix O dated 3 February 2023; identify scenario values as fictional.
- Canonical dimensions are inches; weights are pounds.
- Appendix P is required before implementing or grading the center-of-balance calculation. Initially provide a measurement/weight worksheet with an explicit dependency notice.
- Store exercise progress in React state for the current session, independently per shipment.
- No official DD Form 2133 signature workflow, persistence, assessment scoring, or 3D rendering.

## Review Focus

- Resized SVG: distances and snap radius remain physically correct.
- Tool/view/cargo changes: incomplete endpoints cannot leak between interactions.
- Duplicate endpoints: no zero-length notebook entry.
- Closed ISU: internal inspection controls disappear while recorded findings remain.
- Stage navigation: visiting a stage cannot satisfy completion prerequisites.

### Task 1: Scenario data and measurement geometry

**Files:** Create `src/Components/CargoWindow/scenarios.js`, `measurement.js`, and `measurement.test.js`.

**Interfaces:** Export `scenarios`, each with `id`, `title`, dimensions, gross weight, views, snap targets, optional axles, contents, inspection findings, and stage tasks. Points use `{x, y}` in inches. Export `measure(a, b)` returning an unrounded distance, and `snapPoint(point, targets, tolerance)` returning the nearest target within the physical tolerance or the original point. Each source reference has paragraph and printed page.

- [x] Write geometry tests: `measure({x:0,y:0},{x:3,y:4})` equals `5`; identical endpoints equal `0`; nearest eligible target wins; outside-radius points stay unchanged. Verify equivalent physical points across two viewport scales give identical measurements.
- [x] Run `CI=true npm test -- --watchAll=false --runInBand measurement` and confirm the tests fail before implementation.
- [x] Implement the geometry helpers and three fictional scenarios. Rolling stock has two axle positions and weights summing to gross weight. ISU findings include unsecured contents and undeclared hazardous material. Pallet findings cover nets, serviceability, arrangement, and dunnage. Derive instructional explanations from Appendix O E, J, and K with paragraph/page citations.
- [x] Run the geometry tests and confirm they pass. Review numeric fixture consistency and reference accuracy.

### Task 2: Interactive cargo scene

**Files:** Modify `src/Components/CargoWindow/CargoWindow.js` and `cargo-window.css`; create `CargoWindow.test.js`.

**Interfaces:** `CargoWindow({scenario, onRecordMeasurement, onRecordWeight, onInspect})`; measurement records contain view, endpoints, and inches; weight records contain gross or axle identifier and pounds; inspection callbacks carry finding identifiers. Tool/view/door state stays local; remount by scenario ID on cargo change.

- [x] Write failing component tests for selecting two targets and recording a distance, rejecting identical endpoints, clearing unfinished measurements, changing views/tools mid-measurement, recording gross/axle weights, and opening/closing ISU contents.
- [x] Run `CI=true npm test -- --watchAll=false --runInBand CargoWindow` and confirm expected failures.
- [x] Render side/front SVG views and controls for tape, scale, inspection, and view selection. Convert pointer positions through the SVG screen transform. Convert a fixed 12-screen-pixel snap radius into view units. Preview eligible targets on hover and draw measurement endpoints, line, and reading. Save only positive measurements and allow cancelling pending endpoints.
- [x] Provide labeled focusable targets as keyboard equivalents. Announce new readings politely. Make gross scale and axle controls record scenario weights. Render door controls and selectable internal contents only while the ISU is open; emit findings through `onInspect`.
- [x] Run component tests and verify passing behavior. Check nonuniform rendering uses the actual screen transform rather than assuming CSS pixel dimensions.

### Task 3: Exercise state, stage tasks, and notebook

**Files:** Modify `src/App.js`, `src/Components/Documentation/DocumentationPanel.js`, `src/Components/ProcessPanel/ProcessPanel.js`, and `src/App.test.js`; create `src/Components/CargoWindow/exercise.js` and `exercise.test.js`.

**Interfaces:** Export `createExercise()` producing measurements, weights, findings, and task-answer state; export `isStageComplete(scenario, stageId, exercise)` deriving completion from task prerequisites. App stores `{[scenarioId]: exercise}` and passes the active exercise to DocumentationPanel. ProcessPanel accepts completion IDs without changing existing button accessible names.

- [x] Write failing tests: measurements/weights/finding decisions satisfy only their matching tasks; navigating alone does not complete a stage; switching cargo preserves its independent notebook; returning to a shipment restores its progress; reset clears only the active exercise.
- [x] Run `CI=true npm test -- --watchAll=false --runInBand` and verify expected failures without weakening existing navigation tests.
- [x] Integrate cargo selection and CargoWindow. Record measurements and weights immutably. Show collected data with units and measurement view/endpoints. Provide inspection decisions and satisfactory, unsatisfactory, corrected, and not-applicable practice outcomes with source-linked feedback; record corrections only after a valid decision.
- [x] Implement guided tasks: preparation/document review, dimensions and weighing, discrepancy review/correction, and JI inspection recording. Require recorded evidence and correct decisions to complete the relevant stage. Keep all stages available for review and show a completion summary when all prerequisites are satisfied.
- [x] Show the rolling-stock worksheet with datum-to-axle measurements and axle weights, an explicit Appendix P requirement, and no graded CB formula. Provide a reset control and polite result announcements.
- [x] Run all tests and confirm the entire suite passes.

### Task 4: Responsive styling and final verification

**Files:** Modify `src/App.css`, `src/Components/CargoWindow/cargo-window.css`, and `src/Components/ProcessPanel/process-panel.css`.

- [x] Style scene, tool controls, notebook, feedback, and task checklist using existing navy/teal theme variables. Keep tap targets and focus outlines visible; stack scene/task panels on narrow displays and preserve SVG physical readings during resize.
- [x] Run `CI=true npm test -- --watchAll=false --runInBand`, `npm run build`, and `git diff --check`; require all to succeed.
- [x] If browser tooling is available, inspect desktop and narrow-screen layouts and test real mouse snapping. Otherwise explicitly report that visual/pointer behavior has automated coverage but was not browser-inspected.
- [x] Review the final diff against every spec requirement, address findings, and summarize the completed behavior and Appendix P limitation. Preserve unrelated user changes; do not commit them as part of this feature.
