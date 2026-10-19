import { releaseAirShipment } from "./releaseLogic";
import { newPracticeSession } from "../CargoWindow/practice";
import { toLocalInput } from "../Departure/departureLogic";
import { manifestBasis } from "./manifestLogic";
const setup = () => {
  const session = newPracticeSession({
    section: "departure",
    random: () => 0.4,
  });
  const now = new Date("2026-10-13T18:00:00");
  const departureAt = toLocalInput(new Date(now.getTime() - 10 * 60000));
  return {
    ...session,
    now,
    departureAt,
    finished: false,
    pieceKeys: Object.keys(session.shipments).slice(0, session.pieceCount),
  };
};
test("release requires the print tasks; running Edit Check is optional", () => {
  const c = setup(),
    details = { departureAt: c.departureAt, flightNumber: "TRN001" };
  expect(
    releaseAirShipment({ ...c.cdfCmos, checkedRevision: null }, details, c).ok,
  ).toBe(true);
  expect(
    releaseAirShipment({ ...c.cdfCmos, pullSheetRevision: null }, details, c)
      .ok,
  ).toBe(false);
  expect(releaseAirShipment(c.cdfCmos, details, c).ok).toBe(true);
});
test("release uses existing time window and all JI", () => {
  const c = setup(),
    details = { departureAt: c.departureAt, flightNumber: "TRN001" };
  expect(
    releaseAirShipment(
      c.cdfCmos,
      {
        ...details,
        departureAt: toLocalInput(new Date(c.now.getTime() + 60 * 60000)),
      },
      c,
    ).ok,
  ).toBe(false);
  c.exercises[c.pieceKeys[0]].jiMarks = {};
  expect(releaseAirShipment(c.cdfCmos, details, c).ok).toBe(false);
});
test("saved change blocks release while draft changes preserve it; finished tests lock", () => {
  const c = setup(),
    details = { departureAt: c.departureAt, flightNumber: "TRN001" };
  c.exercises[c.pieceKeys[0]].manifestDraft.weight = "999";
  expect(releaseAirShipment(c.cdfCmos, details, c).ok).toBe(true);
  c.exercises[c.pieceKeys[0]].shipmentRecord.weight = "999";
  expect(releaseAirShipment(c.cdfCmos, details, c).ok).toBe(false);
  expect(
    releaseAirShipment(c.cdfCmos, details, { ...c, finished: true }).ok,
  ).toBe(false);
});
test("release records the complete manifest basis", () => {
  const c = setup(),
    r = releaseAirShipment(
      c.cdfCmos,
      { departureAt: c.departureAt, flightNumber: "TRN001" },
      c,
    );
  expect(r.departure.basis).toBe(manifestBasis(r.state, c));
});
