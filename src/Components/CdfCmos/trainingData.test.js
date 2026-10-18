import {
  missionForSession,
  hazardRequirements,
  trainingTemplates,
  ammunitionFixture,
  cargoKind,
} from "./trainingData";
import { scenarios } from "../CargoWindow/scenarios";
test("mission and pallet ids are stable", () => {
  const session = { destination: "FB5612" };
  expect(missionForSession(session)).toEqual(missionForSession(session));
  expect(missionForSession(session).mission).toMatch(/^[A-Z0-9]{9,12}$/);
  expect(cargoKind(scenarios.find((s) => s.id === "463l-pallet")).kind).toBe(
    "pallet",
  );
});
test("template id is distinct from UN id", () => {
  expect(
    trainingTemplates.find((t) => t.unId === "UN1950").templateId,
  ).not.toBe("UN1950");
});
test("ammunition paperwork contains certifier and lot answers", () => {
  const requirements = hazardRequirements(ammunitionFixture());
  expect(requirements.records[0].certifier).toBeTruthy();
  expect(requirements.records[0].lots[0]).toMatchObject({
    lotNumber: "TRN-001",
    dodic: "A059",
    roundCount: "100",
  });
});

test.each(['age-generator', 'rolling-stock', 'isu-90'])('%s CMOS source uses the JBER consignor and P5 aircraft permission', id => {
  const record = hazardRequirements(scenarios.find(s => s.id === id)).records[0];
  expect(record.page2).toMatchObject({
    shipper: 'FA5030 773 LRS LGRT', address1: 'GPC ONLY SHIP TO',
    address2: '5257 FINLETTER AVE', city: 'JBER', state: 'AK', zip: '99506',
    phone: '9075522131', aircraft: 'Passenger and cargo aircraft',
  });
});
