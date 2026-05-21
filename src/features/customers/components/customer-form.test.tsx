/**
 * T-023 CustomerForm — Vitest + RTL unit tests.
 *
 * Mocks Server Actions, sonner, and `next/navigation` to keep the
 * suite hermetic. Verifies:
 *
 *   - all 9 fields render with German labels (create mode)
 *   - required-field validation triggers FormMessage on empty submit
 *   - email-format validation triggers FormMessage on bad email
 *   - successful create: toast.success + router.push("/customers")
 *   - successful edit: initialData pre-fills + toast.success
 *   - validation error from Server Action → maps fieldErrors to RHF
 *   - server errorCode → toast.error (German)
 *   - cancel button → router.push("/customers")
 *   - isPending: submit button shows "Wird gespeichert…" and is disabled
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/customers/actions/create-customer", () => ({
  createCustomerAction: vi.fn(),
}));

vi.mock("@/features/customers/actions/update-customer", () => ({
  updateCustomerAction: vi.fn(),
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

import { createCustomerAction } from "@/features/customers/actions/create-customer";
import { updateCustomerAction } from "@/features/customers/actions/update-customer";

import { CustomerForm } from "./customer-form";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CustomerForm — create mode", () => {
  it("renders the 3 section headings + 9 form fields + 2 action buttons in German", () => {
    render(<CustomerForm mode="create" />);

    // Sections
    expect(screen.getByText("Firma")).toBeInTheDocument();
    expect(screen.getByText("Kontakt")).toBeInTheDocument();
    expect(screen.getByText("Rechnungsadresse")).toBeInTheDocument();

    // Fields
    expect(screen.getByLabelText("Firmenname")).toBeInTheDocument();
    expect(screen.getByLabelText("Vorname")).toBeInTheDocument();
    expect(screen.getByLabelText("Nachname")).toBeInTheDocument();
    expect(screen.getByLabelText("E-Mail-Adresse")).toBeInTheDocument();
    expect(screen.getByLabelText("Telefon")).toBeInTheDocument();
    expect(screen.getByLabelText("Straße + Hausnummer")).toBeInTheDocument();
    expect(screen.getByLabelText("Postleitzahl")).toBeInTheDocument();
    expect(screen.getByLabelText("Stadt")).toBeInTheDocument();
    expect(screen.getByLabelText("Notizen")).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anlegen" })).toBeInTheDocument();
  });

  it("shows required-name validation messages when submitting empty (server action NOT called)", async () => {
    render(<CustomerForm mode="create" />);

    await userEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    // FormMessage renders the raw zod message — i18n keys, since the
    // schema's `min(1, "customers.error.first-name-required")` returns
    // the key as-is. (Same pattern as change-password-form.test.tsx.)
    await waitFor(() => {
      expect(screen.getByText("customers.error.first-name-required")).toBeInTheDocument();
      expect(screen.getByText("customers.error.last-name-required")).toBeInTheDocument();
    });
    expect(createCustomerAction).not.toHaveBeenCalled();
  });

  it("shows the invalid-email message when an invalid email is entered", async () => {
    render(<CustomerForm mode="create" />);

    await userEvent.type(screen.getByLabelText("Vorname"), "Anna");
    await userEvent.type(screen.getByLabelText("Nachname"), "Berger");
    await userEvent.type(screen.getByLabelText("E-Mail-Adresse"), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() => {
      expect(screen.getByText("customers.error.invalid-email")).toBeInTheDocument();
    });
    expect(createCustomerAction).not.toHaveBeenCalled();
  });

  it("on success: toasts 'Kunde angelegt' and navigates to /customers", async () => {
    vi.mocked(createCustomerAction).mockResolvedValue({
      ok: true,
      customerId: "cust-new-1",
    });

    render(<CustomerForm mode="create" />);

    await userEvent.type(screen.getByLabelText("Vorname"), "Anna");
    await userEvent.type(screen.getByLabelText("Nachname"), "Berger");
    await userEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Kunde angelegt");
    });
    expect(routerStub.refresh).toHaveBeenCalled();
    expect(routerStub.push).toHaveBeenCalledWith("/customers");
  });

  it("maps Server Action validation errors back onto the matching FormMessage entries", async () => {
    vi.mocked(createCustomerAction).mockResolvedValue({
      ok: false,
      errorCode: "validation",
      fieldErrors: {
        contactFirstName: "customers.error.first-name-required",
      },
    });

    render(<CustomerForm mode="create" />);

    await userEvent.type(screen.getByLabelText("Vorname"), "Anna");
    await userEvent.type(screen.getByLabelText("Nachname"), "Berger");
    await userEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() => {
      expect(screen.getByText("Vorname ist erforderlich.")).toBeInTheDocument();
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("on server errorCode: toasts the generic server-error message", async () => {
    vi.mocked(createCustomerAction).mockResolvedValue({
      ok: false,
      errorCode: "server",
    });

    render(<CustomerForm mode="create" />);

    await userEvent.type(screen.getByLabelText("Vorname"), "Anna");
    await userEvent.type(screen.getByLabelText("Nachname"), "Berger");
    await userEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Speichern fehlgeschlagen. Bitte versuche es später erneut.",
      );
    });
    expect(routerStub.push).not.toHaveBeenCalled();
  });

  it("on forbidden errorCode: toasts the forbidden message", async () => {
    vi.mocked(createCustomerAction).mockResolvedValue({
      ok: false,
      errorCode: "forbidden",
    });

    render(<CustomerForm mode="create" />);

    await userEvent.type(screen.getByLabelText("Vorname"), "Anna");
    await userEvent.type(screen.getByLabelText("Nachname"), "Berger");
    await userEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Du bist nicht berechtigt, diesen Kunden zu bearbeiten.",
      );
    });
  });

  it("cancel button navigates to /customers without calling the Server Action", async () => {
    render(<CustomerForm mode="create" />);

    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(routerStub.push).toHaveBeenCalledWith("/customers");
    expect(createCustomerAction).not.toHaveBeenCalled();
  });

  it("shows the loading state ('Wird gespeichert…') and disables both buttons while pending", async () => {
    vi.mocked(createCustomerAction).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, customerId: "cust-new-1" }), 100),
        ),
    );

    render(<CustomerForm mode="create" />);

    await userEvent.type(screen.getByLabelText("Vorname"), "Anna");
    await userEvent.type(screen.getByLabelText("Nachname"), "Berger");
    await userEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    expect(screen.getByRole("button", { name: "Wird gespeichert…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
  });
});

describe("CustomerForm — edit mode", () => {
  const INITIAL = {
    companyName: "Hofgut Sonnenwiese GmbH",
    contactFirstName: "Anna",
    contactLastName: "Berger",
    email: "anna@hofgut-sonnenwiese.de",
    phone: "+49 711 1234567",
    billingAddress: "Hauptstraße 12",
    billingZipCode: "70173",
    billingCity: "Stuttgart",
    notes: "Sonnige Süd-Ost-Lage",
  };

  it("pre-fills every field from initialData and shows 'Änderungen speichern'", () => {
    render(<CustomerForm mode="edit" customerId="cust-1" initialData={INITIAL} />);

    expect(screen.getByLabelText("Firmenname")).toHaveValue(INITIAL.companyName);
    expect(screen.getByLabelText("Vorname")).toHaveValue(INITIAL.contactFirstName);
    expect(screen.getByLabelText("Nachname")).toHaveValue(INITIAL.contactLastName);
    expect(screen.getByLabelText("E-Mail-Adresse")).toHaveValue(INITIAL.email);
    expect(screen.getByLabelText("Telefon")).toHaveValue(INITIAL.phone);
    expect(screen.getByLabelText("Straße + Hausnummer")).toHaveValue(INITIAL.billingAddress);
    expect(screen.getByLabelText("Postleitzahl")).toHaveValue(INITIAL.billingZipCode);
    expect(screen.getByLabelText("Stadt")).toHaveValue(INITIAL.billingCity);
    expect(screen.getByLabelText("Notizen")).toHaveValue(INITIAL.notes);
    expect(screen.getByRole("button", { name: "Änderungen speichern" })).toBeInTheDocument();
  });

  it("calls updateCustomerAction with the customerId on submit and toasts 'Änderungen gespeichert'", async () => {
    vi.mocked(updateCustomerAction).mockResolvedValue({
      ok: true,
      customerId: "cust-1",
    });

    render(<CustomerForm mode="edit" customerId="cust-1" initialData={INITIAL} />);

    // Mutate one field then submit
    const lastName = screen.getByLabelText("Nachname");
    await userEvent.clear(lastName);
    await userEvent.type(lastName, "Berger-Neumann");

    await userEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));

    await waitFor(() => {
      expect(updateCustomerAction).toHaveBeenCalledWith(
        "cust-1",
        expect.objectContaining({ contactLastName: "Berger-Neumann" }),
      );
    });
    expect(toast.success).toHaveBeenCalledWith("Änderungen gespeichert");
    expect(routerStub.push).toHaveBeenCalledWith("/customers");
  });

  it("on not-found errorCode (edit only): toasts the not-found message", async () => {
    vi.mocked(updateCustomerAction).mockResolvedValue({
      ok: false,
      errorCode: "not-found",
    });

    render(<CustomerForm mode="edit" customerId="cust-1" initialData={INITIAL} />);

    await userEvent.clear(screen.getByLabelText("Nachname"));
    await userEvent.type(screen.getByLabelText("Nachname"), "Berger-Neumann");
    await userEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Kunde nicht gefunden.");
    });
  });
});
