import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockSearchParams = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mockSearchParams),
}));

import { StudiesTable, type StudyListResult } from "./studies-table";

const SAMPLE: StudyListResult = {
  studies: [
    {
      id: "study-1",
      objectName: "Hofgut Sonnenwiese",
      customerLabel: "Hofgut Sonnenwiese GmbH",
      consultantLabel: "Anna Müller",
      status: "DRAFT",
      createdAt: "2026-05-01T10:00:00Z",
      updatedAt: "2026-05-02T10:00:00Z",
    },
    {
      id: "study-2",
      objectName: "Lagerhalle Süd",
      customerLabel: "Berger AG",
      consultantLabel: "Anna Müller",
      status: "READY",
      createdAt: "2026-05-03T10:00:00Z",
      updatedAt: "2026-05-04T10:00:00Z",
    },
    {
      id: "study-3",
      objectName: "Bürogebäude",
      customerLabel: "GmbH X",
      consultantLabel: "Anna Müller",
      status: "GENERATED",
      createdAt: "2026-05-05T10:00:00Z",
      updatedAt: "2026-05-06T10:00:00Z",
    },
  ],
  total: 3,
};

function renderWithClient(ui: React.ReactNode) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE),
    } as unknown as Response),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams = "";
});

describe("StudiesTable", () => {
  it("renders the rows with object names + status badges", () => {
    renderWithClient(
      <StudiesTable
        initialData={SAMPLE}
        initialPage={1}
        initialStatus=""
        showConsultantColumn={false}
      />,
    );
    expect(screen.getByText("Hofgut Sonnenwiese")).toBeInTheDocument();
    expect(screen.getByText("Lagerhalle Süd")).toBeInTheDocument();
    // Three status badges + matching <option> labels in the filter
    // select. The filter-select uses the same wording, so we count
    // matches rather than asserting on a unique node.
    expect(screen.getAllByText("Entwurf").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bereit").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Generiert").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the consultant column for admins", () => {
    renderWithClient(
      <StudiesTable
        initialData={SAMPLE}
        initialPage={1}
        initialStatus=""
        showConsultantColumn={true}
      />,
    );
    expect(screen.getAllByText("Anna Müller").length).toBeGreaterThan(0);
  });

  it("renders the empty-state when no rows", () => {
    renderWithClient(
      <StudiesTable
        initialData={{ studies: [], total: 0 }}
        initialPage={1}
        initialStatus=""
        showConsultantColumn={false}
      />,
    );
    expect(screen.getByText(/Noch keine Studien angelegt/)).toBeInTheDocument();
  });

  it("renders the no-results state when filtered to a status with zero rows", () => {
    mockSearchParams = "status=DRAFT";
    renderWithClient(
      <StudiesTable
        initialData={{ studies: [], total: 0 }}
        initialPage={1}
        initialStatus="DRAFT"
        showConsultantColumn={false}
      />,
    );
    expect(screen.getByText(/Keine Studien gefunden/)).toBeInTheDocument();
  });

  it("renders the pagination summary with localised separator", () => {
    renderWithClient(
      <StudiesTable
        initialData={SAMPLE}
        initialPage={1}
        initialStatus=""
        showConsultantColumn={false}
      />,
    );
    expect(screen.getByText(/1.+3.+von.+3/)).toBeInTheDocument();
  });
});
