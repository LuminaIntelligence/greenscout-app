/**
 * Co-located RTL tests for the T-022 app-shell Topbar.
 *
 * Covers: brand link, nav rendering, active-state attribution
 * (`aria-current="page"`), user-email display, sign-out menu wiring
 * (opens the dropdown, asserts the Abmelden button).
 *
 * `usePathname` and the `signOutAction` Server Action are mocked so the
 * tests run pure-jsdom without an actual Next router / Auth.js boot.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation BEFORE importing the component so `usePathname`
// resolves to the test stub.
const pathnameRef = { current: "/customers" };
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameRef.current,
}));

// Mock the sign-out Server Action so the form action is a no-op.
vi.mock("@/features/auth/actions/sign-out", () => ({
  signOutAction: vi.fn(async () => undefined),
}));

import { Topbar } from "./topbar";

beforeEach(() => {
  pathnameRef.current = "/customers";
  vi.clearAllMocks();
});

describe("Topbar", () => {
  it("renders the GreenScout brand link pointing at /customers", () => {
    render(<Topbar userEmail="berater@greenscout.de" userRole="BERATER" />);
    const brand = screen.getByRole("link", { name: "GreenScout" });
    expect(brand).toBeInTheDocument();
    expect(brand).toHaveAttribute("href", "/customers");
  });

  it("renders the Kunden nav item", () => {
    render(<Topbar userEmail="berater@greenscout.de" userRole="BERATER" />);
    const link = screen.getByRole("link", { name: "Kunden" });
    expect(link).toHaveAttribute("href", "/customers");
  });

  it('marks the Kunden link as active (aria-current="page") on /customers', () => {
    pathnameRef.current = "/customers";
    render(<Topbar userEmail="berater@greenscout.de" userRole="BERATER" />);
    const link = screen.getByRole("link", { name: "Kunden" });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("marks Kunden as active on a nested customers route (e.g. /customers/abc/edit)", () => {
    pathnameRef.current = "/customers/abc/edit";
    render(<Topbar userEmail="berater@greenscout.de" userRole="BERATER" />);
    const link = screen.getByRole("link", { name: "Kunden" });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("does NOT mark Kunden as active when on an unrelated route", () => {
    pathnameRef.current = "/studies";
    render(<Topbar userEmail="berater@greenscout.de" userRole="BERATER" />);
    const link = screen.getByRole("link", { name: "Kunden" });
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("shows the signed-in user's email on the dropdown trigger", () => {
    render(<Topbar userEmail="berater@greenscout.de" userRole="BERATER" />);
    // The email appears in both a visible span and an sr-only span.
    const matches = screen.getAllByText("berater@greenscout.de");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT show the Nutzer nav link for a BERATER role (T-041a admin-only)", () => {
    render(<Topbar userEmail="berater@greenscout.de" userRole="BERATER" />);
    expect(screen.queryByRole("link", { name: "Nutzer" })).not.toBeInTheDocument();
  });

  it("shows the Nutzer nav link for an ADMIN role (T-041a)", () => {
    render(<Topbar userEmail="admin@greenscout.de" userRole="ADMIN" />);
    const link = screen.getByRole("link", { name: "Nutzer" });
    expect(link).toHaveAttribute("href", "/users");
  });

  it("opens the user menu and exposes the Abmelden submit button when triggered", async () => {
    const user = userEvent.setup();
    render(<Topbar userEmail="berater@greenscout.de" userRole="BERATER" />);

    // Trigger button — the dropdown is portalled, so we look it up by name.
    const trigger = screen.getAllByRole("button")[0]!;
    await user.click(trigger);

    const signOutItem = await screen.findByRole("menuitem", { name: /Abmelden/ });
    expect(signOutItem).toBeInTheDocument();
    // The menuitem renders the actual submit button via `asChild`.
    expect(signOutItem.tagName).toBe("BUTTON");
    expect(signOutItem).toHaveAttribute("type", "submit");
  });
});
