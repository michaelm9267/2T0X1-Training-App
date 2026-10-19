import { useState } from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CmosWorkspace from "./CmosWorkspace";
import {
  createCmosStore,
  createRecord,
  saveRecord,
  checkRecord,
} from "./model";
const fill = (label, value, scope = screen) =>
  fireEvent.change(scope.getByLabelText(label), { target: { value } });
function readyStore() {
  let s = createCmosStore();
  for (let i = 1; i <= 2; i++) {
    s = createRecord(s, "shipments", {
      tcn: `TRN00${i}`,
      description: "Training box",
      origin: "F00001",
      destination: "F00002",
      milMode: "B",
      nmfc: "999913",
      rdd: "999",
      nsn: "NNSN",
      ciic: "U",
      tac: "TRN1",
      routing: true,
    });
    s = createRecord(s, "pieces", {
      shipmentId: `shipments-${i}`,
      weight: String(i * 10),
      length: "12",
      width: "12",
      height: "12",
      typePack: "BX",
    });
    s = saveRecord(s, "pieces", `pieces-${i}`);
    s = saveRecord(s, "shipments", `shipments-${i}`);
    s = checkRecord(s, "shipments", `shipments-${i}`);
  }
  return s;
}
function Harness({ page, course = "outbound" }) {
  const [s, set] = useState(readyStore);
  return (
    <>
      <CmosWorkspace
        store={s}
        onChange={set}
        initialPage={page}
        context={{ course }}
        onClose={() => {}}
      />
      <pre aria-label="Stored CMOS">{JSON.stringify(s)}</pre>
    </>
  );
}
const stored = () =>
  JSON.parse(screen.getByLabelText("Stored CMOS").textContent);
function assign() {
  userEvent.click(
    screen.getByRole("button", { name: /^Assign TCNs( or |\/)Aggregates$/ }),
  );
  const d = within(screen.getByRole("dialog", { name: "Assign TCNs" }));
  for (const c of d.getAllByRole("checkbox")) userEvent.click(c);
  userEvent.click(d.getByRole("button", { name: "Assign", exact: true }));
  userEvent.click(d.getByRole("button", { name: "Close", exact: true }));
}
test.each(["cdf", "outbound"])(
  "%s builds a route order for multi-TCN cargo, saves it and prints the route report",
  (course) => {
    render(<Harness page="routing" course={course} />);
    userEvent.click(screen.getByRole("button", { name: "New", exact: true }));
    // New opens straight onto Assign TCNs/Aggregates: select the TCNs, then Assign.
    const picker = within(screen.getByRole("dialog", { name: "Assign TCNs/Aggregates" }));
    userEvent.click(picker.getByRole("row", { name: "Assign TRN001" }));
    userEvent.click(picker.getByRole("row", { name: "Assign TRN002" }));
    userEvent.click(picker.getByRole("button", { name: "Assign", exact: true }));
    expect(picker.getByText("No data to display.")).toBeInTheDocument();
    userEvent.click(picker.getByRole("button", { name: "Close" }));
    expect(screen.getByLabelText("Shipment ID").value).toMatch(/^MKFZ1\d{4}0001$/);
    expect(screen.getByLabelText("TCNs Assigned")).toHaveValue("Y");
    expect(screen.getByLabelText("Total Weight")).toHaveValue("30");
    userEvent.click(screen.getByRole("button", { name: "Copy TCN Data" }));
    expect(screen.getByLabelText("Dest DODAAC")).toHaveValue("F00002");
    userEvent.selectOptions(screen.getByLabelText("ATR Carrier Response Hours"), "0.25");
    fill("Pickup Earliest", "14Oct2030/0800");
    fill("Delivery Latest", "16Oct2030/1400");
    userEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
    expect(stored().routings["routings-1"].saved.shipmentIds).toHaveLength(2);
    userEvent.click(screen.getByRole("button", { name: "Print Route Report" }));
    expect(
      screen.getByRole("dialog", { name: "Route report", exact: true }),
    ).toHaveTextContent("TRN002");
  },
);
test("truck manifest loads two TCNs, checks prints and releases", () => {
  render(<Harness page="truck" />);
  userEvent.click(screen.getByRole("button", { name: "New", exact: true }));
  // DSOE ID and Chalk are optional on Truck Manifest.
  assign();
  userEvent.click(screen.getByRole("tab", { name: "Addresses" }));
  fill("Destination DODAAC", "FB6520");
  expect(screen.getByLabelText("Destination Name")).toHaveValue("FB6520  176 LRS LGRDD");
  userEvent.click(screen.getByRole("tab", { name: "Miscellaneous" }));
  fill("Pick Up Date", "14OCT2026");
  userEvent.click(screen.getByRole("tab", { name: "Conveyance" }));
  fill("Equipment Type", "AV1");
  fill("Truck Serial/Bumper Number", "TMO");
  fill("Motor Carrier Name", "773 LRS/LGRTC");
  userEvent.click(screen.getByRole("tab", { name: "TCNs Assigned" }));
  for (const c of within(
    screen.getByRole("tabpanel", { name: "TCNs Assigned" }),
  ).getAllByRole("checkbox"))
    userEvent.click(c);
  userEvent.click(screen.getByRole("button", { name: "Load", exact: true }));
  userEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  userEvent.click(screen.getByRole("button", { name: "Edit Check" }));
  expect(screen.getByRole("status")).toHaveTextContent("Passed Edits");
  userEvent.click(screen.getByRole("button", { name: "Print Manifest" }));
  expect(
    screen.getByRole("dialog", { name: "Truck manifest", exact: true }),
  ).toHaveTextContent("TRN001");
  userEvent.click(screen.getByRole("button", { name: "Release", exact: true }));
  const d = within(
    screen.getByRole("dialog", { name: "Release Truck Manifest" }),
  );
  expect(d.getByLabelText("Document Number")).toHaveValue(stored().truckManifests["truckManifests-1"].draft.manifestNumber);
  fill("Departure Date/Time", "14Oct2026/0900", d);
  userEvent.click(d.getByRole("button", { name: "Release", exact: true }));
  expect(stored().truckManifests["truckManifests-1"].status).toBe("Released");
  expect(stored().truckManifests["truckManifests-1"].releaseDetails.departureAt).toBe("2026-10-14T09:00");
  expect(
    stored().truckManifests["truckManifests-1"].saved.loadedIds,
  ).toHaveLength(2);
});
test("CBL preserves incomplete RINs and conveyances then checks final print and release", () => {
  render(<Harness page="cbl" />);
  userEvent.click(screen.getByRole("button", { name: "New", exact: true }));
  fill("Assign SCAC", "TRNC");
  assign();
  userEvent.click(screen.getByRole("tab", { name: "Billing" }));
  fill("Currency", "USD");
  fill("Est Charges", "25");
  userEvent.click(screen.getByRole("tab", { name: "RINs" }));
  userEvent.click(
    within(screen.getByRole("tabpanel", { name: "RINs" })).getByRole("button", {
      name: "New",
    }),
  );
  const rin = within(screen.getByRole("dialog", { name: "BOL RIN" }));
  userEvent.selectOptions(rin.getByLabelText("RIN Nbr"), "101");
  userEvent.click(rin.getByRole("button", { name: "Save" }));
  userEvent.click(screen.getByRole("tab", { name: "Conveyances" }));
  userEvent.click(
    within(screen.getByRole("tabpanel", { name: "Conveyances" })).getByRole(
      "button",
      { name: "New" },
    ),
  );
  const c = within(screen.getByRole("dialog", { name: "Conveyance" }));
  fill("Primary Eq Nbr", "NONE", c);
  fill("Equip Type Ordered", "AV1", c);
  fill("Equip Type Furnished", "AV1", c);
  userEvent.click(c.getByRole("button", { name: "Save and Close" }));
  userEvent.click(screen.getByRole("tab", { name: "TCNs" }));
  userEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  userEvent.click(screen.getByRole("button", { name: "Edit", exact: true }));
  expect(screen.getByRole("status")).toHaveTextContent("Passed Edits");
  userEvent.click(screen.getByRole("button", { name: "Print", exact: true }));
  const p = within(screen.getByRole("dialog", { name: "Print BOL" }));
  expect(p.getByLabelText("Print Option")).toHaveValue("F");
  userEvent.click(p.getByRole("button", { name: "OK" }));
  expect(
    screen.getByRole("dialog", {
      name: "Commercial Bill of Lading",
      exact: true,
    }),
  ).toHaveTextContent("TRN002");
  userEvent.click(screen.getByRole("button", { name: "Release", exact: true }));
  const r = within(screen.getByRole("dialog", { name: "Release" }));
  expect(r.getByLabelText("B/L Nbr")).toHaveAttribute("readonly");
  // Departure Date starts at the current date and time; waybill and delivery date are optional.
  expect(r.getByLabelText("Departure Date").value).toMatch(/^\d{2}[A-Z][a-z]{2}\d{4}\/\d{4}$/);
  fill("Departure Date", "", r);
  userEvent.click(r.getByRole("button", { name: "OK" }));
  expect(r.getByRole("status")).toHaveTextContent("Departure Date is required");
  fill("Departure Date", "18Oct2026/1956", r);
  fill("Carrier/Waybill Nbr", "TRN-WB", r);
  fill("Estimated Delivery Date", "16Oct2026", r);
  userEvent.click(r.getByRole("button", { name: "OK" }));
  expect(stored().bills["bills-1"].status).toBe("Released");
  const { planningStatus } = require("./planningStatuses");
  const onBill = () => stored().bills["bills-1"].draft.shipmentIds.map((sid) => planningStatus(stored().shipments[sid]));
  expect(onBill().every((code) => code === "CT")).toBe(true);
  // Released: view only, with B/L Corrections, the TCN in history (CT), and the released buttons.
  expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["TCNs", "Addresses", "Billing", "Miscellaneous", "RINs", "Conveyances", "Commodities", "Service Codes", "Via SCAC", "Rail", "B/L Corrections"]);
  expect(screen.queryByRole("button", { name: "Assign TCNs/Aggregates" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Stop Off Data" })).toBeInTheDocument();
  expect(screen.getAllByRole("cell", { name: "CT" }).length).toBeGreaterThan(0);
  expect(screen.queryByRole("cell", { name: "ST" })).not.toBeInTheDocument();
  expect(screen.getAllByLabelText(/^Stop LD /)[0]).toBeDisabled();
  for (const name of ["Print", "Reopen/Cancel BOL", "Notices", "Close"]) expect(screen.getAllByRole("button", { name, exact: true }).length).toBeGreaterThan(0);
  for (const name of ["Release", "Save", "Edit", "Validate Funds"]) expect(screen.queryByRole("button", { name, exact: true })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole("button", { name: "Reopen/Cancel BOL" }));
  userEvent.click(within(screen.getByRole("dialog", { name: "Reopen/Cancel BOL" })).getByRole("button", { name: "Reopen BOL" }));
  expect(stored().bills["bills-1"].status).toBe("Saved");
  expect(onBill().some((code) => code === "CT")).toBe(false);
  expect(screen.getByRole("button", { name: "Release", exact: true })).toBeInTheDocument();
});
