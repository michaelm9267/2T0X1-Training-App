# WAPS E-5 improvements implementation plan

> **For agentic workers:** Use superpowers:executing-plans for application work; use independent parallel bank audits for the seven publications.

**Goal:** Improve the reliability of E-5 practice scores and make study progress portable.
**Architecture:** Extend the current React WAPS workspace, preserving question identifiers and existing browser progress. Reuse the account sync bridge; store WAPS data separately from course sessions. Cache only public application assets for offline guest study.
**Tech Stack:** React, Jest/Testing Library, Firebase/Firestore, browser service worker.
**Spec:** User's six-part request, excluding E-6 per explicit follow-up.

## Global constraints
- No E-6 content changes.
- No invented official exam weights, timing, or readiness claims.
- Preserve existing uncommitted changes and stable question identifiers.
- Reports must be retrievable/exportable; guest data stays local.
- Passage availability checks do not prove semantic correctness.

## Review focus
- Account switching must never expose another user's WAPS progress/reports.
- Exam weights with unavailable capacity must fail visibly instead of silently changing the blueprint.
- Old test histories must remain readable without new answer-detail fields.
- Offline reload must work under the repository's GitHub Pages subpath.
- Numeric recall must reject wrong units/values without exposing answers early.

### Task 1: Source audit and bias regression
- [x] Independently audit questions and all four choices against exact passages, record individual review decisions, make meaningful editorial corrections.
- [x] Add bank quality metrics/tests for longest-answer bias, distinct choices and source coverage.
- [x] Preserve open semantic issues explicitly instead of claiming universal verification.

### Task 2: Exam configuration and adaptive study
Files: studyLogic.js, StudyModes.js, WapsStudyTool.js, studyLogic.test.js, studyEnhancements.test.js.
Interfaces: buildExam(bank,{length,weights,random}); weakSpotQueue(bank,progress,{length}); readiness(progress,{now}); numericAnswer(item), matchesNumeric(input,item).
- [x] Write failing tests for weighted quotas/capacity/invalid inputs, weak sections, recent full-exam readiness, numeric normalization.
- [x] Implement deterministic quota allocation, evidence-based weak drills and readiness summary.
- [x] Add saved editable practice blueprint, numeric recall and source-backed multi-rule scenario sessions; store per-question exam/practice outcomes.
- [x] Run logic/UI tests.

### Task 3: Reporting and account persistence
Files: questionReports.js, QuestionReport.js, wapsStorage.js; Auth/cloudSync.js; firestore.rules.
Interfaces: saveWaps/readWaps use waps-progress-e5 storage; publishSave('waps',snapshot) uses existing sync bridge.
- [x] Write failing tests for report persistence/export, WAPS hydration, isolation, and queued offline writes.
- [x] Add report forms to flashcards/practice/exam review, local review/export/resolve tools.
- [x] Add WAPS snapshot hydration and account sync; hide transient question content from cloud snapshots where possible, validate restore format.
- [x] Extend Firestore course allowlist to waps; document deployment requirement.

### Task 4: Offline support and verification
Files: scripts/build_offline.js, public/service-worker.js, src/offline.js, src/index.js, WAPS offline controls.
- [x] Test generated precache scope and asset manifest coverage.
- [x] Generate versioned complete public asset cache after build; register at PUBLIC_URL subpath; guest entry available offline, account writes retry on reconnect.
- [x] Run full Jest suite and production build; request independent final review; fix material findings and report any remaining limitations.

## Execution ledger
- Existing feature branch codex/regulation-references contains substantial uncommitted WAPS work. Work in place to preserve that base; no stashing, reset, or unrelated commits.
- User approved remaining scope after excluding E-6. Implement within authorization without additional planning approvals.

- Task 1 complete: all 1,520 records reviewed; audit command checks 1,520 verified choices with no unresolved evidence and all seven character longest-strategy rates within 22–28%.
- Tasks 2–3 implemented and targeted tests passing; fixed independent review findings for malformed restores, overflow, legacy exam isolation, and stale metadata writes.
- Task 4: production build and Chrome offline/mobile checks completed; full-suite final rerun and build verification are recorded in the accompanying quality/persistence document.
- Ruling: official SKT weights/timing are not available, so editable equal-share practice settings are explicitly labeled, rather than inventing an official blueprint.
- Ruling: report review is a persisted owner queue with JSON export for instructors, not external messages or a shared moderation service.
- Ruling: word-count length diagnostics remain visible alongside the character-based regression threshold; editorial source fidelity takes precedence over cosmetic padding.
- Ruling: large WAPS snapshots use atomically batched Firestore payload chunks; updated security rules require deployment before release.

- Final evidence: full suite 92 suites / 660 tests; final targeted boundary checks 12 suites / 91 tests; production build and audit command passed. Chrome checks cover immediate offline use, offline reload, lazy source text, mobile overflow, custom exam resume/score, report export and weak drills. Source changes remain local on the existing branch; Firebase rules and site release are not deployed.
