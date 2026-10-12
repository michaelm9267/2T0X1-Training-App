# Trainee improvement handoff — resumed 11 October 2026

User authorized all suggestions in the supplied conversation and asked to resume at its stopping point. Existing stages 1–6 cover discrepancies, scoring/AAR, browser saves, guided/test mode, reproducible instructor codes, and HAZDEC review. Stage 7 stopped with four load-plan test failures.

Ruling: Resume the implementation from the supplied handoff in this shared checkout rather than restart the older design plan — this is the user's latest instruction; cost if wrong: reconcile additional changes with the prior design.
Ruling: Use LoadPlan.js for UI and loadPlanLogic.js for calculations — the original names collide on the case-insensitive filesystem; cost if wrong: update imports.

Confirmed root cause: writing LoadPlan.js overwrote loadPlan.js; the UI recursively imported itself and exported none of the tested calculation functions. Restored the calculation source from the handoff under its distinct name. Targeted suite: 4/4 passing.

Remaining: load-plan integration, safe persistence/file transfer, simulated DSOE clock and actual timestamps, randomized short drills, searchable glossary/walkthrough, accessibility checks, and final verification/review. Human regulatory content review remains an instructor task; no automated claim of certification.

Stage 7 complete: load planning is integrated as step 5 and persists with the session. Invalid coordinates, an empty deployment, overlap, floor, weight, CB, and JI readiness are checked.
Stage 8 complete: simulation clock, DSOE elapsed-time display, randomized CB/TCN/DoDAAC/inspection drills, first-run guide, searchable glossary, and keyboard tape entry are available.
Stage 9 complete: validated local JSON export/import supports instructor handoff without an online service.
Verification: full test suite 116/116 passed; production build passed after removing the remaining lint warning.

Final review fixes: imports now reject incomplete nested exercises, invalid destinations, and malformed load plans; accepted load plans invalidate when cargo/readiness changes; DSOE milestones record immutable simulation times including cargo load; new modal tools trap focus, close on Escape, and restore prior focus. Inspection drills now rotate scenarios.
