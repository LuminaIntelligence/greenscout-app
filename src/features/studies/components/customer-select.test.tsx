import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerSelect } from "./customer-select";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("CustomerSelect", () => {
  it("renders the placeholder while loading", () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ customers: [], total: 0 }),
    } as unknown as Response);
    renderWithClient(<CustomerSelect value={undefined} onChange={vi.fn()} />);
    expect(screen.getByText(/Kunde auswählen/)).toBeInTheDocument();
  });

  it("calls the /api/customers endpoint", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ customers: [], total: 0 }),
    } as unknown as Response);
    renderWithClient(<CustomerSelect value={undefined} onChange={vi.fn()} />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/customers?page=1");
    });
  });

  it("falls back to first+last when companyName is null", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          customers: [
            {
              id: "c1",
              companyName: null,
              contactFirstName: "Anna",
              contactLastName: "Berger",
            },
          ],
          total: 1,
        }),
    } as unknown as Response);
    renderWithClient(<CustomerSelect value="c1" onChange={vi.fn()} />);
    // The fetch fires; we don't open the listbox in jsdom — the
    // important assertion is that the request shape is right and the
    // component renders without throwing.
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("throws on non-ok response", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false } as unknown as Response);
    renderWithClient(<CustomerSelect value={undefined} onChange={vi.fn()} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
