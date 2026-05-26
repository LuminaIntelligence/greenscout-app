import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/features/users/actions/deactivate-user", () => ({
  deactivateUserAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { UsersTable, type UserRow } from "./users-table";

const ROWS: UserRow[] = [
  {
    id: "user-1",
    email: "anna@example.com",
    firstName: "Anna",
    lastName: "Beispiel",
    role: "BERATER",
    active: true,
    createdAt: new Date("2026-01-15T10:00:00Z").toISOString(),
    isSelf: false,
  },
  {
    id: "user-2",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "Test",
    role: "ADMIN",
    active: true,
    createdAt: new Date("2026-02-01T10:00:00Z").toISOString(),
    isSelf: true,
  },
  {
    id: "user-3",
    email: "inactive@example.com",
    firstName: "Inactive",
    lastName: "User",
    role: "BERATER",
    active: false,
    createdAt: new Date("2026-03-01T10:00:00Z").toISOString(),
    isSelf: false,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UsersTable", () => {
  it("renders one row per user with name + email", () => {
    render(<UsersTable initialData={ROWS} />);
    expect(screen.getByText("Anna Beispiel")).toBeInTheDocument();
    expect(screen.getByText("anna@example.com")).toBeInTheDocument();
    expect(screen.getByText("Admin Test")).toBeInTheDocument();
  });

  it("renders the role badge for ADMIN vs BERATER differently", () => {
    render(<UsersTable initialData={ROWS} />);
    // Both badges resolve to the German role labels.
    expect(screen.getAllByText("Berater").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
  });

  it("renders the active vs inactive state badges", () => {
    render(<UsersTable initialData={ROWS} />);
    // "Aktiv" appears in the filter dropdown + on each active row badge.
    // "Deaktiviert" appears in the filter dropdown + on the inactive row.
    expect(screen.getAllByText("Aktiv").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Deaktiviert").length).toBeGreaterThan(0);
  });

  it("hides the deactivate button on the row that matches the current admin (isSelf)", () => {
    render(<UsersTable initialData={ROWS} />);
    // user-2 is `isSelf: true` — that row must not show the Deaktivieren
    // button. user-1 (also active, not self) should.
    const deactivateButtons = screen.getAllByRole("button", { name: /Deaktivieren/ });
    // user-1 only, user-2 hidden, user-3 already inactive so also hidden.
    expect(deactivateButtons.length).toBe(1);
  });

  it("filters by role via the role <select>", () => {
    render(<UsersTable initialData={ROWS} />);
    fireEvent.change(screen.getByLabelText(/Rolle/), { target: { value: "ADMIN" } });
    expect(screen.queryByText("Anna Beispiel")).not.toBeInTheDocument();
    expect(screen.getByText("Admin Test")).toBeInTheDocument();
  });

  it("filters by active state via the state <select>", () => {
    render(<UsersTable initialData={ROWS} />);
    fireEvent.change(screen.getByLabelText(/Status/), { target: { value: "inactive" } });
    expect(screen.queryByText("Anna Beispiel")).not.toBeInTheDocument();
    expect(screen.getByText("Inactive User")).toBeInTheDocument();
  });

  it("filters by name/email via the search input", () => {
    render(<UsersTable initialData={ROWS} />);
    const search = screen.getByPlaceholderText(/E-Mail/);
    fireEvent.change(search, { target: { value: "anna" } });
    expect(screen.getByText("Anna Beispiel")).toBeInTheDocument();
    expect(screen.queryByText("Admin Test")).not.toBeInTheDocument();
  });

  it("shows the empty-state message when filters yield zero rows", () => {
    render(<UsersTable initialData={ROWS} />);
    const search = screen.getByPlaceholderText(/E-Mail/);
    fireEvent.change(search, { target: { value: "nonexistent" } });
    expect(screen.getByText(/Noch keine Nutzer angelegt/)).toBeInTheDocument();
  });

  it("renders the edit link pointing at /users/<id>/edit", () => {
    render(<UsersTable initialData={ROWS} />);
    const links = screen.getAllByRole("link", { name: /Bearbeiten/ });
    expect(links.length).toBe(ROWS.length);
    expect(links[0]).toHaveAttribute("href", "/users/user-1/edit");
  });

  it("formats the created-at date in German DD.MM.YYYY format", () => {
    render(<UsersTable initialData={ROWS} />);
    // 2026-01-15 → 15.01.2026
    expect(screen.getByText("15.01.2026")).toBeInTheDocument();
  });

  it("renders '—' when createdAt parses to NaN", () => {
    render(
      <UsersTable
        initialData={[
          {
            id: "user-bad",
            email: "x@y.com",
            firstName: "X",
            lastName: "Y",
            role: "BERATER",
            active: true,
            createdAt: "not-a-date",
            isSelf: false,
          },
        ]}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
