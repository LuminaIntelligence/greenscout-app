import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const createMock = vi.fn();
const updateMock = vi.fn();
vi.mock("@/features/users/actions/create-user", () => ({
  createUserAction: (...args: unknown[]) => createMock(...args),
}));
vi.mock("@/features/users/actions/update-user", () => ({
  updateUserAction: (...args: unknown[]) => updateMock(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { UserForm } from "./user-form";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UserForm — create mode", () => {
  it("renders the create-mode fields (editable email + name fields + role radios)", () => {
    render(<UserForm mode="create" onCreated={() => undefined} />);
    expect(screen.getByLabelText(/E-Mail-Adresse/)).toBeEnabled();
    expect(screen.getByLabelText(/Vorname/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nachname/)).toBeInTheDocument();
    expect(screen.getByText(/Berater/)).toBeInTheDocument();
    expect(screen.getByText(/Admin/)).toBeInTheDocument();
  });

  it("calls onCreated on a successful create + shows success toast", async () => {
    createMock.mockResolvedValueOnce({
      ok: true,
      userId: "user-new",
      tempPassword: "temp-pw-stub",
    });
    const onCreated = vi.fn();
    render(<UserForm mode="create" onCreated={onCreated} />);
    fireEvent.change(screen.getByLabelText(/E-Mail-Adresse/), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Vorname/), { target: { value: "Anna" } });
    fireEvent.change(screen.getByLabelText(/Nachname/), { target: { value: "Beispiel" } });
    fireEvent.click(screen.getByRole("button", { name: /Anlegen/ }));
    await waitFor(() => {
      expect(createMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith({ userId: "user-new", tempPassword: "temp-pw-stub" });
    });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("surfaces email-taken errorCode as an error toast", async () => {
    createMock.mockResolvedValueOnce({ ok: false, errorCode: "email-taken" });
    render(<UserForm mode="create" onCreated={() => undefined} />);
    fireEvent.change(screen.getByLabelText(/E-Mail-Adresse/), {
      target: { value: "x@y.com" },
    });
    fireEvent.change(screen.getByLabelText(/Vorname/), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText(/Nachname/), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: /Anlegen/ }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
  });

  it("maps server-side validation field errors back onto the form", async () => {
    createMock.mockResolvedValueOnce({
      ok: false,
      errorCode: "validation",
      fieldErrors: { email: "users.error.email-invalid" },
    });
    render(<UserForm mode="create" onCreated={() => undefined} />);
    fireEvent.change(screen.getByLabelText(/E-Mail-Adresse/), {
      target: { value: "x@y.com" },
    });
    fireEvent.change(screen.getByLabelText(/Vorname/), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText(/Nachname/), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: /Anlegen/ }));
    await waitFor(() => {
      expect(createMock).toHaveBeenCalled();
    });
  });

  it("surfaces forbidden errorCode as an error toast", async () => {
    createMock.mockResolvedValueOnce({ ok: false, errorCode: "forbidden" });
    render(<UserForm mode="create" onCreated={() => undefined} />);
    fireEvent.change(screen.getByLabelText(/E-Mail-Adresse/), {
      target: { value: "x@y.com" },
    });
    fireEvent.change(screen.getByLabelText(/Vorname/), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText(/Nachname/), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: /Anlegen/ }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
  });

  it("surfaces server errorCode as an error toast", async () => {
    createMock.mockResolvedValueOnce({ ok: false, errorCode: "server" });
    render(<UserForm mode="create" onCreated={() => undefined} />);
    fireEvent.change(screen.getByLabelText(/E-Mail-Adresse/), {
      target: { value: "x@y.com" },
    });
    fireEvent.change(screen.getByLabelText(/Vorname/), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText(/Nachname/), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: /Anlegen/ }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
  });
});

describe("UserForm — edit mode", () => {
  const initialData = {
    email: "user@example.com",
    firstName: "Anna",
    lastName: "Beispiel",
    role: "BERATER" as const,
  };

  it("renders the edit-mode fields with email read-only", () => {
    render(<UserForm mode="edit" userId="user-1" initialData={initialData} />);
    const email = screen.getByLabelText(/E-Mail-Adresse/);
    expect(email).toBeDisabled();
    expect(email).toHaveValue("user@example.com");
  });

  it("renders the prefilled name fields", () => {
    render(<UserForm mode="edit" userId="user-1" initialData={initialData} />);
    expect(screen.getByLabelText(/Vorname/)).toHaveValue("Anna");
    expect(screen.getByLabelText(/Nachname/)).toHaveValue("Beispiel");
  });

  it("calls updateUserAction on submit + shows success toast", async () => {
    updateMock.mockResolvedValueOnce({ ok: true, userId: "user-1" });
    render(<UserForm mode="edit" userId="user-1" initialData={initialData} />);
    fireEvent.change(screen.getByLabelText(/Vorname/), { target: { value: "Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /Änderungen speichern/ }));
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({
        userId: "user-1",
        data: expect.objectContaining({ firstName: "Updated" }),
      });
    });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("surfaces not-found errorCode in edit mode as an error toast", async () => {
    updateMock.mockResolvedValueOnce({ ok: false, errorCode: "not-found" });
    render(<UserForm mode="edit" userId="user-1" initialData={initialData} />);
    fireEvent.change(screen.getByLabelText(/Vorname/), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: /Änderungen speichern/ }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
  });

  it("maps server-side validation field errors in edit mode", async () => {
    updateMock.mockResolvedValueOnce({
      ok: false,
      errorCode: "validation",
      fieldErrors: { firstName: "users.error.first-name-required" },
    });
    render(<UserForm mode="edit" userId="user-1" initialData={initialData} />);
    fireEvent.change(screen.getByLabelText(/Vorname/), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: /Änderungen speichern/ }));
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
    });
  });
});
