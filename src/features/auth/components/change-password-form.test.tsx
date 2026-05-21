/**
 * T-019 ChangePasswordForm — Vitest + RTL unit tests.
 *
 * Coverage:
 *   - Renders 3 password fields + checklist (initial neutral) + submit + correct German labels.
 *   - Neutral checklist state on initial render.
 *   - After typing newPassword: checklist flips (hasTyped sticky).
 *   - Submit with passwords-mismatch: FormMessage shows mismatch error;
 *     server action NOT invoked.
 *   - Success → router.push("/").
 *   - wrong-current-password → generic destructive Alert.
 *   - same-as-current → generic destructive Alert.
 *   - rules-not-satisfied → generic destructive Alert.
 *   - locked + lockedUntil → countdown Alert with Lock icon + title.
 *   - server errorCode → generic destructive Alert.
 *   - Loading state: button text flips to "Wird geändert…" while pending.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChangePasswordForm } from "./change-password-form";

vi.mock("@/features/auth/actions/change-password", () => ({
  changePasswordAction: vi.fn(),
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { changePasswordAction } from "@/features/auth/actions/change-password";

const VALID_NEW = "Abc12345!";

async function fillAndSubmit(
  current: string = "OldSecret1!",
  newPw: string = VALID_NEW,
  confirm: string = VALID_NEW,
) {
  await userEvent.type(screen.getByLabelText("Aktuelles Passwort"), current);
  await userEvent.type(screen.getByLabelText("Neues Passwort"), newPw);
  await userEvent.type(screen.getByLabelText("Neues Passwort bestätigen"), confirm);
  await userEvent.click(screen.getByRole("button", { name: "Passwort ändern" }));
}

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 3 password fields + the checklist + submit button in German", () => {
    render(<ChangePasswordForm />);
    expect(screen.getByLabelText("Aktuelles Passwort")).toBeInTheDocument();
    expect(screen.getByLabelText("Neues Passwort")).toBeInTheDocument();
    expect(screen.getByLabelText("Neues Passwort bestätigen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Passwort ändern" })).toBeInTheDocument();
    // PasswordRuleChecklist mounts with all 5 rule labels.
    expect(screen.getByText("Mindestens 8 Zeichen")).toBeInTheDocument();
    expect(screen.getByText("Mindestens ein Großbuchstabe")).toBeInTheDocument();
    expect(screen.getByText("Mindestens ein Kleinbuchstabe")).toBeInTheDocument();
    expect(screen.getByText("Mindestens eine Ziffer")).toBeInTheDocument();
    expect(screen.getByText("Mindestens ein Sonderzeichen")).toBeInTheDocument();
  });

  it("starts the checklist in the neutral state (all 5 rules announce 'noch nicht geprüft')", () => {
    render(<ChangePasswordForm />);
    expect(screen.getAllByText("noch nicht geprüft")).toHaveLength(5);
    expect(screen.queryByText("erfüllt")).not.toBeInTheDocument();
    expect(screen.queryByText("nicht erfüllt")).not.toBeInTheDocument();
  });

  it("flips the checklist out of neutral after the user types into newPassword (sticky hasTyped)", async () => {
    render(<ChangePasswordForm />);
    await userEvent.type(screen.getByLabelText("Neues Passwort"), "a");
    // After 1 char: lower passes, others fail.
    await waitFor(() => {
      expect(screen.getAllByText("nicht erfüllt").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("noch nicht geprüft")).not.toBeInTheDocument();
  });

  it("shows a mismatch FormMessage when newPassword !== confirmNewPassword (server action NOT called)", async () => {
    render(<ChangePasswordForm />);
    await fillAndSubmit("Old1!", VALID_NEW, "DifferentValue7@");

    await waitFor(() => {
      // FormMessage renders the i18n key as-is (no resolver in the form
      // for unknown keys). The mismatch key is the visible text.
      expect(screen.getByText("auth.error.passwords-mismatch")).toBeInTheDocument();
    });
    expect(changePasswordAction).not.toHaveBeenCalled();
  });

  it("successful change navigates to '/' (JWT refresh happens server-side via unstable_update)", async () => {
    vi.mocked(changePasswordAction).mockResolvedValue({ ok: true, initiator: "user-forced" });
    render(<ChangePasswordForm />);
    await fillAndSubmit();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });

  it("wrong-current-password renders the generic destructive Alert", async () => {
    vi.mocked(changePasswordAction).mockResolvedValue({
      ok: false,
      errorCode: "wrong-current-password",
    });
    render(<ChangePasswordForm />);
    await fillAndSubmit();

    await waitFor(() => expect(screen.getByText("Aktuelles Passwort falsch.")).toBeInTheDocument());
    expect(screen.queryByText("Konto gesperrt")).not.toBeInTheDocument();
  });

  it("same-as-current renders the generic destructive Alert", async () => {
    vi.mocked(changePasswordAction).mockResolvedValue({
      ok: false,
      errorCode: "same-as-current",
    });
    render(<ChangePasswordForm />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(
        screen.getByText("Neues Passwort darf nicht dem aktuellen entsprechen."),
      ).toBeInTheDocument(),
    );
  });

  it("rules-not-satisfied renders the generic destructive Alert", async () => {
    vi.mocked(changePasswordAction).mockResolvedValue({
      ok: false,
      errorCode: "rules-not-satisfied",
    });
    render(<ChangePasswordForm />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(
        screen.getByText("Neues Passwort erfüllt nicht alle Anforderungen."),
      ).toBeInTheDocument(),
    );
  });

  it("locked + lockedUntil renders the countdown Alert with Lock title + minutes", async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    vi.mocked(changePasswordAction).mockResolvedValue({
      ok: false,
      errorCode: "locked",
      lockedUntil,
    });
    render(<ChangePasswordForm />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText("Konto gesperrt")).toBeInTheDocument();
      expect(
        screen.getByText(/Konto temporär gesperrt\. Versuche es in \d+ Minuten erneut\./),
      ).toBeInTheDocument();
    });
    // Generic Alert must NOT co-render — lockout takes precedence.
    expect(screen.queryByText("Aktuelles Passwort falsch.")).not.toBeInTheDocument();
  });

  it("locked WITHOUT lockedUntil falls back to a generic server error Alert (defensive)", async () => {
    vi.mocked(changePasswordAction).mockResolvedValue({ ok: false, errorCode: "locked" });
    render(<ChangePasswordForm />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(
        screen.getByText("Anmeldung fehlgeschlagen. Bitte versuche es später erneut."),
      ).toBeInTheDocument(),
    );
  });

  it("server errorCode renders the generic server-error Alert", async () => {
    vi.mocked(changePasswordAction).mockResolvedValue({ ok: false, errorCode: "server" });
    render(<ChangePasswordForm />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(
        screen.getByText("Anmeldung fehlgeschlagen. Bitte versuche es später erneut."),
      ).toBeInTheDocument(),
    );
  });

  it("button shows the loading state ('Wird geändert…') while the action is pending", async () => {
    vi.mocked(changePasswordAction).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, initiator: "user-forced" }), 100),
        ),
    );
    render(<ChangePasswordForm />);
    await fillAndSubmit();

    expect(screen.getByRole("button", { name: "Wird geändert…" })).toBeDisabled();
  });
});
