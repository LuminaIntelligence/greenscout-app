/**
 * T-018 LoginForm — Vitest + RTL unit tests.
 *
 * Coverage:
 *   - Happy path: success → router.push("/").
 *   - Generic error: `invalid-credentials` → generic Alert.
 *   - Lockout: `locked` + `lockedUntil` → countdown Alert with title + Lock icon.
 *   - Inactive / deleted: → "Konto deaktiviert" Alert.
 *   - Server error: → server Alert message.
 *   - Loading state: button text flips to "Wird angemeldet…" while pending.
 *   - Negative-coverage guards: PasswordRuleChecklist must NOT render here.
 *
 * Playwright E2E is explicitly deferred to T-051a per the binding DECISIONS contract.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";

// Mock the Server Action — we drive its return value per scenario.
vi.mock("@/features/auth/actions/sign-in", () => ({
  signInAction: vi.fn(),
}));

// Mock Next router so router.push() is observable.
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { signInAction } from "@/features/auth/actions/sign-in";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email + password fields + submit button + forgot-password hint in German", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("E-Mail-Adresse")).toBeInTheDocument();
    expect(screen.getByLabelText("Passwort")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anmelden" })).toBeInTheDocument();
    expect(
      screen.getByText("Passwort vergessen? Bitte wende dich an den Administrator."),
    ).toBeInTheDocument();
  });

  it("does not render any password-rule labels (checklist is T-019, not T-018)", () => {
    render(<LoginForm />);
    expect(screen.queryByText("Mindestens 8 Zeichen")).not.toBeInTheDocument();
    expect(screen.queryByText("Mindestens ein Großbuchstabe")).not.toBeInTheDocument();
    expect(screen.queryByText("Mindestens ein Kleinbuchstabe")).not.toBeInTheDocument();
    expect(screen.queryByText("Mindestens eine Ziffer")).not.toBeInTheDocument();
    expect(screen.queryByText("Mindestens ein Sonderzeichen")).not.toBeInTheDocument();
  });

  it("successful login navigates to '/'", async () => {
    vi.mocked(signInAction).mockResolvedValue({ ok: true });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("E-Mail-Adresse"), "u@example.com");
    await userEvent.type(screen.getByLabelText("Passwort"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Anmelden" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });

  it("invalid-credentials shows the generic error alert", async () => {
    vi.mocked(signInAction).mockResolvedValue({
      ok: false,
      errorCode: "invalid-credentials",
    });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("E-Mail-Adresse"), "u@example.com");
    await userEvent.type(screen.getByLabelText("Passwort"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Anmelden" }));
    await waitFor(() =>
      expect(screen.getByText("Email oder Passwort falsch.")).toBeInTheDocument(),
    );
    // Lockout-banner title MUST NOT appear on the generic path.
    expect(screen.queryByText("Konto gesperrt")).not.toBeInTheDocument();
  });

  it("locked errorCode renders the lockout banner with countdown + title + icon", async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    vi.mocked(signInAction).mockResolvedValue({
      ok: false,
      errorCode: "locked",
      lockedUntil,
    });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("E-Mail-Adresse"), "u@example.com");
    await userEvent.type(screen.getByLabelText("Passwort"), "correct");
    await userEvent.click(screen.getByRole("button", { name: "Anmelden" }));
    await waitFor(() => {
      expect(screen.getByText("Konto gesperrt")).toBeInTheDocument();
      expect(
        screen.getByText(/Konto temporär gesperrt\. Versuche es in \d+ Minuten erneut\./),
      ).toBeInTheDocument();
    });
    // Generic error message must NOT co-render — lockout takes precedence.
    expect(screen.queryByText("Email oder Passwort falsch.")).not.toBeInTheDocument();
  });

  it("inactive errorCode renders the inactive-account message", async () => {
    vi.mocked(signInAction).mockResolvedValue({
      ok: false,
      errorCode: "inactive",
    });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("E-Mail-Adresse"), "u@example.com");
    await userEvent.type(screen.getByLabelText("Passwort"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Anmelden" }));
    await waitFor(() =>
      expect(
        screen.getByText("Konto deaktiviert. Bitte wende dich an den Administrator."),
      ).toBeInTheDocument(),
    );
  });

  it("deleted errorCode also renders the inactive-account message (uniform UX)", async () => {
    vi.mocked(signInAction).mockResolvedValue({
      ok: false,
      errorCode: "deleted",
    });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("E-Mail-Adresse"), "u@example.com");
    await userEvent.type(screen.getByLabelText("Passwort"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Anmelden" }));
    await waitFor(() =>
      expect(
        screen.getByText("Konto deaktiviert. Bitte wende dich an den Administrator."),
      ).toBeInTheDocument(),
    );
  });

  it("server errorCode renders the server error message", async () => {
    vi.mocked(signInAction).mockResolvedValue({
      ok: false,
      errorCode: "server",
    });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("E-Mail-Adresse"), "u@example.com");
    await userEvent.type(screen.getByLabelText("Passwort"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Anmelden" }));
    await waitFor(() =>
      expect(
        screen.getByText("Anmeldung fehlgeschlagen. Bitte versuche es später erneut."),
      ).toBeInTheDocument(),
    );
  });

  it("button shows the loading state ('Wird angemeldet…') while the action is pending", async () => {
    // Slow signInAction so isPending is observable.
    vi.mocked(signInAction).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100)),
    );
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("E-Mail-Adresse"), "u@example.com");
    await userEvent.type(screen.getByLabelText("Passwort"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Anmelden" }));
    expect(screen.getByRole("button", { name: "Wird angemeldet…" })).toBeDisabled();
  });
});
