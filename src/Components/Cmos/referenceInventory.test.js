// Missing source fields must fail the consumer's screen coverage, rather than silently becoming a reduced form.
import { screens, fieldsFor } from "./referenceInventory";
test("each requested page supplies editable tabs and operational actions", () => {
  for (const id of [
    "planning",
    "air",
    "cbl",
    "truck",
    "routing",
    "spe",
    "quote",
  ]) {
    expect(Object.keys(screens[id].tabs).length).toBeGreaterThan(0);
    expect(screens[id].actions).toContain("Save");
    expect(fieldsFor(id).length).toBeGreaterThan(10);
  }
  expect(fieldsFor("planning").map((f) => f.label)).toEqual(
    expect.arrayContaining([
      "TTAN",
      "PCFN",
      "Volume UOM",
      "Max Temp",
      "Type ATCMD Required",
    ]),
  );
  expect(Object.keys(screens.cbl.tabs)).toEqual(
    expect.arrayContaining(["Rail", "Via SCAC", "Conveyances"]),
  );
});
