# Approved manual notebook and tape labeling update

Trainees view tape/scale readings, then manually type and record them in the measurement notebook. Observing a reading captures exercise evidence but never fills a notebook input. Entries must match the displayed reading and appropriate observed measurement endpoints. Accepted entries use D1, W1 (FAW), D2, W2 (RAW), and GWT alongside overall length, width, and height. CB consumes recorded notebook entries rather than duplicate input fields.

Rolling stock includes a Labeling tape tool in Side view. Trainees select the vehicle side and label type, write the value, and click a physical position on the body. Keyboard placement accepts datum distance and height above ground. FAW/RAW tape must be above the corresponding axle and show its recorded weight. CB tape must be at the calculated datum offset, with GWT on the horizontal strip and CB/distance on the vertical strip. Both the written value and complete tape footprint are validated. Both vehicle sides have independent markings. Labels can be removed or replaced.

Editing an axle-weight entry invalidates that weight label on both sides, its saved notebook value, and dependent CB/result markings. Editing any CB input invalidates CB/result markings. Shipment switching preserves independent notebook and tape state; reset clears only the active exercise. Incheck completion requires manual entries and all three markings on both sides for rolling stock.

Reference: supplied Appendix P, June 2016, C.3 and A, pages III-P-2 and III-P-1. No real equipment marking or official inspection certification is performed.

Verification: 39 tests pass, production build compiles, and whitespace checks pass. Tests cover manual entry/evidence prerequisites, notation, recorded-input calculation, stale state invalidation, mouse coordinate conversion, tape content/position/footprint checks, both-side placement/removal, and shipment isolation. Reviewer findings about mismatched entry tolerances and labels extending outside the body were reproduced and fixed. Browser appearance was not visually inspected.
