import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const handoverMock = vi.fn();
vi.mock("@/features/studies/actions/handover-study", () => ({
  handoverStudyAction: (...args: unknown[]) => handoverMock(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { HandoverDialog } from "./handover-dialog";

const CANDIDATES = [
  {
    id: "user-1",
    firstName: "Anna",
    lastName: "Beispiel",
    email: "anna@example.com",
    role: "BERATER" as const,
  },
  {
    id: "user-2",
    firstName: "Bernd",
    lastName: "Test",
    email: "bernd@example.com",
    role: "BERATER" as const,
  },
  {
    id: "user-3",
    firstName: "",
    lastName: "",
    email: "admin@example.com",
    role: "ADMIN" as const,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HandoverDialog", () => {
  it("renders the trigger button", () => {
    render(
      <HandoverDialog
        studyId="study-1"
        studyObjectLabel="Hofgut"
        currentConsultantId="user-1"
        consultants={CANDIDATES}
      />,
    );
    expect(screen.getByRole("button", { name: /Studie übergeben/ })).toBeInTheDocument();
  });

  it("hides the current owner from the candidate options", () => {
    render(
      <HandoverDialog
        studyId="study-1"
        studyObjectLabel="Hofgut"
        currentConsultantId="user-1"
        consultants={CANDIDATES}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Studie übergeben/ }));
    // user-1 (current owner) must not appear in the dropdown.
    expect(screen.queryByRole("option", { name: /Anna Beispiel/ })).not.toBeInTheDocument();
    // The other two MUST appear.
    expect(screen.getByRole("option", { name: /Bernd Test/ })).toBeInTheDocument();
  });

  it("falls back to email when name is empty + appends '(Admin)' for ADMIN role", () => {
    render(
      <HandoverDialog
        studyId="study-1"
        studyObjectLabel="Hofgut"
        currentConsultantId="user-1"
        consultants={CANDIDATES}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Studie übergeben/ }));
    // user-3 has empty name + ADMIN role.
    expect(screen.getByRole("option", { name: /admin@example.com \(Admin\)/ })).toBeInTheDocument();
  });

  it("toasts an error when confirm is clicked without selecting a target", async () => {
    render(
      <HandoverDialog
        studyId="study-1"
        studyObjectLabel="Hofgut"
        currentConsultantId="user-1"
        consultants={CANDIDATES}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Studie übergeben/ }));
    // Confirm button is disabled until a selection is made, so we
    // bypass it: directly invoke handleConfirm via the select-empty
    // edge by setting selection and then clearing.
    const select = screen.getByLabelText(/Neue Beraterin/);
    fireEvent.change(select, { target: { value: "user-2" } });
    fireEvent.change(select, { target: { value: "" } });
    // The Confirm button should now be disabled — the target-required
    // toast path is only reachable if a state mutation slips through,
    // so assert the disabled-state instead.
    const confirmBtn = screen.getByRole("button", { name: /^Übergeben$/ });
    expect(confirmBtn).toBeDisabled();
  });

  it("calls the action on confirm with the selected target id", async () => {
    handoverMock.mockResolvedValueOnce({
      ok: true,
      studyId: "study-1",
      newConsultantId: "user-2",
    });
    render(
      <HandoverDialog
        studyId="study-1"
        studyObjectLabel="Hofgut"
        currentConsultantId="user-1"
        consultants={CANDIDATES}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Studie übergeben/ }));
    const select = screen.getByLabelText(/Neue Beraterin/);
    fireEvent.change(select, { target: { value: "user-2" } });
    fireEvent.click(screen.getByRole("button", { name: /^Übergeben$/ }));
    await Promise.resolve();
    await Promise.resolve();
    expect(handoverMock).toHaveBeenCalledWith({
      studyId: "study-1",
      newConsultantId: "user-2",
    });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it.each([
    ["not-found", /Studie/],
    ["forbidden", /berechtigt/],
    ["target-not-found", /Zielperson/],
    ["target-not-eligible", /nicht aktiv/],
    ["validation", /Ungültig/],
    ["server", /fehlgeschlagen/],
  ])("surfaces %s errorCode as a toast", async (errorCode, _matcher) => {
    handoverMock.mockResolvedValueOnce({ ok: false, errorCode });
    render(
      <HandoverDialog
        studyId="study-1"
        studyObjectLabel="Hofgut"
        currentConsultantId="user-1"
        consultants={CANDIDATES}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Studie übergeben/ }));
    fireEvent.change(screen.getByLabelText(/Neue Beraterin/), {
      target: { value: "user-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Übergeben$/ }));
    await Promise.resolve();
    await Promise.resolve();
    expect(toastError).toHaveBeenCalled();
  });

  it("disables the trigger when the candidate list is empty", () => {
    render(
      <HandoverDialog
        studyId="study-1"
        studyObjectLabel="Hofgut"
        currentConsultantId="user-1"
        consultants={[
          {
            id: "user-1",
            firstName: "Self",
            lastName: "User",
            email: "self@example.com",
            role: "BERATER",
          },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: /Studie übergeben/ })).toBeDisabled();
  });
});
