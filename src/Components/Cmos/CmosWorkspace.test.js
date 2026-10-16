import { openSelectedPlanningTcn } from './planningTestHelpers';
import { useState } from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CmosWorkspace from "./CmosWorkspace";
import { createCmosStore, createRecord, saveRecord } from "./model";
function Harness({ course = "cdf" }) {
  const [store, setStore] = useState(() =>
    createRecord(createCmosStore(), "shipments", { tcn: "TRN001" }),
  );
  return (
    <CmosWorkspace
      store={store}
      onChange={setStore}
      context={{
        course,
        origin: "F00001",
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
  expect(screen.getByRole("status")).toHaveTextContent("Required: tcn");
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
  userEvent.click(screen.getByRole("button", { name: "Print", exact: true }));
  expect(
    screen.getByRole("dialog", { name: "Print Commercial Bill of Lading" }),
  ).not.toHaveAttribute("aria-modal");
  fireEvent.change(screen.getByLabelText("Movement Doc Nbr"), {
    target: { value: "EDIT WITH PRINT OPEN" },
  });
  expect(screen.getByLabelText("Movement Doc Nbr")).toHaveValue(
    "EDIT WITH PRINT OPEN",
  );
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
  expect(within(doc).getByText("TCN TRN001 · Piece 1")).toBeInTheDocument();
  expect(
    within(doc).queryByText("TCN TRN001 · Piece 2"),
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
  userEvent.selectOptions(panel.getByLabelText('Air Dim'), 'Y');
  fireEvent.change(panel.getByLabelText('Protective Service Ind 2'), { target: { value: '3' } });
  expect(panel.getByLabelText('DD Form 1907 Required')).toBeChecked();
  userEvent.click(screen.getByRole('tab', { name: 'Pieces' }));
  userEvent.click(screen.getByRole('tab', { name: 'Indicators' }));
  const reopened = within(screen.getByRole('tabpanel', { name: 'Indicators' }));
  expect(reopened.getByLabelText('Protective Service Ind 2')).toHaveValue('3');
  expect(reopened.getByLabelText('Protective Service Ind 1')).toHaveValue('');
  expect(reopened.getByLabelText('Air Dim')).toHaveValue('Y');
});
