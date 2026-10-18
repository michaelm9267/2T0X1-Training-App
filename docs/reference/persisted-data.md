# Transit IQ (2T0X1 Training App): data the app saves

Use this to design a **Cloud Firestore schema** for storing each trainee's saved work under their
Firebase Authentication account. Please propose collections, document IDs, which data belongs in
which document, Firestore security rules, and how to stay under Firestore limits described below.

## The app

- A React single-page web app (no server of its own), hosted on GitHub Pages. It trains U.S. Air
  Force Air Transportation (2T0X1) airmen on cargo processing, using fictional training data only.
- Today every trainee's work is saved as **one JSON object per course in the browser's
  localStorage**, rewritten in full on every change. Nothing is sent to a server yet.
- Sign-in is being added with **Firebase Authentication** (Email/Password and Google). Accounts are
  created by the instructor only; there is no public sign-up.
- Access must be limited to an **instructor-maintained allow-list of email addresses**. A signed-in
  user who is not on the list must not be able to read or write anything.
- Goal: a trainee signs in on any computer and continues where they left off. The browser copy
  will remain as an offline backup.
- Must fit the **free Spark plan**: 50,000 document reads/day, 20,000 writes/day, 1 GiB stored.
  Expected scale: one class of roughly 10–40 trainees.

## Two saved objects (one per course)

| localStorage key | Course | Typical size |
|---|---|---|
| `cdf-trainer-session` | CDF (Cargo Deployment Function): Precheck → Incheck → Joint Inspection → Manifest (CMOS) → Load Plan → Departure | ~53 KB when new; grows as the trainee works (estimate 100–300 KB) |
| `outbound-trainer-session` | Outbound (customer shipments): Receive → Pack → Mark → CMOS Shipment Planning → Small Package Express → print documents | ~4 KB when new; grows to tens of KB |

Each object is a complete snapshot. A trainee has **at most one active session per course**;
starting a "New Session" replaces it. Sessions can also be exported/imported as a JSON file
(`{ kind: "cdf-training-session", exportedAt, session }`).

Important for the schema:

- Firestore's **1 MiB per-document limit**. The CDF object can grow large, so consider splitting it.
- **Write frequency.** The app currently saves on almost every keystroke, and the CDF session also
  saves once a second while its exercise clock runs (`clock.elapsed`). Cloud saves will be
  debounced (a few seconds) and the clock should not drive writes; please suggest a write pattern
  that keeps a class well under 20,000 writes/day.
- **Mode.** Every session has `mode`: `"guided"` (hints shown), `"practice"` (one section at a
  time), or `"test"` (graded; locked when finished). Test results matter to instructors.
- **Validation.** The app already validates the shape when loading (`version` must match) and
  discards anything invalid, so the schema can store these objects largely as-is.

## 1. CDF session (`cdf-trainer-session`)

```text
{
  version: 1,
  mode: "guided" | "practice" | "test",
  code: string | null,              // scenario code; the same code reproduces the same deployment
  startedAt: number,                // epoch ms
  stepId: string,                   // current process step, e.g. "precheck"
  destination: string,              // fictional destination DODAAC, e.g. "FB5209"
  pieceCount: number,               // pieces in play (1–12)
  scenarioId: string,               // key of the selected piece
  shipments: { [pieceKey]: Shipment },      // 12 generated cargo pieces (scenario content)
  exercises: { [pieceKey]: Exercise },      // the trainee's work on each piece
  cdfCmos: CdfCmosState,            // manifest work + the shared CMOS database (below)
  loadPlan: { placements: { [pieceKey]: object }, accepted: boolean, feedback: string, mistakes: [] },
  departure: { at, releasedAt, basis, feedback: string, mistakes: [] },
  clock: { elapsed: number /* seconds */, running: boolean, events: { [name]: number } },
  practice: object | null,          // practice-mode section settings
  test: { trainee: { rank, first, last }, finishedAt: number | null }
}
```

`Shipment` is **generated scenario content** (not trainee input). It is mostly reproducible from
`code`, but a random session without a code must be stored. Example fields:

```text
{ key, id, title, subtitle, length, width, height, weight,
  vehicleChecks: { positiveTaped, negativeTaped, fuelFraction, fuelLimit },
  axles: [{ id, title, position, weight, wheels, contactAreaPerWheel }],
  findings: [{ id, title, observation, correct, explanation, source: { paragraph, page, edition }, stage }],
  hasEngine, paperworkRequirements: { packing, hazdec, attla }, loadConfiguration,
  attla: { configurationId, certificationRequired, reviewDisposition, letter: {...} },
  documentDay, tcn, docErrors: {...}, paperworkCopies: {} }
```

`Exercise` is the **trainee's progress on one piece** (booleans, arrays of ids, small objects):

```text
{ documentsViewed: [], documentsVerified: {}, documentCopies: {}, documentFeedback: {},
  manifestDraft: {}, manifestAccepted: boolean, manifestFeedback: string, manifestRecord, shipmentRecord,
  jiDocumentsViewed: [], jiMeasurements: [], jiWeights: {}, jiSides: [], jiInspected: [], jiTerminals: {}, jiVerified: [],
  measurements: [], weights: {}, inspected: [], answers: {}, cbResult,
  notebookDraft: {}, notebookEntries: {}, notebookFeedback: {},
  tapeLabels: [], labelFeedback: string, vehicleState: {}, terminalViewed: {}, fuelViewed: boolean,
  frustrations: [], frustrationFeedback: string, mslApplied: boolean, dsoeViewed: boolean,
  attlaReviewed, attlaLetterVerified, attlaFeedback, cmosRequired: boolean, hazardDrafts?: {} }
```

`CdfCmosState`:

```text
{ headerDraft: {}, manifest: { number, ... } | null, assignments: [{ id, kind: "loose" | "pallet", pieceKeys: [] }],
  revision: number, checkedRevision, pullSheetRevision, manifestPrintRevision: number | null,
  basis, releaseDetails: {}, mistakes: [], feedback: string,
  sharedCmos: CmosStore }          // the simulated CMOS database, see section 3
```

## 2. Outbound session (`outbound-trainer-session`)

```text
{
  version: 5,
  origin: "jber" | ...,            // training base
  mode: "guided" | "practice" | "test",
  stepId: string, selected: string,  // current step and customer
  shipments: [ {                     // generated customer shipments (scenario content)
    key, serial, origin, itemId, document /* "1348-1A" | "1149" */, quantity, condition,
    dodaac, delivery, pd, nsn, serialNumber, documentNumber, tcn, rdd, tac, projectCode,
    targetMode, discrepancy, advance: boolean, container, packed: { length, width, height, weight } } ],
  exercises: { [customerKey]: {
    documentViewed, tagInspected, counted, returned, custodyAccepted, packed, weighed: boolean,
    answers: {}, container, markings: [], packFeedback: string, measured: {}, forms: {},
    cmos: { record, message }, spe, milMode, mode, printed: {}, labels: {},
    mistakes: [], firstActionAt: number | null } },
  practice: object | null,
  trainee: { rank, first, last },
  testFinishedAt: number | null,
  sharedCmos: CmosStore              // the simulated CMOS database, see section 3
}
```

## 3. CmosStore (simulated CMOS database, inside both sessions)

This is the trainee's own copy of a simulated cargo system. It is stored inside each session
(`cdfCmos.sharedCmos` for CDF and `sharedCmos` for Outbound) and can grow with the trainee's
entries.

```text
{
  version: 1,
  shipments, pieces, hazards, routings, airManifests, truckManifests,
  bills, express, quotes, documents: { [recordId]: CmosRecord },   // ten record collections
  counters: { [kind]: number },      // next id number per collection
  selection: { [kind]: recordId },   // last selected record per collection
  history: [ { kind, id, action, revision, status, errors?: [], date: ISO string, user } ]  // append-only log
}

CmosRecord = {
  id: string,                        // e.g. "shipments-3"
  draft: { ...fields },              // what is on screen (flat string/boolean fields, plus a few arrays such as t9Entries)
  saved: { ...fields } | null,       // last saved copy
  revision: number,
  check: { revision, passed: boolean, errors: [string] } | null,
  status: string,                    // e.g. "Draft", "Saved", "Passed Edits"
  statusCode?, inchecked?, result?
}
```

A shipment `draft` holds about 60 short fields (TCN, MIL Mode, consignee, POE/POD, NSN, CIIC,
indicator flags, commodity code, air dimension code, and so on). `history` grows with every
save and check, so it is the most likely part to grow without limit.

## What instructors may want (for the schema to allow later)

- To see each trainee's current step and their test results: `mode`, `test.finishedAt` or
  `testFinishedAt`, trainee rank/name, and the `mistakes` arrays.
- A per-user document for profile and role (`trainee` / `instructor`), plus the allow-list.
- Trainees must only ever read and write their own data. Instructors may read all trainees' data.
