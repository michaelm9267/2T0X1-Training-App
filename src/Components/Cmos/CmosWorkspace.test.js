import { openSelectedPlanningTcn } from './planningTestHelpers';
import { useState } from "react";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CmosWorkspace from "./CmosWorkspace";
import { createCmosStore, createRecord, saveRecord } from "./model";
function Harness({ course = "cdf", origin = "F00001" }) {
  const [store, setStore] = useState(() =>
    createRecord(createCmosStore(), "shipments", { tcn: "TRN001" }),
  );
  return (
    <CmosWorkspace
      store={store}
      onChange={setStore}
      context={{
        course,
        origin,
        documents: [
          {
            id: "source",
            title: "Exercise paperwork",
            render: () => <p>Reference TCN TRN001</p>,
          },
        ],
      }}
      onClose={() => {}}
    />
  );
}
test.each(["cdf", "outbound"])(
  "%s exposes a shared complete screen set",
  (course) => {
    render(<Harness course={course} />);
    for (const name of [
      "Air Manifest",
      "Commercial BOL",
      "Truck Manifest",
      "Routings",
      "Small Package Express",
      "Rate Quote",
    ])
      expect(screen.getByRole("button", { name, exact: true })).toBeEnabled();
  },
);
test("invalid save preserves editable input and does not pass Edit TCN", () => {
  render(<Harness />);
  userEvent.click(screen.getByRole("button", { name: "Select TRN001" }));
  userEvent.click(screen.getByRole("button", { name: "Incheck" }));openSelectedPlanningTcn();
  fireEvent.change(screen.getByLabelText("TCN"), { target: { value: "" } });
  userEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Record successfully saved",
  );
  expect(screen.getByLabelText("TCN")).toBeEnabled();
  userEvent.click(screen.getByRole("button", { name: "Edit TCN" }));
  expect(screen.getByRole("status")).toHaveTextContent("Edit TCN Failed");
  expect(within(screen.getByRole("dialog", { name: "Consistency Check Results" })).getAllByRole("listitem").map((item) => item.textContent)).toContain("TCN");
  expect(screen.getByLabelText("TCN")).toHaveValue("");
});
test("documentation remains nonmodal and open while navigating and typing", () => {
  render(<Harness />);
  userEvent.click(screen.getByRole("button", { name: "View documentation" }));
  const doc = screen.getByRole("dialog", { name: "Exercise paperwork" });
  expect(doc).not.toHaveAttribute("aria-modal");
  userEvent.click(screen.getByRole("button", { name: "Select TRN001" }));
  userEvent.click(screen.getByRole("button", { name: "Incheck" }));openSelectedPlanningTcn();
  fireEvent.change(screen.getByLabelText("TTAN"), {
    target: { value: "TEST" },
  });
  expect(screen.getByLabelText("TTAN")).toHaveValue("TEST");
  userEvent.click(
    screen.getByRole("button", { name: "Truck Manifest", exact: true }),
  );
  expect(doc).toBeInTheDocument();
  userEvent.click(
    within(doc).getByRole("button", { name: "Minimize Exercise paperwork" }),
  );
  expect(
    screen.getByRole("button", { name: "New", exact: true }),
  ).toBeEnabled();
});
test("new piece Save and Close persists incomplete fields without blocking", () => {
  render(<Harness />);
  userEvent.click(screen.getByRole("button", { name: "Select TRN001" }));
  userEvent.click(screen.getByRole("button", { name: "Incheck" }));openSelectedPlanningTcn();
  userEvent.click(screen.getByRole("button", { name: "New piece" }));
  const dialog = screen.getByRole("dialog", { name: "Piece Information" });
  fireEvent.change(within(dialog).getByLabelText("Weight"), {
    target: { value: "unknown" },
  });
  userEvent.click(
    within(dialog).getByRole("button", { name: "Save and Close" }),
  );
  expect(
    screen.queryByRole("dialog", { name: "Piece Information" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
});
test("forced REPSHIP follows CIIC and cannot be deselected", () => {
  render(<Harness />);
  userEvent.click(screen.getByRole("button", { name: "Select TRN001" }));
  userEvent.click(screen.getByRole("button", { name: "Incheck" }));openSelectedPlanningTcn();
  fireEvent.change(screen.getByLabelText("CIIC"), { target: { value: "1" } });
  userEvent.click(screen.getByRole("tab", { name: "Indicators" }));
  expect(screen.getByLabelText("REPSHIP Required")).toBeChecked();
  expect(screen.getByLabelText("REPSHIP Required")).toBeDisabled();
});
test("finished tests can still view generated print displays without mutating records", () => {
  const s = createRecord(createCmosStore(), "bills", { scac: "TRNC" });
  function Finished() {
    const [store, setStore] = useState(s);
    return (
      <CmosWorkspace
        store={store}
        onChange={setStore}
        initialPage="cbl"
        context={{ finished: true }}
        onClose={() => {}}
      />
    );
  }
  render(<Finished />);
  userEvent.click(screen.getByRole("button", { name: "Open bill bills-1" }));
  userEvent.click(screen.getByRole("button", { name: "Print", exact: true }));
  userEvent.click(screen.getByRole("button", { name: "OK" }));
  expect(
    screen.getByRole("dialog", { name: "Commercial Bill of Lading" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Save", exact: true }),
  ).toBeDisabled();
});
test("SPE shows linked shipment totals and tracks query results", () => {
  let s = createRecord(createCmosStore(), "shipments", {
    tcn: "TRN001",
    description: "Training box",
    destination: "F00002",
    milMode: "J",
  });
  s = createRecord(s, "pieces", {
    shipmentId: "shipments-1",
    weight: "25",
    length: "12",
    width: "12",
    height: "12",
  });
  s = createRecord(s, "express", { shipmentId: "shipments-1" });
  function SPE() {
    const [store, setStore] = useState(s);
    return (
      <CmosWorkspace
        store={store}
        onChange={setStore}
        initialPage="spe"
        context={{ course: "outbound" }}
        onClose={() => {}}
      />
    );
  }
  render(<SPE />);
  expect(screen.getByLabelText("TCN")).toHaveValue("TRN001");
  expect(screen.getByLabelText("Weight")).toHaveValue("25");
  expect(screen.getByLabelText("Weight")).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Start Date")).toBeEnabled();
});
test("print options remain nonmodal while the CMOS form stays editable", () => {
  let s = createRecord(createCmosStore(), "bills", {});
  function Bills() {
    const [store, setStore] = useState(s);
    return (
      <CmosWorkspace
        store={store}
        onChange={setStore}
        initialPage="cbl"
        onClose={() => {}}
      />
    );
  }
  render(<Bills />);
  userEvent.click(screen.getByRole("button", { name: "Open bill bills-1" }));
  userEvent.click(screen.getByRole("button", { name: "Print", exact: true }));
  // Print BOL is a small modal dialog, as in CMOS.
  const options = within(screen.getByRole("dialog", { name: "Print BOL" }));
  expect(within(options.getByLabelText("Print Option")).getAllByRole("option").map((o) => o.textContent)).toEqual(["F - Final", "D - Draft"]);
  expect(options.getByLabelText("Customs No")).toBeChecked();
  expect(options.getByLabelText("Estimated Pickup Date").value).toMatch(/^\d{2}[A-Z][a-z]{2}\d{4}$/);
  userEvent.click(options.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog", { name: "Print BOL" })).not.toBeInTheDocument();
});
test("Save and Close returns a movement record to its list without losing raw data", () => {
  let s = createRecord(createCmosStore(), "truckManifests", {});
  function Truck() {
    const [store, setStore] = useState(s);
    return (
      <CmosWorkspace
        store={store}
        onChange={setStore}
        initialPage="truck"
        onClose={() => {}}
      />
    );
  }
  render(<Truck />);
  fireEvent.change(screen.getByLabelText("Convoy Nbr"), {
    target: { value: "PARTIAL" },
  });
  userEvent.click(screen.getByRole("button", { name: "Save and Close" }));
  expect(screen.queryByLabelText("Convoy Nbr")).not.toBeInTheDocument();
  userEvent.click(
    screen.getByRole("button", { name: "Edit truckManifests-1" }),
  );
  expect(screen.getByLabelText("Convoy Nbr")).toHaveValue("PARTIAL");
});
test("planning supports multiple selected TCNs and navigates that selection", () => {
  let s = createRecord(createCmosStore(), "shipments", { tcn: "TRN001" });
  s = createRecord(s, "shipments", { tcn: "TRN002" });
  function Multi() {
    const [store, setStore] = useState(s);
    return (
      <CmosWorkspace store={store} onChange={setStore} onClose={() => {}} />
    );
  }
  render(<Multi />);
  userEvent.click(screen.getByRole("checkbox", { name: "Select row TRN001" }));
  userEvent.click(screen.getByRole("checkbox", { name: "Select row TRN002" }));
  userEvent.click(screen.getByRole("button", { name: "Incheck" }));openSelectedPlanningTcn();
  expect(screen.getByLabelText("TCN")).toHaveValue("TRN001");
  userEvent.click(screen.getByRole("button", { name: "Next", exact: true }));
  expect(screen.getByLabelText("TCN")).toHaveValue("TRN002");
});
test("Print Selected Pieces includes only the checked piece", () => {
  let s = createRecord(createCmosStore(), "shipments", { tcn: "TRN001" });
  for (const number of ["1", "2"]) {
    s = createRecord(s, "pieces", {
      shipmentId: "shipments-1",
      number,
      weight: "10",
      length: "12",
      width: "12",
      height: "12",
    });
    s = saveRecord(s, "pieces", s.selection.pieces);
  }
  function Pieces() {
    const [store, setStore] = useState(s);
    return (
      <CmosWorkspace store={store} onChange={setStore} onClose={() => {}} />
    );
  }
  render(<Pieces />);
  userEvent.click(screen.getByRole("button", { name: "Select TRN001" }));
  userEvent.click(screen.getByRole("button", { name: "Incheck" }));openSelectedPlanningTcn();
  userEvent.click(screen.getByRole("checkbox", { name: "Select pieces-1" }));
  userEvent.click(
    screen.getByRole("button", { name: "Print Selected Pieces" }),
  );
  const doc = screen.getByRole("dialog", {
    name: "Military shipping label",
    exact: true,
  });
  const label = within(doc).getByLabelText("Military shipping label, piece 1 of 2");
  expect(label).toHaveTextContent("TRN001");
  expect(label).toHaveTextContent("NO LINE ITEM DATA");
  expect(
    within(doc).queryByLabelText("Military shipping label, piece 2 of 2"),
  ).not.toBeInTheDocument();
});

test('inchecking changes an advance TCN from 00 to PI immediately and retains it in the planning list', () => {
  render(<Harness />);
  const row = screen.getByRole('button', { name: 'Select TRN001' }).closest('tr');
  expect(within(row).getByText('00', { exact: true })).toBeInTheDocument();
  userEvent.click(within(row).getByRole('button', { name: 'Select TRN001' }));
  userEvent.click(screen.getByRole('button', { name: 'Incheck' }));openSelectedPlanningTcn();
  userEvent.click(screen.getByRole('button', { name: 'Shipment Planning', exact: true }));
  const updated = screen.getByRole('button', { name: 'Select TRN001' }).closest('tr');
  expect(within(updated).getByText('PI', { exact: true })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search Status'), { target: { value: '00' } });
  userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
  expect(screen.queryByRole('button', { name: 'Select TRN001' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('TCN'), { target: { value: 'TRN001' } });
  userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
  expect(screen.getByRole('button', { name: 'Select TRN001' })).toBeInTheDocument();
});

test('inchecking a fictional shipment starts with an empty Pieces grid', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Select FB28236280001XXX' }));
  userEvent.click(screen.getByRole('button', { name: 'Incheck' }));
  openSelectedPlanningTcn();
  const panel = within(screen.getByRole('tabpanel', { name: 'Pieces' }));
  expect(panel.getByText('No data to display.')).toBeInTheDocument();
  expect(panel.getByLabelText('Total PCS')).toHaveValue('0');
  expect(panel.getByLabelText('Total WT')).toHaveValue('0');
});

test('planning toolbar follows checkbox selection and clears the selected shipment', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('checkbox', { name: 'Select row TRN001' }));
  expect(screen.getByRole('button', { name: 'Copy TCN' })).toBeEnabled();
  userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
  expect(screen.getByRole('button', { name: 'Copy TCN' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Edit Check' })).toBeDisabled();
});

test('finished sessions cannot open fictional traffic that is not part of the stored exercise', () => {
  render(<CmosWorkspace store={createCmosStore()} onChange={() => {}} context={{ finished: true }} onClose={() => {}} />);
  expect(screen.getByRole('checkbox', { name: 'Select row FB28236280001XXX' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Select FB28236280001XXX' })).toBeDisabled();
});

test.each(['O - Other hazardous', 'A - Ammunition/explosives'])(
  'DG2 appears only while the hazardous indicator is selected (%s)', hazard => {
    render(<Harness />);
    userEvent.click(screen.getByRole('button', { name: 'Select TRN001' }));
    userEvent.click(screen.getByRole('button', { name: 'Incheck' }));openSelectedPlanningTcn();
    expect(screen.queryByRole('tab', { name: 'DG2' })).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
    userEvent.selectOptions(screen.getByLabelText('Hazardous/Ammunition Ind'), hazard);
    userEvent.click(screen.getByRole('tab', { name: 'DG2' }));
    expect(screen.getByRole('tabpanel', { name: 'DG2' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
    userEvent.selectOptions(screen.getByLabelText('Hazardous/Ammunition Ind'), 'N - Not hazardous');
    expect(screen.queryByRole('tab', { name: 'DG2' })).not.toBeInTheDocument();
  }
);

test('switching from a hazardous record on DG2 to a nonhazardous record shows Pieces', () => {
  let initial = createRecord(createCmosStore(), 'shipments', { tcn: 'HAZ001', hazmat: 'O - Other hazardous' });
  initial = createRecord(initial, 'shipments', { tcn: 'SAFE001', hazmat: 'N - Not hazardous' });
  function Records() {
    const [store, setStore] = useState(initial);
    return <CmosWorkspace store={store} onChange={setStore} onClose={() => {}} />;
  }
  render(<Records />);
  userEvent.click(screen.getByRole('button', { name: 'Select HAZ001' }));
  userEvent.click(screen.getByRole('button', { name: 'Incheck' }));openSelectedPlanningTcn();
  userEvent.click(screen.getByRole('tab', { name: 'DG2' }));
  userEvent.selectOptions(screen.getByLabelText('Select record'), 'shipments-2');
  expect(screen.queryByRole('tab', { name: 'DG2' })).not.toBeInTheDocument();
  expect(screen.getByRole('tabpanel', { name: 'Pieces' })).toBeInTheDocument();
});

test('Incheck stays on the list in PI status and the TCN itself opens the record', () => {
  render(<Harness />);
  userEvent.selectOptions(screen.getByLabelText('Search Status'), '00');
  userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
  userEvent.click(screen.getByRole('checkbox', { name: 'Select row TRN001' }));
  userEvent.click(screen.getByRole('button', { name: 'Incheck' }));
  expect(screen.queryByRole('tabpanel', { name: 'Pieces' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Search Status')).toHaveValue('PI');
  const tcn = screen.getByRole('button', { name: 'Open TCN TRN001' });
  expect(within(tcn.closest('tr')).getByText('PI', { exact: true })).toBeInTheDocument();
  userEvent.click(tcn);
  expect(screen.getByLabelText('TCN')).toHaveValue('TRN001');
  expect(screen.getByRole('tabpanel', { name: 'Pieces' })).toBeInTheDocument();
});

test('opening selected fictional TCNs preserves their records and statuses for Next navigation', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('checkbox', { name: 'Select row FB28236280001XXX' }));
  userEvent.click(screen.getByRole('checkbox', { name: 'Select row FB33006280002XXX' }));
  userEvent.click(screen.getByRole('button', { name: 'Open TCN FB28236280001XXX' }));
  expect(screen.getByLabelText('Status')).toHaveValue('00 - Advance Record Not Yet Inchecked');
  userEvent.click(screen.getByRole('button', { name: 'Next', exact: true }));
  expect(screen.getByLabelText('TCN')).toHaveValue('FB33006280002XXX');
  expect(screen.getByLabelText('Status')).toHaveValue('PI - Planning And Packaging');
});

test.each([['MIL Mode', 'Exp Mode'], ['Exp Mode', 'MIL Mode']])(
  '%s magnifying glass opens the mode reference and selects into only that field', (label, other) => {
    render(<Harness />);
    userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
    const previous = screen.getByLabelText(other).value;
    userEvent.click(screen.getByRole('button', { name: `Look up ${label}` }));
    const modal = within(screen.getByRole('dialog', { name: label === "MIL Mode" ? "MIL/EDI Mode Code Lookup" : `${label} lookup` }));
    expect(modal.getByText('DEFENSE COURIER SERVICE')).toBeInTheDocument();
    fireEvent.change(modal.getByLabelText('Lookup search'), { target: { value: 'LOCAL DELIVERY' } });
    userEvent.click(modal.getByRole('radio', { name: 'Select 9' }));
    userEvent.click(modal.getByRole('button', { name: 'Select', exact: true }));
    expect(screen.getByLabelText(label)).toHaveValue('9');
    expect(screen.getByLabelText(other)).toHaveValue(previous);
    userEvent.click(screen.getByRole('button', { name: `Look up ${label}` }));
    const reopened = within(screen.getByRole('dialog', { name: label === "MIL Mode" ? "MIL/EDI Mode Code Lookup" : `${label} lookup` }));
    fireEvent.change(reopened.getByLabelText('Lookup search'), { target: { value: 'AIR MOBILITY' } });
    userEvent.click(reopened.getByRole('radio', { name: 'Select F' }));
    userEvent.click(reopened.getByRole('button', { name: 'Select', exact: true }));
    expect(screen.getByLabelText(label)).toHaveValue('F');
    expect(screen.getByLabelText(other)).toHaveValue(previous);
  }
);

test('New piece opens manual weight entry, Add Piece starts the next, and a single piece can be deleted', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  userEvent.click(screen.getByRole('button', { name: 'New piece' }));
  let piece = within(screen.getByRole('dialog', { name: 'Piece Information' }));
  expect(piece.getByLabelText('Number')).toHaveValue('1');
  expect(piece.getByLabelText('Number')).toHaveAttribute('readonly');
  expect(piece.getByLabelText('Weight')).toHaveValue('');
  for (const [label, value] of [['Weight', '25'], ['Length', '12'], ['Width', '12'], ['Height', '12']])
    fireEvent.change(piece.getByLabelText(label), { target: { value } });
  expect(piece.getByLabelText('Cube')).toHaveValue('1.0');
  userEvent.click(piece.getByRole('button', { name: 'Add Piece' }));
  piece = within(screen.getByRole('dialog', { name: 'Piece Information' }));
  expect(piece.getByLabelText('Number')).toHaveValue('2');
  expect(piece.getByLabelText('Weight')).toHaveValue('');
  fireEvent.change(piece.getByLabelText('Weight'), { target: { value: '32' } });
  userEvent.click(piece.getByRole('button', { name: 'Save and Close' }));
  userEvent.click(screen.getByRole('button', { name: 'Edit piece 1' }));
  piece = within(screen.getByRole('dialog', { name: 'Piece Information' }));
  userEvent.click(piece.getByRole('button', { name: 'Delete', exact: true }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'Delete detail record?' })).getByRole('button', { name: 'Confirm' }));
  const panel = within(screen.getByRole('tabpanel', { name: 'Pieces' }));
  expect(panel.queryByRole('button', { name: 'Edit piece 1' })).not.toBeInTheDocument();
  expect(panel.getByRole('button', { name: 'Edit piece 2' })).toBeInTheDocument();
  expect(panel.getByLabelText('Total PCS')).toHaveValue('1');
  expect(panel.getByLabelText('Total WT')).toHaveValue('32');
  userEvent.click(screen.getByRole('button', { name: 'New piece' }));
  expect(within(screen.getByRole('dialog', { name: 'Piece Information' })).getByLabelText('Number')).toHaveValue('3');
});

test('closing a new unsaved piece leaves the grid empty', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  userEvent.click(screen.getByRole('button', { name: 'New piece' }));
  userEvent.click(within(screen.getByRole('dialog', { name: 'Piece Information' })).getByRole('button', { name: 'Close', exact: true }));
  const panel = within(screen.getByRole('tabpanel', { name: 'Pieces' }));
  expect(panel.getByLabelText('Total PCS')).toHaveValue('0');
  expect(panel.getByText('No data to display.')).toBeInTheDocument();
});

test('Ultimate Consignee clear removes only consignee address data and keeps other shipment fields', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  fireEvent.change(screen.getByLabelText('TTAN'), { target: { value: 'KEEP-TTAN' } });
  userEvent.click(screen.getByRole('tab', { name: 'Ultimate Consignee' }));
  let panel = within(screen.getByRole('tabpanel', { name: 'Ultimate Consignee' }));
  for (const [label, value] of [['Name', 'MOODY AFB'], ['Address', '4380 D ALABAMA RD'], ['Address 2', 'BLDG 10'], ['Base/City', 'MOODY AFB'], ['Country', 'US'], ['State', 'GA'], ['Zip', '31699'], ['Phone Nbr', '8014383396']])
    fireEvent.change(panel.getByLabelText(label), { target: { value } });
  userEvent.click(screen.getByRole('tab', { name: 'Pieces' }));
  userEvent.click(screen.getByRole('tab', { name: 'Ultimate Consignee' }));
  panel = within(screen.getByRole('tabpanel', { name: 'Ultimate Consignee' }));
  expect(panel.getByLabelText('Name')).toHaveValue('MOODY AFB');
  userEvent.click(panel.getByRole('button', { name: 'Clear Ultimate Consignee Data' }));
  for (const label of ['Name', 'Address', 'Address 2', 'Base/City', 'Country', 'State', 'Zip', 'Phone Nbr'])
    expect(panel.getByLabelText(label)).toHaveValue('');
  expect(screen.getByLabelText('TTAN')).toHaveValue('KEEP-TTAN');
});

test('Indicators provides the reference hazardous choices, Air Dim dropdown and four protective service fields', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
  const panel = within(screen.getByRole('tabpanel', { name: 'Indicators' }));
  expect(panel.queryByRole('button', { name: 'Look up ETRR Ind' })).not.toBeInTheDocument();
  expect(panel.queryByRole('button', { name: 'Look up Armed Forces Courier Ind' })).not.toBeInTheDocument();
  const hazard = panel.getByLabelText('Hazardous/Ammunition Ind');
  userEvent.selectOptions(hazard, within(hazard).getByRole('option', { name: 'E - Explosives' }));
  expect(screen.getByRole('tab', { name: 'DG2' })).toBeInTheDocument();
  expect(panel.getByRole('textbox', { name: 'USML' })).toBeInTheDocument();
  const airDim = panel.getByLabelText('Air Dim');
  expect(within(airDim).getAllByRole('option').map(o => o.textContent).filter(Boolean)).toEqual(['A - Not Consolidated, Not Exceeding 84', 'C - Consolidated, Not Exceeding 84', 'D - Consolidated, Exceeds 84', 'Z - Not Consolidated, Exceeds 84']);
  userEvent.selectOptions(airDim, 'Z');
  fireEvent.change(panel.getByLabelText('Protective Service Ind 2'), { target: { value: '3' } });
  expect(panel.getByLabelText('DD Form 1907 Required')).toBeChecked();
  userEvent.click(screen.getByRole('tab', { name: 'Pieces' }));
  userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
  const reopened = within(screen.getByRole('tabpanel', { name: 'Indicators' }));
  expect(reopened.getByLabelText('Protective Service Ind 2')).toHaveValue('3');
  expect(reopened.getByLabelText('Protective Service Ind 1')).toHaveValue('');
  expect(reopened.getByLabelText('Air Dim')).toHaveValue('Z');
});
test('Commodity S/H magnifying glass opens the Air Commodity and Special Handling Lookup', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
  userEvent.click(screen.getByRole('button', { name: 'Look up Commodity S/H' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Air Commodity and Special Handling Lookup' }));
  expect(dialog.getByRole('row', { name: /^Commodity D ANIMALS/ })).toBeInTheDocument();
  expect(dialog.getByRole('row', { name: /^Special Handling Z NO SPECIAL HANDLING/ })).toBeInTheDocument();
  expect(dialog.getByRole('button', { name: 'Select' })).toBeDisabled();
  fireEvent.change(dialog.getByLabelText('Filter Commodity Description'), { target: { value: 'aircraft' } });
  expect(dialog.queryByRole('row', { name: /^Commodity D ANIMALS/ })).not.toBeInTheDocument();
  userEvent.click(dialog.getByRole('row', { name: /^Commodity A SUPPLIES/ }));
  userEvent.click(dialog.getByRole('row', { name: /^Special Handling Z / }));
  expect(dialog.getByLabelText('Selected Commodity S/H')).toHaveValue('AZ');
  userEvent.click(dialog.getByRole('button', { name: 'Select' }));
  expect(screen.queryByRole('dialog', { name: 'Air Commodity and Special Handling Lookup' })).not.toBeInTheDocument();
  expect(within(screen.getByRole('tabpanel', { name: 'Indicators' })).getByRole('textbox', { name: 'Commodity S/H' })).toHaveValue('AZ');
});
test("paperwork opens in a separate window from any CMOS screen and closes with CMOS", () => {
  const popup = { document: document.implementation.createHTMLDocument(""), closed: false, focus: jest.fn(), print: jest.fn(), close: jest.fn(() => { popup.closed = true; }) };
  const open = jest.spyOn(window, "open").mockReturnValue(popup);
  const { unmount } = render(<Harness />);
  userEvent.click(screen.getByRole("button", { name: "Air Manifest" }));
  userEvent.click(screen.getByRole("button", { name: "Paperwork ↗" }));
  expect(open).toHaveBeenCalledWith("", "cmos-paperwork", expect.any(String));
  expect(popup.document.querySelector('select[aria-label="Paperwork document"]').value).toBe("source");
  expect(popup.document.body.textContent).toContain("Reference TCN TRN001");
  expect(screen.queryByText("Reference TCN TRN001")).not.toBeInTheDocument();
  act(() => [...popup.document.querySelectorAll("button")].find((b) => b.textContent === "Print").click());
  expect(popup.print).toHaveBeenCalled();
  unmount();
  expect(popup.close).toHaveBeenCalled();
  open.mockRestore();
});
test("a blocked paperwork window falls back to the floating document", () => {
  const open = jest.spyOn(window, "open").mockReturnValue(null);
  render(<Harness />);
  userEvent.click(screen.getByRole("button", { name: "Open in new window" }));
  expect(screen.getByRole("dialog", { name: "Exercise paperwork" })).toHaveTextContent("Reference TCN TRN001");
  expect(screen.getByText(/blocked the paperwork window/)).toBeInTheDocument();
  open.mockRestore();
});

test.each(['cdf', 'outbound'])('%s selecting any hazardous indicator checks T-9 and None clears it', course => {
  render(<Harness course={course} />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
  const t9 = screen.getByLabelText('Misc T-9 Required');
  expect(t9).not.toBeChecked();
  for (const indicator of ['O - Other hazardous', 'A - Ammunition/explosives', 'E - Explosives']) {
    userEvent.selectOptions(screen.getByLabelText('Hazardous/Ammunition Ind'), indicator);
    expect(t9).toBeChecked();
    userEvent.selectOptions(screen.getByLabelText('Hazardous/Ammunition Ind'), 'N - Not hazardous');
    expect(t9).not.toBeChecked();
  }
  userEvent.selectOptions(screen.getByLabelText('Hazardous/Ammunition Ind'), 'A - Ammunition/explosives');
  userEvent.click(screen.getByRole('tab', { name: 'T-9 Misc' }));
  expect(within(screen.getByRole('tabpanel', { name: 'T-9 Misc' })).getByRole('button', { name: 'New' })).toBeEnabled();
  userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
  userEvent.click(screen.getByLabelText('Misc T-9 Required'));
  expect(screen.getByLabelText('Misc T-9 Required')).not.toBeChecked();
});

test('MIL Mode F Edit TCN lists the missing air data in Consistency Check Results', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  for (const id of ['tcn', 'milMode', 'origin', 'nsn', 'ciic'])
    expect(document.querySelector(`[data-field="${id}"] .shared-required-mark`)).toHaveTextContent('*');
  expect(document.querySelector('[data-field="description"] .shared-required-mark')).toBeNull();
  fireEvent.change(screen.getByLabelText('MIL Mode'), { target: { value: 'F' } });
  for (const label of ['POE', 'POD', 'TAC', 'ETA']) fireEvent.change(screen.getByLabelText(label), { target: { value: '' } });
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  userEvent.click(screen.getByRole('button', { name: 'Edit TCN' }));
  expect(screen.getByRole('status')).toHaveTextContent('Edit TCN Failed');
  expect(screen.getByRole('status')).toHaveTextContent('TCN Failed Edit Checks');
  const results = within(screen.getByRole('dialog', { name: 'Consistency Check Results' }));
  expect(results.getByText(/^TCN '.+' \(loose\) is missing:$/)).toBeInTheDocument();
  const missing = results.getAllByRole('listitem').map(item => item.textContent);
  expect(missing).toEqual(expect.arrayContaining(['Commodity/Special Handling Code', 'POE', 'POD', 'TAC', 'ETA CODE', 'Air Dimension Code', 'Weight', 'Cube', 'Piece data']));
  expect(missing.indexOf('POE')).toBeLessThan(missing.indexOf('Air Dimension Code'));
  expect(results.getAllByText('Use Shipment Planning to enter data.').length).toBeGreaterThan(0);
  userEvent.click(results.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog', { name: 'Consistency Check Results' })).not.toBeInTheDocument();
});
test('Prime DIC is built from the type of shipment and follows its changes', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  const dic = screen.getByLabelText('Prime DIC');
  expect(dic).toHaveValue('TX1');
  expect(dic).toHaveAttribute('readonly');
  userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
  const hazard = screen.getByLabelText('Hazardous/Ammunition Ind');
  userEvent.selectOptions(hazard, 'O - Other hazardous');
  expect(screen.getByLabelText('Prime DIC')).toHaveValue('TJ1');
  userEvent.selectOptions(screen.getByLabelText('Hazardous/Ammunition Ind'), 'A - Ammunition/explosives');
  expect(screen.getByLabelText('Prime DIC')).toHaveValue('TE1');
  fireEvent.change(screen.getByLabelText('Pal ID'), { target: { value: 'P1' } });
  expect(screen.getByLabelText('Prime DIC')).toHaveValue('TE4');
  fireEvent.change(screen.getByLabelText('Pal ID'), { target: { value: '' } });
  userEvent.selectOptions(screen.getByLabelText('Hazardous/Ammunition Ind'), 'N - Not hazardous');
  expect(screen.getByLabelText('Prime DIC')).toHaveValue('TX1');
});
test('saving with every * field filled moves the status to AT for air modes and ST for surface modes', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  const status = () => document.querySelector('[data-field="status"] input').value;
  const save = () => userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  for (const [label, value] of [['TCN', 'TRNSTATUS0001XXX'], ['Consignor', 'FA5030'], ['CIIC', 'U'], ['NMFC/UFC', '999913'], ['MIL Mode', '9']])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.change(screen.getByLabelText('NSN'), { target: { value: '' } });
  save();
  expect(status()).toMatch(/^PI /);
  fireEvent.change(screen.getByLabelText('NSN'), { target: { value: 'NNSN' } });
  expect(status()).toMatch(/^PI /);
  save();
  expect(status()).toBe('ST - Inchecked Into Surface Freight');
  fireEvent.change(screen.getByLabelText('MIL Mode'), { target: { value: 'F' } });
  save();
  expect(status()).toBe('AT - Inchecked Into Air Freight');
  for (const mode of ['J', '5', 'B', 'Q', 'A']) {
    fireEvent.change(screen.getByLabelText('MIL Mode'), { target: { value: mode } });
    save();
    expect(status()).toBe('ST - Inchecked Into Surface Freight');
  }
  fireEvent.change(screen.getByLabelText('MIL Mode'), { target: { value: '9' } });
  save();
  expect(status()).toBe('ST - Inchecked Into Surface Freight');
});
test('Indicators match CMOS: no GATES, ATCMD A/W, DEMIL lookup, courier codes and system-filled fields', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
  const panel = within(screen.getByRole('tabpanel', { name: 'Indicators' }));
  expect(panel.queryByLabelText('GATES Ind')).not.toBeInTheDocument();
  const options = label => within(panel.getByLabelText(label)).getAllByRole('option').map(o => o.textContent).filter(Boolean);
  expect(options('Type ATCMD Required')).toEqual(['A - Air Clearance', 'W - WPS Shipments']);
  expect(options('Armed Forces Courier Ind')).toEqual(['9 - Courier Transfer Station (CTS) and POE are collocated', 'X - Courier Transfer Station (CTS) and POE are not collocated', 'N - Not an ARFCOS shipment']);
  expect(panel.getByLabelText('Armed Forces Courier Ind')).toHaveValue('N');
  expect(panel.getByLabelText('Consolidation Ind/Supply Ind')).toBeDisabled();
  expect(panel.getByLabelText('Consolidation Ind/Supply Ind')).toHaveValue('N');
  expect(panel.getByLabelText('Supply Ind')).toBeDisabled();
  expect(panel.getByLabelText('USML')).toHaveAttribute('readonly');
  expect(panel.getByLabelText('Determination NBR')).toHaveAttribute('readonly');
  expect(panel.getByLabelText('Protective Service Ind 1')).not.toHaveAttribute('readonly');
  for (const n of [2, 3, 4]) expect(panel.getByLabelText(`Protective Service Ind ${n}`)).toHaveAttribute('readonly');
  userEvent.click(panel.getByRole('button', { name: 'Look up DEMIL' }));
  const lookup = within(screen.getByRole('dialog', { name: 'DEMIL Lookup' }));
  expect(lookup.getByText('9 row(s) found.')).toBeInTheDocument();
  userEvent.click(lookup.getByRole('row', { name: /^G USML ITEMS-DEMIL REQUIRED-AMMUNITION/ }));
  userEvent.click(lookup.getByRole('button', { name: 'Select' }));
  expect(panel.getByLabelText('DEMIL')).toHaveValue('G');
});
test('NMFC/UFC is required for commercial modes and 9, not for military modes', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  const marked = () => Boolean(document.querySelector('[data-field="nmfc"] .shared-required-mark'));
  const status = () => document.querySelector('[data-field="status"] input').value;
  for (const [label, value] of [['TCN', 'TRNNMFC0001XXX'], ['Consignor', 'FA5030'], ['CIIC', 'U'], ['NSN', 'NNSN'], ['NMFC/UFC', '']])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  for (const mode of ['J', '5', 'Q', 'B', 'A', '9']) {
    fireEvent.change(screen.getByLabelText('MIL Mode'), { target: { value: mode } });
    expect(marked()).toBe(true);
  }
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(status()).toMatch(/^PI /);
  fireEvent.change(screen.getByLabelText('NMFC/UFC'), { target: { value: '999913' } });
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(status()).toBe('ST - Inchecked Into Surface Freight');
  fireEvent.change(screen.getByLabelText('NMFC/UFC'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('MIL Mode'), { target: { value: 'F' } });
  expect(marked()).toBe(false);
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(status()).toBe('AT - Inchecked Into Air Freight');
});
test('commercial and Mode 9 Edit TCN lists SPE/SMALP data, the DG2 template and T-9 lines in separate sections', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  for (const [label, value] of [['MIL Mode', '9'], ['RDD', ''], ['Consignee', ''], ['Nomen', ''], ['NSN', ''], ['NMFC/UFC', '']])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
  userEvent.selectOptions(screen.getByLabelText('Hazardous/Ammunition Ind'), 'O - Other hazardous');
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  userEvent.click(screen.getByRole('button', { name: 'Edit TCN' }));
  const results = within(screen.getByRole('dialog', { name: 'Consistency Check Results' }));
  expect(results.getByRole('list', { name: 'Missing data' }).textContent).toBe(['NSN', 'CIIC', 'NMFC/UFC', 'RDD (Required for SPE/SMALP)', 'Consignee data (Name or DODAAC is required)', 'Nomenclature', 'Piece data'].join(''));
  expect(results.getByRole('region', { name: 'Hazardous data' })).toHaveTextContent(/TCN '.+' \(loose\) is missing DG\/-2 TEMPLATE ID\.Use Hazardous TCNs to enter data\./);
  expect(results.getByRole('region', { name: 'Miscellaneous data' })).toHaveTextContent(/No miscellaneous data found for TCN '.+'Use Shipment Planning to enter data\./);
  userEvent.click(results.getByRole('button', { name: 'Close' }));
  // A filled-in Ultimate Consignee name stands in for the consignee.
  userEvent.click(screen.getByRole('tab', { name: 'Ultimate Consignee' }));
  fireEvent.change(within(screen.getByRole('tabpanel', { name: 'Ultimate Consignee' })).getByLabelText('Name'), { target: { value: 'MOODY AFB' } });
  userEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  userEvent.click(screen.getByRole('button', { name: 'Edit TCN' }));
  expect(within(screen.getByRole('dialog', { name: 'Consistency Check Results' })).getByRole('list', { name: 'Missing data' })).not.toHaveTextContent('Consignee');
});
test('T-9 Misc adds 26-character lines in order and lets each be edited or deleted', () => {
  render(<Harness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
  userEvent.click(screen.getByLabelText('Misc T-9 Required'));
  userEvent.click(screen.getByRole('tab', { name: 'T-9 Misc' }));
  const panel = () => within(screen.getByRole('tabpanel', { name: 'T-9 Misc' }));
  expect(panel().getByText('No data to display.')).toBeInTheDocument();
  expect(panel().getByRole('button', { name: 'Delete' })).toBeDisabled();
  userEvent.click(panel().getByRole('button', { name: 'New' }));
  let dialog = within(screen.getByRole('dialog', { name: 'T-9 Miscellaneous' }));
  const input = dialog.getByLabelText('T-9 Miscellaneous Entry');
  expect(input).toHaveAttribute('maxLength', '26');
  fireEvent.change(input, { target: { value: 'this is how the t9 is add-ed to the list' } });
  expect(input).toHaveValue('THIS IS HOW THE T9 IS ADD-');
  userEvent.click(dialog.getByRole('button', { name: 'Add T-9 Misc' }));
  expect(input).toHaveValue('');
  fireEvent.change(input, { target: { value: 'ED TO THE T-9 MISCELLANEOU' } });
  userEvent.click(dialog.getByRole('button', { name: 'Add T-9 Misc' }));
  fireEvent.change(input, { target: { value: 'ENTRIES' } });
  userEvent.click(dialog.getByRole('button', { name: 'Save and Close' }));
  expect(screen.queryByRole('dialog', { name: 'T-9 Miscellaneous' })).not.toBeInTheDocument();
  expect(panel().getAllByRole('cell').map(c => c.textContent)).toEqual(['THIS IS HOW THE T9 IS ADD-', 'ED TO THE T-9 MISCELLANEOU', 'ENTRIES']);
  expect(panel().getByText('3 row(s) found.')).toBeInTheDocument();
  userEvent.dblClick(panel().getByRole('row', { name: 'ENTRIES' }));
  dialog = within(screen.getByRole('dialog', { name: 'T-9 Miscellaneous' }));
  fireEvent.change(dialog.getByLabelText('T-9 Miscellaneous Entry'), { target: { value: 'ENTRIES.' } });
  userEvent.click(dialog.getByRole('button', { name: 'Save and Close' }));
  expect(panel().getAllByRole('cell').map(c => c.textContent)).toEqual(['THIS IS HOW THE T9 IS ADD-', 'ED TO THE T-9 MISCELLANEOU', 'ENTRIES.']);
  userEvent.click(panel().getByRole('row', { name: 'ED TO THE T-9 MISCELLANEOU' }));
  userEvent.click(panel().getByRole('button', { name: 'Delete' }));
  expect(panel().getAllByRole('cell').map(c => c.textContent)).toEqual(['THIS IS HOW THE T9 IS ADD-', 'ENTRIES.']);
  userEvent.click(screen.getByRole('tab', { name: 'Pieces' }));
  userEvent.click(screen.getByRole('tab', { name: 'T-9 Misc' }));
  expect(panel().getByText('2 row(s) found.')).toBeInTheDocument();
});

test.each(['cdf', 'outbound'])('%s new shipments default Consignor to FA5030 without changing Consignee', course => {
  render(<Harness course={course} origin={null} />);
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  expect(screen.getByLabelText('Consignor')).toHaveValue('FA5030');
  expect(screen.getByLabelText('Consignee')).toHaveValue('');
  userEvent.click(screen.getByRole('tab', { name: 'Ultimate Consignee' }));
  const block = within(screen.getByRole('tabpanel', { name: 'Ultimate Consignee' }));
  expect(block.getByLabelText('Name')).toHaveValue('');
});

test.each(['Truck Manifest', 'Routings'])('%s defaults its origin address to the FA5030 consignor', name => {
  render(<Harness origin={null} />);
  userEvent.click(screen.getByRole('button', { name, exact: true }));
  userEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
  userEvent.click(screen.getByRole('tab', { name: 'Addresses' }));
  for (const [field, value] of [['DODAAC', 'FA5030'], ['Name', '773 LRS LGRT'], ['Address 1', 'GPC ONLY SHIP TO'], ['Address 2', '5257 FINLETTER AVE'], ['City', 'JBER'], ['State', 'AK'], ['Zip', '99506'], ['Phone Number', '9075522131']]) {
    for (const input of screen.getAllByLabelText(`Origin ${field}`)) expect(input).toHaveValue(value);
  }
});

test.each(['cdf', 'outbound'])('%s opening an existing blank shipment defaults its Consignor', course => {
  render(<Harness course={course} origin="FA5030" />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN TRN001' }));
  expect(screen.getByLabelText('Consignor')).toHaveValue('FA5030');
  expect(screen.getByLabelText('Consignee')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Consignor'), { target: { value: 'FB4427' } });
  expect(screen.getByLabelText('Consignor')).toHaveValue('FB4427');
});

test('switching existing records through the Record dropdown applies the Consignor default', () => {
  function NavigationHarness() {
    const [store, setStore] = useState(() => {
      let next = createRecord(createCmosStore(), 'shipments', { tcn: 'FIRST', origin: '' });
      return createRecord(next, 'shipments', { tcn: 'SECOND', origin: '' });
    });
    return <CmosWorkspace store={store} onChange={setStore} context={{ course: 'cdf', origin: 'FA5030' }} onClose={() => {}} />;
  }
  render(<NavigationHarness />);
  userEvent.click(screen.getByRole('button', { name: 'Open TCN FIRST' }));
  userEvent.selectOptions(screen.getByLabelText('Select record'), 'shipments-2');
  expect(screen.getByLabelText('Consignor')).toHaveValue('FA5030');
});
