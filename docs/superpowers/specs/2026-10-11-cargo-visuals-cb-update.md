# Approved cargo visuals and CB worksheet update

The user approved shaded perspective cargo inspection and manually typed center-of-balance readings. Side/front views retain physical-coordinate tape measurement; the perspective view is a projected SVG inspection illustration rather than a rotatable 3D model. It adds shaded faces, detailed tires, container doors/interior, crates, nets, and dunnage without introducing dependencies.

The supplied `Appendix P, Center Of Balance.pdf` is dated June 2016. Paragraphs C.1–2, page III-P-2 specify axle weight times distance from the common RDL, total moments divided by vehicle gross weight, and final rounding to the nearest whole inch with halves rounded up. B.1 requires secondary cargo included and recomputation after load changes. C.3 describes marking CB and gross weight on both sides.

The worksheet accepts per-axle distances in inches, per-axle weights in pounds, and gross weight in pounds. It validates required finite numbers, positive weights, nonnegative front-to-rear datum distances, and matching gross/axle totals. It displays individual moments, the total and division, rounded CB, and feedback comparing entries with the fictional shipment. Field edits clear stale results. Worksheet state belongs to its shipment and resets with that shipment. It is available for rolling stock only.

Verification: 32 tests cover Appendix P examples, half-inch decimal rounding, invalid/inconsistent inputs, existing measurement interactions, perspective measurement gating, worksheet entry/edit/reset behavior, and the existing guided flow. No live browser visual inspection was available.
