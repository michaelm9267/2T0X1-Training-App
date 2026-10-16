import { openSelectedPlanningTcn } from './planningTestHelpers';
import { useState } from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CdfCmosWorkspace from "../CdfCmos/CdfCmosWorkspace";
import { migrateCdfCmos } from "./courseAdapters";
import CmosWorkspace from "./CmosWorkspace";
import { createCmosStore, createRecord, saveRecord } from "./model";
import { Harness as CdfHarness } from "../CdfCmos/testHarness";
import { newPracticeSession } from "../CargoWindow/practice";
function Harness({ initial, page = "planning", finished = false }) {
  const [store, setStore] = useState(initial);
  return (
    <CmosWorkspace
      store={store}
      onChange={setStore}
      initialPage={page}
      context={{ finished }}
      onClose={() => {}}
    />
  );
}
function records() {
  let s = createRecord(createCmosStore(), "bills", {
    movementDocNbr: "BILL ONE",
  });
  s = createRecord(s, "bills", { movementDocNbr: "BILL TWO" });
  return s;
}
test("CBL print options retain their original target across navigation", () => {
  render(<Harness initial={records()} page="cbl" />);
  userEvent.click(screen.getByRole("button", { name: "Print", exact: true }));
  userEvent.click(
    screen.getByRole("button", { name: "Shipment Planning", exact: true }),
  );
  const options = within(
    screen.getByRole("dialog", { name: "Print Commercial Bill of Lading" }),
  );
  userEvent.click(options.getByRole("button", { name: "OK" }));
  expect(
    screen.getByRole("dialog", {
      name: "Commercial Bill of Lading",
      exact: true,
    }),
  ).toHaveTextContent("BILL TWO");
});
test("finished sessions can select a different record without mutating the stored session", () => {
  render(<Harness initial={records()} page="cbl" finished />);
  userEvent.selectOptions(screen.getByLabelText("Select record"), "bills-1");
  expect(screen.getByLabelText("Movement Doc Nbr")).toHaveValue("BILL ONE");
  expect(
    screen.getByRole("button", { name: "Save", exact: true }),
  ).toBeDisabled();
});
test.each([
  ["Search Status", "PI"],
  ["Pieces", "1"],
  ["Weight", "20"],
  ["Cube", "1"],
])("planning queries search the rendered %s value", (label, value) => {
  let s = createRecord(createCmosStore(), "shipments", { tcn: "TRN001" });
  s = createRecord(s, "pieces", {
    shipmentId: "shipments-1",
    weight: "20",
    length: "12",
    width: "12",
    height: "12",
  });
  s = saveRecord(s, "pieces", "pieces-1");
  s = saveRecord(s, "shipments", "shipments-1");
  render(<Harness initial={s} />);
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
  userEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(
    screen.getByRole("button", { name: "Select TRN001" }),
  ).toBeInTheDocument();
});
test("Incheck preserves a selected subset for Next instead of visiting unrelated rows", () => {
  let s = createCmosStore();
  for (const tcn of ["TRN001", "TRN002", "TRN003"])
    s = createRecord(s, "shipments", { tcn });
  render(<Harness initial={s} />);
  userEvent.click(screen.getByRole("checkbox", { name: "Select row TRN001" }));
  userEvent.click(screen.getByRole("checkbox", { name: "Select row TRN003" }));
  userEvent.click(screen.getByRole("button", { name: "Incheck" }));openSelectedPlanningTcn();
  userEvent.click(screen.getByRole("button", { name: "Next", exact: true }));
  expect(screen.getByLabelText("TCN")).toHaveValue("TRN003");
});
test("Shipment Status displays all guide history fields", () => {
  let s = createRecord(createCmosStore(), "shipments", { tcn: "TRN001" });
  s = saveRecord(s, "shipments", "shipments-1");
  render(<Harness initial={s} />);
  userEvent.click(screen.getByRole("button", { name: "Select TRN001" }));
  userEvent.click(screen.getByRole("button", { name: "Incheck" }));openSelectedPlanningTcn();
  userEvent.click(screen.getByRole("tab", { name: "Shipment Status" }));
  const tab = within(screen.getByRole("tabpanel", { name: "Shipment Status" }));
  for (const label of [
    "Action Date",
    "Time GMT",
    "User ID",
    "Receiver ID",
    "Lead TCN",
    "Additional Info",
  ])
    expect(tab.getByRole("columnheader", { name: label })).toBeInTheDocument();
});
test("CMOS shows unresolved LOGMOD discrepancies until source corrections are made", () => {
  const s = newPracticeSession({ section: "manifest", random: () => 0.4 });
  s.shipments[s.scenarioId] = {
    ...s.shipments[s.scenarioId],
    weight: 1000,
    docErrors: { logmodWeight: 250 },
  };
  s.exercises[s.scenarioId].docFixes = {};
  render(<CdfHarness initial={s} />);
  const option = within(screen.getByLabelText("Documentation"))
    .getAllByRole("option")
    .find((o) => o.textContent.endsWith("LOGMOD paperwork"));
  userEvent.selectOptions(screen.getByLabelText("Documentation"), option.value);
  userEvent.click(screen.getByRole("button", { name: "View documentation" }));
  expect(
    screen.getByRole("dialog", { name: /LOGMOD paperwork/ }),
  ).toHaveTextContent("1250");
});

test("aborting an air manifest withdraws the actual CDF departure release", () => {
  const initial = newPracticeSession({
    section: "departure",
    random: () => 0.4,
  });
  initial.cdfCmos.sharedCmos = migrateCdfCmos(initial);
  const id = initial.cdfCmos.sharedCmos.selection.airManifests;
  initial.cdfCmos.sharedCmos.airManifests[id].status = "Released";
  initial.departure.releasedAt = "2026-10-13T15:00:00Z";
  function Course() {
    const [session, setSession] = useState(initial);
    return (
      <>
        <output aria-label="Release status">
          {session.departure.releasedAt ? "Released" : "Open"}
        </output>
        <CdfCmosWorkspace
          session={session}
          state={session.cdfCmos}
          initialPage="air"
          onClose={() => {}}
          onStateChange={(update) =>
            setSession((s) => ({ ...s, cdfCmos: update(s.cdfCmos) }))
          }
          onExerciseChange={(key, update) =>
            setSession((s) => ({
              ...s,
              exercises: { ...s.exercises, [key]: update(s.exercises[key]) },
            }))
          }
          onDepartureChange={(update) =>
            setSession((s) => ({ ...s, departure: update(s.departure) }))
          }
        />
      </>
    );
  }
  render(<Course />);
  userEvent.selectOptions(screen.getByLabelText("Release Status"), "Released");
  userEvent.click(screen.getByRole("button", { name: "Search", exact: true }));
  userEvent.click(screen.getAllByRole("button", { name: /^Open manifest TRN/ })[0]);
  userEvent.click(
    screen.getByRole("button", { name: "Abort Mission", exact: true }),
  );
  expect(screen.getByLabelText("Release status")).toHaveTextContent("Open");
});
