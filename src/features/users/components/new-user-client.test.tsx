import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/users/actions/create-user", () => ({
  createUserAction: vi.fn(),
}));
vi.mock("@/features/users/actions/update-user", () => ({
  updateUserAction: vi.fn(),
}));

import { NewUserClient } from "./new-user-client";

describe("NewUserClient", () => {
  it("renders the UserForm in create mode (no temp-password dialog initially)", () => {
    render(<NewUserClient />);
    // The form fields prove we're in create mode (email is editable).
    expect(screen.getByLabelText(/E-Mail-Adresse/)).toBeInTheDocument();
    // The temp-password dialog is gated on a successful create; the
    // title "Temporäres Passwort" must not be present yet.
    expect(screen.queryByText("Temporäres Passwort")).not.toBeInTheDocument();
  });
});
