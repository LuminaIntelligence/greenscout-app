import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const createMock = vi.fn();
vi.mock("@/features/studies/actions/create-study", () => ({
  createStudyAction: (...args: unknown[]) => createMock(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

import { NewStudyButton } from "./new-study-button";

function renderWithClient(ui: React.ReactNode) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ customers: [], total: 0 }),
  } as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NewStudyButton", () => {
  it("renders the German trigger label", () => {
    renderWithClient(<NewStudyButton />);
    expect(screen.getByRole("button", { name: "Neue Studie" })).toBeInTheDocument();
  });

  it("opens the dialog with title + cancel", async () => {
    renderWithClient(<NewStudyButton />);
    fireEvent.click(screen.getByRole("button", { name: "Neue Studie" }));
    await waitFor(() => expect(screen.getAllByText(/Neue Studie/).length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Studie anlegen" })).toBeInTheDocument();
  });

  it("shows validation error if customer is not picked", async () => {
    renderWithClient(<NewStudyButton />);
    fireEvent.click(screen.getByRole("button", { name: "Neue Studie" }));
    fireEvent.click(screen.getByRole("button", { name: "Studie anlegen" }));
    await waitFor(() => expect(screen.getByText("Kunde ist erforderlich.")).toBeInTheDocument());
    expect(createMock).not.toHaveBeenCalled();
  });
});
