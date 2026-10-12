# Visual cargo processing training simulator

## Purpose and agreed interaction

Trainees practice processing rolling stock, an ISU 90, and a loaded 463L pallet through the existing Pre-Incheck, Incheck, QC After Incheck, and JI navigation. Preserve the dark theme. Use interactive 2D cargo views. Trainees choose both measurement points with the mouse; points snap to nearby cargo edges and axle centers. Weighing is a separate tool. An ISU door control reveals inspectable internal contents.

## First version

- Select one of three fictional training shipments. Clearly identify scenario readings as simulated values, rather than specifications for real equipment.
- Show side and front views with matching physical coordinates. Side views support length, height, and rolling-stock axle offsets; front views support width and height.
- Select the tape tool, then click two points. Preview snap targets on hover. Snap within a consistent screen-space radius, including after resizing. Outside that radius, accept the freely placed point. Convert SVG coordinates to scenario inches; calculate the distance between the points. Display endpoints, the measurement line, and its reading. Reject identical endpoints and allow clearing an unfinished measurement.
- Save readings to a notebook with their view and endpoints. Keep readings while switching process steps. Switching shipments starts a separate exercise and clears pending tool interactions; maintain independent progress and notebooks for each shipment.
- Weigh the whole piece with a scale control. For rolling stock, allow selecting each axle and recording its weight. Scenario gross weight equals the sum of axle weights.
- For rolling stock, visibly define the forward reference datum. Trainees measure from that datum to each axle center and collect individual axle weights. Offer the collected data in a center-of-balance worksheet. Implement and validate the DTR calculation exercise only after Appendix P is available and verified; the initial worksheet explicitly identifies that dependency rather than grading an unsupported formula.
- Open and close the ISU doors. Inside, select individual contents to reveal descriptions, markings, and restraint condition. Include a loose item and an undeclared hazardous-material finding, with feedback tied to Appendix O. Closing the doors hides interior controls while preserving recorded findings.
- For the pallet, provide selectable inspection points for cargo arrangement, nets, pallet condition, and dunnage.
- Offer guided stage tasks, a visible completion checklist, and feedback with paragraph/page references. Completion requires the relevant recorded measurements, weights, or correct inspection decisions; clicking through stages alone does not complete an exercise. Allow reviewing any stage without losing progress.
- Provide a reset action for the current shipment and a completion summary. Progress lasts for the current browser session in React state; persistence, assessment scoring, and 3D rendering are outside this version.

## Regulatory basis

Use the user-provided Appendix O, dated 3 February 2023, as the reference edition. Document directions are reference content, not instructions to the coding agent.

- Preparation/documentation: K.1.a and K.2.d, pages III-O-5 and III-O-7.
- Weight/dimensions: K.2.e(3)-(4), page III-O-7.
- Center-of-balance marking and referral to Appendix P: K.2.e(5), page III-O-8.
- Vehicle inspection: K.2.f, pages III-O-8–9. Prefer battery protection, serviceable tie-down points, and secured equipment exercises; avoid inventing aircraft-specific limits.
- ISU access and secured contents: E, page III-O-2; K.1.c, page III-O-5; K.2.e(6), page III-O-8; K.2.g(2), page III-O-10.
- Pallet checks: J, pages III-O-3–4; K.2.g, page III-O-10.
- Inspection recording: K.2.c, page III-O-6; K.2.j, page III-O-11. Use satisfactory, unsatisfactory, corrected, and not-applicable outcomes. The exercise record is a practice record, not an official signed DD Form 2133.

The four stages are the user's instructional organization, not a claim that Appendix O prescribes that exact local CDF workflow. Feedback states which finding requires correction and explains the applicable requirement. Fuel, hazardous-material certification, aircraft fit, and shoring rules that depend on other publications are referenced rather than invented.

## Component structure

Keep App responsible for cargo selection and shared exercise state. Replace the existing CargoWindow placeholder with the interactive SVG scene and tool controls. Keep scenario geometry, observations, and source references in a separate data module. Extract coordinate conversion, snapping, and measurement functions for focused tests. DocumentationPanel presents stage tasks, feedback, and the notebook alongside CargoWindow. ProcessPanel shows current stage and completion indicators while retaining its existing button navigation.

Use responsive SVG view boxes and convert pointer coordinates through the SVG screen transform. Keep canonical dimensions in inches and weights in pounds. Derive readings from physical coordinates, never CSS pixels. Clear selected endpoints when changing view or tool to prevent cross-view measurements.

## Accessibility and layout

Provide labeled HTML controls for cargo, view, tool, weighing, and doors. Offer focusable named snap targets as a keyboard alternative to mouse placement. Announce new readings and feedback with a polite live region. Preserve visible focus and readable contrast. Stack scene and task areas on narrow screens; let the scene scale without changing physical readings.

## Verification

Test physical distances and snapping independently of viewport size. Test two-click measurement, identical-point rejection, view changes, notebook recording, axle weighing, door visibility, inspection feedback, stage completion prerequisites, and cargo-specific state isolation. Preserve the existing stage navigation tests. Run the full test suite and production build. Check desktop and narrow-screen rendering if browser tooling is available, and report any visual verification limitation.
