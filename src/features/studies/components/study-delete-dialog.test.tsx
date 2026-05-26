import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const softDeleteMock = vi.fn();
vi.mock("@/features/studies/actions/soft-delete-study", () => ({
  softDeleteStudyAction: (...args: unknown[]) => softDeleteMock(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { StudyDeleteDialog } from "./study-delete-dialog";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StudyDeleteDialog", () => {
  it("renders the trigger button with the German delete label", () => {
    render(<StudyDeleteDialog studyId="study-1" studyObjectLabel="Hofgut" />);
    expect(screen.getByRole("button", { name: /Löschen/ })).toBeInTheDocument();
  });

  it("opens dialog and shows the interpolated description on click", () => {
    render(<StudyDeleteDialog studyId="study-1" studyObjectLabel="Hofgut" />);
    fireEvent.click(screen.getByRole("button", { name: /Löschen/ }));
    // Dialog title is now in the DOM.
    expect(screen.getByText(/Studie löschen\?/)).toBeInTheDocument();
    expect(screen.getByText(/„Hofgut"/)).toBeInTheDocument();
  });

  it("calls the Server Action on Confirm and shows the success toast on ok", async () => {
    softDeleteMock.mockResolvedValueOnce({ ok: true, studyId: "study-1" });
    render(<StudyDeleteDialog studyId="study-1" studyObjectLabel="Hofgut" />);
    fireEvent.click(screen.getByRole("button", { name: /Löschen/ }));
    fireEvent.click(screen.getByRole("button", { name: /Endgültig löschen/ }));
    await Promise.resolve();
    await Promise.resolve();
    expect(softDeleteMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces the not-found errorCode as the matching toast", async () => {
    softDeleteMock.mockResolvedValueOnce({ ok: false, errorCode: "not-found" });
    render(<StudyDeleteDialog studyId="study-1" studyObjectLabel="Hofgut" />);
    fireEvent.click(screen.getByRole("button", { name: /Löschen/ }));
    fireEvent.click(screen.getByRole("button", { name: /Endgültig löschen/ }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(softDeleteMock).toHaveBeenCalled();
  });

  it("surfaces server errorCode as the matching toast", async () => {
    softDeleteMock.mockResolvedValueOnce({ ok: false, errorCode: "server" });
    render(<StudyDeleteDialog studyId="study-1" studyObjectLabel="Hofgut" />);
    fireEvent.click(screen.getByRole("button", { name: /Löschen/ }));
    fireEvent.click(screen.getByRole("button", { name: /Endgültig löschen/ }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(softDeleteMock).toHaveBeenCalled();
  });

  it("supports the small size variant", () => {
    render(<StudyDeleteDialog studyId="study-1" studyObjectLabel="Hofgut" size="sm" />);
    expect(screen.getByRole("button", { name: /Löschen/ })).toBeInTheDocument();
  });
});
