import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const deactivateMock = vi.fn();
vi.mock("@/features/users/actions/deactivate-user", () => ({
  deactivateUserAction: (...args: unknown[]) => deactivateMock(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { UserDeactivateDialog } from "./user-deactivate-dialog";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UserDeactivateDialog", () => {
  it("renders the trigger button with the deactivate label", () => {
    render(<UserDeactivateDialog userId="user-1" userDisplayName="Anna B." />);
    expect(screen.getByRole("button", { name: /Deaktivieren/ })).toBeInTheDocument();
  });

  it("interpolates the user display name into the description", () => {
    render(<UserDeactivateDialog userId="user-1" userDisplayName="Anna B." />);
    fireEvent.click(screen.getByRole("button", { name: /Deaktivieren/ }));
    expect(screen.getByText(/Anna B\./)).toBeInTheDocument();
  });

  it("calls the action on confirm and surfaces success", async () => {
    deactivateMock.mockResolvedValueOnce({ ok: true, userId: "user-1" });
    render(<UserDeactivateDialog userId="user-1" userDisplayName="Anna B." />);
    fireEvent.click(screen.getByRole("button", { name: /Deaktivieren/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Deaktivieren$/ }));
    await Promise.resolve();
    await Promise.resolve();
    expect(deactivateMock).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("surfaces not-found errorCode as the matching toast", async () => {
    deactivateMock.mockResolvedValueOnce({ ok: false, errorCode: "not-found" });
    render(<UserDeactivateDialog userId="user-1" userDisplayName="Anna B." />);
    fireEvent.click(screen.getByRole("button", { name: /Deaktivieren/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Deaktivieren$/ }));
    await Promise.resolve();
    await Promise.resolve();
    expect(toastError).toHaveBeenCalled();
  });

  it("surfaces self-deactivate errorCode as a toast", async () => {
    deactivateMock.mockResolvedValueOnce({ ok: false, errorCode: "self-deactivate" });
    render(<UserDeactivateDialog userId="user-1" userDisplayName="Anna B." />);
    fireEvent.click(screen.getByRole("button", { name: /Deaktivieren/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Deaktivieren$/ }));
    await Promise.resolve();
    await Promise.resolve();
    expect(toastError).toHaveBeenCalled();
  });

  it("surfaces forbidden errorCode as a toast", async () => {
    deactivateMock.mockResolvedValueOnce({ ok: false, errorCode: "forbidden" });
    render(<UserDeactivateDialog userId="user-1" userDisplayName="Anna B." />);
    fireEvent.click(screen.getByRole("button", { name: /Deaktivieren/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Deaktivieren$/ }));
    await Promise.resolve();
    await Promise.resolve();
    expect(toastError).toHaveBeenCalled();
  });

  it("surfaces server errorCode as a toast", async () => {
    deactivateMock.mockResolvedValueOnce({ ok: false, errorCode: "server" });
    render(<UserDeactivateDialog userId="user-1" userDisplayName="Anna B." />);
    fireEvent.click(screen.getByRole("button", { name: /Deaktivieren/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Deaktivieren$/ }));
    await Promise.resolve();
    await Promise.resolve();
    expect(toastError).toHaveBeenCalled();
  });
});
