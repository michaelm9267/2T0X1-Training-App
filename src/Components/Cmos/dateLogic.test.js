import { parseCmosDate, parseEasternDateTime } from "./dateLogic";
test("CMOS dates compare across months and reject impossible values", () => {
  expect(parseCmosDate("31Jan2026")).toBe(Date.UTC(2026, 0, 31));
  expect(parseCmosDate("01Feb2026")).toBeGreaterThan(
    parseCmosDate("31Jan2026"),
  );
  expect(parseCmosDate("31Feb2026")).toBeNull();
});
test("routing timestamps stay Eastern in summer and winter regardless of local timezone", () => {
  expect(parseEasternDateTime("14Oct2026/0800")).toBe(
    Date.UTC(2026, 9, 14, 12),
  );
  expect(parseEasternDateTime("2026-12-14T08:00")).toBe(
    Date.UTC(2026, 11, 14, 13),
  );
  expect(parseEasternDateTime("08Mar2026/0230")).toBeNull();
});
