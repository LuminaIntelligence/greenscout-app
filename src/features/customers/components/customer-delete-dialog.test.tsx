/**
 * T-024 CustomerDeleteDialog — Vitest + RTL unit tests.
 *
 * Mocks the Server Action, sonner, and `next/navigation` to keep the
 * suite hermetic. Verifies:
 *
 *   - trigger renders with the destructive German "Löschen" label
 *   - clicking the trigger opens the dialog with German title +
 *     description with the customer label substituted
 *   - clicking Cancel closes the dialog without invoking the action
 *   - clicking Confirm calls softDeleteCustomerAction with FormData
 *     containing the customer id
 *   - success: toast.success fires with substituted message,
 *     router.push("/customers") fires, router.refresh() fires
 *   - errorCode "not-found" → red toast with the "not-found" copy,
 *     dialog stays open
 *   - errorCode "server" → red toast with the "server" copy,
 *     dialog stays open
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/customers/actions/soft-delete-customer", () => ({
  softDeleteCustomerAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const routerStub = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};
vi.mock("next/navigation", () => ({
  useRouter: () => routerStub,
}));

import { toast } from "sonner";

import { softDeleteCustomerAction } from "@/features/customers/actions/soft-delete-customer";

import { CustomerDeleteDialog } from "./customer-delete-dialog";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CustomerDeleteDialog", () => {
  it("renders the trigger button with the German 'Löschen' label", () => {
    render(
      <CustomerDeleteDialog customerId="cust-1" customerCompanyName="Hofgut Sonnenwiese GmbH" />,
    );
    expect(screen.getByRole("button", { name: /Löschen/i })).toBeInTheDocument();
  });

  it("opens the dialog with title + description carrying the customer label", async () => {
    const user = userEvent.setup();
    render(
      <CustomerDeleteDialog customerId="cust-1" customerCompanyName="Hofgut Sonnenwiese GmbH" />,
    );

    await user.click(screen.getByRole("button", { name: /Löschen/i }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Kunde löschen?")).toBeInTheDocument();
    // {company} must be substituted, never surface raw to the user.
    expect(screen.queryByText(/\{company\}/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Hofgut Sonnenwiese GmbH wirklich gelöscht werden\?/),
    ).toBeInTheDocument();
  });

  it("clicking Cancel closes the dialog without calling the action", async () => {
    const user = userEvent.setup();
    render(
      <CustomerDeleteDialog customerId="cust-1" customerCompanyName="Hofgut Sonnenwiese GmbH" />,
    );

    await user.click(screen.getByRole("button", { name: /Löschen/i }));
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(softDeleteCustomerAction).not.toHaveBeenCalled();
  });

  it("clicking Confirm forwards a FormData with customerId, fires success toast + redirect", async () => {
    vi.mocked(softDeleteCustomerAction).mockResolvedValueOnce({
      ok: true,
      customerId: "cust-1",
    });

    const user = userEvent.setup();
    render(
      <CustomerDeleteDialog customerId="cust-1" customerCompanyName="Hofgut Sonnenwiese GmbH" />,
    );

    await user.click(screen.getByRole("button", { name: /Löschen/i }));
    await user.click(screen.getByRole("button", { name: "Endgültig löschen" }));

    await waitFor(() => {
      expect(softDeleteCustomerAction).toHaveBeenCalledTimes(1);
    });
    const fd = vi.mocked(softDeleteCustomerAction).mock.calls[0]?.[0] as FormData;
    expect(fd.get("customerId")).toBe("cust-1");

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Hofgut Sonnenwiese GmbH wurde gelöscht.");
    });
    expect(routerStub.refresh).toHaveBeenCalled();
    expect(routerStub.push).toHaveBeenCalledWith("/customers");
  });

  it("shows the 'not-found' German error toast and keeps the dialog open", async () => {
    vi.mocked(softDeleteCustomerAction).mockResolvedValueOnce({
      ok: false,
      errorCode: "not-found",
    });

    const user = userEvent.setup();
    render(
      <CustomerDeleteDialog customerId="cust-1" customerCompanyName="Hofgut Sonnenwiese GmbH" />,
    );

    await user.click(screen.getByRole("button", { name: /Löschen/i }));
    await user.click(screen.getByRole("button", { name: "Endgültig löschen" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Kunde nicht gefunden.");
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(routerStub.push).not.toHaveBeenCalled();
    // Dialog remains open so the user can retry or cancel.
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("shows the 'server' German error toast and keeps the dialog open", async () => {
    vi.mocked(softDeleteCustomerAction).mockResolvedValueOnce({
      ok: false,
      errorCode: "server",
    });

    const user = userEvent.setup();
    render(
      <CustomerDeleteDialog customerId="cust-1" customerCompanyName="Hofgut Sonnenwiese GmbH" />,
    );

    await user.click(screen.getByRole("button", { name: /Löschen/i }));
    await user.click(screen.getByRole("button", { name: "Endgültig löschen" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Beim Löschen ist ein Fehler aufgetreten. Bitte erneut versuchen.",
      );
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(routerStub.push).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
