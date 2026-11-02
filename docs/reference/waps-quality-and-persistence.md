# E-5 WAPS study improvements

Implemented scope: the seven existing E-5 publications. E-6 content is unchanged.

## Question quality

All 1,520 question/answer/distractor sets have an editorial decision and passage evidence in `waps-audit-*.json` beside this file. Review checks fidelity to the supplied editions; it does not establish that those editions are the current SKT study references. Ambiguous alternatives, missing exceptions, unsupported stem claims, and incomplete passage excerpts were corrected. Saved question IDs are preserved, including when a displayed stem needed correction.

Run `npm run audit:waps` to report review coverage and check unchanged reviewed choices, citation availability, distinct options, and character-length bias. Questions added after the original E-5 review are counted as `pendingReview`; they do not receive a false verified status. CI still fails if a reviewed question changes or any question lacks its structural or passage checks. A changed answer needs a new source review and updated audit record; automated checks cannot prove semantic correctness.

| Publication | Questions | Longest-choice success before | After |
| --- | ---: | ---: | ---: |
| DAFI 10-403 | 133 | 38.66% | 27.38% |
| DAFI 24-602V1 | 192 | 61.81% | 27.17% |
| DAFI 24-602V2 | 261 | 48.47% | 27.33% |
| DAFI 24-602V4 | 200 | 62.33% | 27.08% |
| DTR Part II | 291 | 62.80% | 27.75% |
| DTR Part III | 163 | 57.06% | 27.40% |
| DTR Part IV | 280 | 52.32% | 26.28% |

The strategy chooses the most characters and breaks ties randomly, so four equally long choices contribute 25%, not 100%. Strictly longest rates are 18.9–24.5%. Word-count strategy diagnostics are also printed; they range from 21.3–31.6%, so this does not claim elimination of every possible wording clue. No runtime answer padding is used.

Question-specific source overrides live in `scripts/waps_passage_overrides.json`. The passage builder checks `ref|question` before the general reference key, preserving recovered context and exceptions when rebuilding.

## Study and exam behavior

- Full exam setup saves relative publication weights, count, and time. Equal publication shares are the starting point; 100 questions/120 minutes remain explicitly labeled practice defaults. Counts and time support custom values. Missing capacity and invalid weights produce a visible error instead of silently changing quotas. No official blueprint is inferred.
- Weak spots ranks original publication/chapter groups by recorded right/wrong history and puts missed cards before unattempted and successful cards. Flashcard, practice and exam answers share that history.
- Practice readiness is an average of up to five comparable completed exams within 30 days, displayed after three such exams. Length, time and publication weights must match. It is not an SKT score prediction. Old histories without blueprint metadata remain readable but do not qualify.
- Number recall uses questions with unambiguous numeric answers. Commas and equivalent units are normalized; wrong values/units are rejected.
- Eight scenario cases combine Code 2 season, weight and distance screening rules, including boundary values. Feedback exposes both source passages and explicitly preserves other eligibility rules and exclusions.
- Reports retain question ID, citation, choices, reason and review status. The latest 100 reports appear in Question reports, can be resolved/reopened and exported as JSON for instructor review. This is an owner-visible queue/export, not a shared moderation inbox or automatic email.

## Account persistence and deployment

Guests keep progress in `waps-progress-e5`. Approved signed-in users additionally sync that snapshot through the existing account bridge as course `waps`, including reports, exam settings and an active exam. First sign-in merges guest cards/reports with account data. Ownership changes clear previous account progress and the legacy exam fallback. Legacy valid saved exams migrate into the snapshot. Invalid saved records are filtered on restoration.

Snapshots are written at most once per minute per changed snapshot and on page hide/sign-out. Failed writes retry and show an account warning. Unsent local timestamps prevent an older cloud copy replacing newer local work. This uses snapshot synchronization, not collaborative real-time merging: on the same account, the newer whole snapshot wins. A failed final save requires explicit confirmation before sign-out erases unsent local work.

Large WAPS snapshots are split into 200,000 UTF-16-unit chunks without breaking surrogate pairs. Firestore batches commit the header and chunks atomically; generation checks retry reads spanning a concurrent commit. Each chunk stays below the 1 MiB document limit. Old fixed chunk slots are cleaned when a snapshot shrinks.

**Deploy the updated `firestore.rules` to the existing Firebase project before releasing the app build.** The rules now allow owned `sessions/waps` documents and their `payloads` subcollection, with the existing trainee/instructor/demo restrictions. Code/tests do not deploy those rules or write to the live database. Live cross-device verification therefore requires the rules deployment and approved test accounts.

## Offline study

`npm run build` now generates `build/service-worker.js` from the complete CRA asset manifest, including lazy passage chunks. Open the published HTTPS app online and wait for “Ready for offline study.” Afterwards guest WAPS, citations, numeric/scenario drills and local progress work offline. Firebase sign-in and cloud writes still require connectivity. External full-publication PDFs are not included in the study cache.

Only listed public build assets are intercepted, scoped to the GitHub Pages repository path. Account/API responses are not cached by the worker. New workers wait for old tabs to close so cached HTML, bundles and lazy chunks remain consistent.

Validation includes Jest logic/UI/sync tests, the production build and an actual Chrome mobile browser check of offline reload, lazy passage text, and numeric grading under `/2T0X1-Training-App/`.

Final validation: the full Jest run passed 92 suites / 660 tests. After the last offline-control and sync-queue fixes, the targeted auth/WAPS/offline run passed 12 suites / 91 tests. The production build, all 1,520 audit checks, and Chrome offline/resume/export checks passed. Existing React act warnings remain in portions of the broader test suite; the production build succeeds.
