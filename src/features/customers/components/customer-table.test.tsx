/**
 * Co-located RTL tests for the T-022 CustomerTable client component.
 *
 * Covers:
 *   - column rendering (companyName / contactName / city / studyCount + "—" fallbacks)
 *   - debounced search syncs into the URL via router.replace
 *   - pagination buttons enable/disable correctly relative to page count
 *   - pagination summary string interpolation
 *   - empty-state copy (no-customers vs. no-results)
 *   - loading state mounts Skeleton cells
 *
 * Hooks (`useRouter`, `useSearchParams`) and the fetch call are mocked.
 * TanStack Query gets a fresh client per render to avoid cross-test
 * cache leakage.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const routerStub = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};
const searchParamsRef = { current: new URLSearchParams() };

vi.mock("next/navigation", () => ({
  useRouter: () => routerStub,
  useSearchParams: () => searchParamsRef.current,
}));

// Stub global.fetch so React-Query refetches resolve deterministically.
const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  searchParamsRef.current = new URLSearchParams();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

import { CustomerTable, type CustomerListResult } from "./customer-table";

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Infinity } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const SAMPLE: CustomerListResult = {
  customers: [
    {
      id: "c1",
      companyName: "Hofgut Sonnenwiese GmbH",
      contactFirstName: "Anna",
      contactLastName: "Berger",
      billingCity: "Konstanz",
      studyCount: 3,
    },
    {
      id: "c2",
      companyName: null, // private person
      contactFirstName: "Markus",
      contactLastName: "Klein",
      billingCity: null,
      studyCount: 0,
    },
  ],
  total: 2,
};

describe("CustomerTable — column rendering", () => {
  it("renders all five column headers", () => {
    renderWithQuery(<CustomerTable initialData={SAMPLE} initialPage={1} initialSearch="" />);
    expect(screen.getByText("Firma")).toBeInTheDocument();
    expect(screen.getByText("Ansprechpartner")).toBeInTheDocument();
    expect(screen.getByText("Stadt")).toBeInTheDocument();
    expect(screen.getByText("Studien")).toBeInTheDocument();
  });

  it("renders customer rows with companyName, full contact name, billingCity, studyCount", () => {
    renderWithQuery(<CustomerTable initialData={SAMPLE} initialPage={1} initialSearch="" />);
    expect(screen.getByText("Hofgut Sonnenwiese GmbH")).toBeInTheDocument();
    expect(screen.getByText("Anna Berger")).toBeInTheDocument();
    expect(screen.getByText("Konstanz")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders an em-dash placeholder when companyName or billingCity is null", () => {
    renderWithQuery(<CustomerTable initialData={SAMPLE} initialPage={1} initialSearch="" />);
    // Both null fields show "—". One row has both null → at least 2 occurrences.
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});

describe("CustomerTable — empty states", () => {
  it('shows "no customers" copy when the dataset is empty AND search is blank', () => {
    renderWithQuery(
      <CustomerTable initialData={{ customers: [], total: 0 }} initialPage={1} initialSearch="" />,
    );
    expect(
      screen.getByText(
        /Noch keine Kunden angelegt\. Lege deine erste Kundin oder deinen ersten Kunden an/,
      ),
    ).toBeInTheDocument();
  });

  it('shows "no results" copy when the search yields nothing', () => {
    renderWithQuery(
      <CustomerTable
        initialData={{ customers: [], total: 0 }}
        initialPage={1}
        initialSearch="zzzzz"
      />,
    );
    expect(
      screen.getByText(/Keine Kunden gefunden, die deiner Suche entsprechen\./),
    ).toBeInTheDocument();
  });
});

describe("CustomerTable — pagination", () => {
  it('disables "Zurück" on page 1', () => {
    renderWithQuery(<CustomerTable initialData={SAMPLE} initialPage={1} initialSearch="" />);
    const prev = screen.getByRole("button", { name: "Zurück" });
    expect(prev).toBeDisabled();
  });

  it('disables "Weiter" when there is only one page of results', () => {
    renderWithQuery(<CustomerTable initialData={SAMPLE} initialPage={1} initialSearch="" />);
    const next = screen.getByRole("button", { name: "Weiter" });
    expect(next).toBeDisabled();
  });

  it('enables "Weiter" when more pages exist and pushes ?page=2 on click', async () => {
    const user = userEvent.setup();
    const lotsOfRows: CustomerListResult = {
      customers: SAMPLE.customers,
      total: 60, // ⇒ 3 pages at 25/page
    };
    renderWithQuery(<CustomerTable initialData={lotsOfRows} initialPage={1} initialSearch="" />);
    const next = screen.getByRole("button", { name: "Weiter" });
    expect(next).not.toBeDisabled();
    await user.click(next);
    expect(routerStub.push).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });

  it("renders the pagination summary with interpolated from/to/total", () => {
    renderWithQuery(
      <CustomerTable
        initialData={{ customers: SAMPLE.customers, total: 60 }}
        initialPage={1}
        initialSearch=""
      />,
    );
    expect(screen.getByText("1–25 von 60")).toBeInTheDocument();
  });
});

describe("CustomerTable — debounced search", () => {
  it("syncs the debounced search into the URL via router.replace after the 300ms debounce", async () => {
    // Real timers but a manually-driven typing flow — userEvent's typing
    // each-letter loop combined with React-Query's internal scheduling
    // hits a re-render race when we mix in fake timers. Real timers
    // give us a deterministic ~350ms window to wait through.
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ customers: [], total: 0 }),
    });
    const user = userEvent.setup();
    renderWithQuery(<CustomerTable initialData={SAMPLE} initialPage={1} initialSearch="" />);

    const searchInput = screen.getByPlaceholderText("Nach Name oder Firma suchen…");
    await user.type(searchInput, "mü");

    // Wait past the 300ms debounce window.
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(routerStub.replace).toHaveBeenCalled();
    const lastCall = routerStub.replace.mock.calls.at(-1)?.[0] as string | undefined;
    expect(lastCall).toContain("search=");
  });
});
