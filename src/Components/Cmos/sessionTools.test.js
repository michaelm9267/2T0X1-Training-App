import { openSelectedPlanningTcn } from './planningTestHelpers';
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";
import {
  newOutboundSession,
  exportOutboundSession,
  importOutboundSession,
} from "../Outbound/OutboundTrainer";
import { migrateOutboundCmos } from "./courseAdapters";
import { createRecord, saveRecord } from "./model";
test("Outbound export/import carries partial CMOS records and course progress", () => {
  const s = newOutboundSession({ random: () => 0.8 });
  s.exercises[s.selected].documentViewed = true;
  s.sharedCmos = saveRecord(
    createRecord(migrateOutboundCmos(s), "bills", { waybill: "unfinished" }),
    "bills",
    "bills-1",
  );
  const imported = importOutboundSession(exportOutboundSession(s));
  expect(imported.sharedCmos.bills["bills-1"].saved.waybill).toBe("unfinished");
  expect(imported.exercises[s.selected].documentViewed).toBe(true);
});
test("Outbound import rejects malformed course shapes without replacing current work", () => {
  expect(
    importOutboundSession(
      '{"kind":"outbound-training-session","session":{"version":5,"shipments":[]}}',
    ),
  ).toBeNull();
});
test("storage failure keeps the form usable and reports that browser persistence failed", () => {
  localStorage.clear();
  const spy = jest
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
  try {
    render(<App />);
    userEvent.click(
      screen.getByRole("button", { name: "CMOS workspace", exact: true }),
    );
    userEvent.click(screen.getAllByRole("button", { name: /^Select F/ })[0]);
    userEvent.click(screen.getByRole("button", { name: "Incheck" }));openSelectedPlanningTcn();
    fireEvent.change(screen.getByLabelText("TTAN"), {
      target: { value: "IN MEMORY" },
    });
    userEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
    expect(screen.getByLabelText("TTAN")).toHaveValue("IN MEMORY");
    expect(screen.getByRole("alert")).toHaveTextContent("Browser storage");
  } finally {
    spy.mockRestore();
  }
});
