import {
  newSession,
  normalizeSession,
  exportSession,
  importSession,
} from "../../session";
import { newPracticeSession } from "../CargoWindow/practice";
test("new session has no manifest or completed CMOS tasks", () => {
  const s = newSession();
  expect(s.cdfCmos.manifest).toBe(null);
  expect(s.cdfCmos.checkedRevision).toBe(null);
});
test("round trip preserves drafts and IDs", () => {
  const s = newSession();
  s.cdfCmos.headerDraft = { mission: "DRAFT" };
  s.exercises[s.scenarioId].manifestDraft = {
    hazardRecords: [
      {
        id: "haz-1",
        piece: "1",
        templateId: "TRN-UN1950",
        certifier: "Test",
        page1: {},
        page2: {},
        lots: [],
      },
    ],
  };
  expect(importSession(exportSession(s)).cdfCmos.headerDraft).toEqual({
    mission: "DRAFT",
  });
  expect(
    importSession(exportSession(s)).exercises[s.scenarioId].manifestDraft
      .hazardRecords[0].id,
  ).toBe("haz-1");
});
test("legacy session retains progress without inventing edit check", () => {
  const s = newSession();
  delete s.cdfCmos;
  s.exercises[s.scenarioId].dsoeViewed = true;
  expect(normalizeSession(s).exercises[s.scenarioId].dsoeViewed).toBe(true);
  expect(normalizeSession(s).cdfCmos.checkedRevision).toBe(null);
});
test("import rejects dangling and duplicate references", () => {
  const s = newSession();
  s.cdfCmos.assignments = [{ id: "a", kind: "loose", pieceKeys: ["missing"] }];
  expect(importSession(exportSession(s))).toBe(null);
  s.cdfCmos.assignments = [
    { id: "a", kind: "loose", pieceKeys: [s.scenarioId] },
    { id: "b", kind: "loose", pieceKeys: [s.scenarioId] },
  ];
  expect(normalizeSession(s)).toBe(null);
});
test("Practice seeds only applicable predecessors", () => {
  const main = newSession(),
    before = JSON.stringify(main);
  const manifest = newPracticeSession({
    section: "manifest",
    random: () => 0.4,
  });
  expect(manifest.cdfCmos.manifest).toBe(null);
  expect(JSON.stringify(main)).toBe(before);
  const departure = newPracticeSession({
    section: "departure",
    random: () => 0.4,
  });
  expect(departure.cdfCmos.checkedRevision).toBe(departure.cdfCmos.revision);
  expect(departure.cdfCmos.manifestPrintRevision).toBe(
    departure.cdfCmos.revision,
  );
});

test("import rejects malformed nested hazardous drafts and release state", () => {
  for (const draft of [
    { piece: "1" },
    { page1: {}, page2: {}, lots: null },
    { page1: [], page2: {}, lots: [] },
  ]) {
    const s = newSession();
    s.exercises[s.scenarioId].hazardDrafts = { new: draft };
    expect(normalizeSession(s)).toBe(null);
  }
  const s = newSession();
  delete s.cdfCmos.releaseDetails;
  expect(normalizeSession(s)).toBe(null);
});
