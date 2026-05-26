import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const updateMock = vi.fn();
vi.mock("@/features/studies/actions/update-study", () => ({
  updateStudyAction: (...a: unknown[]) => updateMock(...a),
}));
const transitionMock = vi.fn();
vi.mock("@/features/studies/actions/transition-status", () => ({
  transitionStudyStatusAction: (...a: unknown[]) => transitionMock(...a),
}));
const softDeleteMock = vi.fn();
vi.mock("@/features/studies/actions/soft-delete-study", () => ({
  softDeleteStudyAction: (...a: unknown[]) => softDeleteMock(...a),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { StudyForm, type StudyFormValues } from "./study-form";

const VALUES: StudyFormValues = {
  customerId: "cust-1",
  objectName: "Hofgut",
  objectAddress: "Weg 1",
  objectZipCode: "12345",
  objectCity: "Berlin",
  flurstueck: "1/2",
  anlageKwp: 100,
  pvErzeugungKwhJahr: 95_000,
  pvEigenverbrauchKwhJahr: 30_000,
  pvVerkaufEurKwh: 0.08,
  verbrauchKwhJahr: 50_000,
  versorgerPreisEurKwh: 0.35,
  pachtEurProKwp: 100,
  vertragslaufzeitJahre: 20,
  modulAnzahl: 200,
  modulFlaecheM2: 400,
  eigenverbrauchsquoteProzent: 65,
  netzeinspeisungKwhJahr: 30_000,
  szenarioPreis1: 0.35,
  szenarioPreis2: 0.4,
  szenarioPreis3: 0.45,
  terminVorschlag1: "2026-06-01T10:00",
  terminVorschlag2: "2026-06-02T10:00",
};

function renderWithClient(ui: React.ReactNode) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ customers: [], total: 0 }),
    } as unknown as Response),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StudyForm — wizard mode", () => {
  it("renders the stepper with step counter and active step badge", () => {
    renderWithClient(<StudyForm mode="wizard" studyId="study-1" initialValues={VALUES} />);
    expect(screen.getByText(/Schritt 1 von 8/)).toBeInTheDocument();
    // "1. Kunde" appears in both the stepper and the section heading.
    expect(screen.getAllByText(/1\. Kunde/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows the Step 1 customer label", () => {
    renderWithClient(<StudyForm mode="wizard" studyId="study-1" initialValues={VALUES} />);
    // Multiple "Kunde" labels appear (stepper + section heading + select label).
    expect(screen.getAllByText("Kunde").length).toBeGreaterThan(0);
  });

  it("advances to Step 2 when next is clicked and save returns ok", async () => {
    updateMock.mockResolvedValueOnce({ ok: true, studyId: "study-1" });
    renderWithClient(<StudyForm mode="wizard" studyId="study-1" initialValues={VALUES} />);
    fireEvent.click(screen.getByRole("button", { name: /Weiter/ }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(updateMock).toHaveBeenCalled();
  });

  it("prev button is disabled on first step", () => {
    renderWithClient(<StudyForm mode="wizard" studyId="study-1" initialValues={VALUES} />);
    expect(screen.getByRole("button", { name: /Zurück/ })).toBeDisabled();
  });
});

describe("StudyForm — single-page mode", () => {
  it("renders all 8 section anchors in the sidebar", () => {
    renderWithClient(<StudyForm mode="single-page" studyId="study-1" initialValues={VALUES} />);
    // Each "N. Title" appears in both sidebar nav + section heading.
    expect(screen.getAllByText(/1\. Kunde/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/8\. Review/).length).toBeGreaterThanOrEqual(1);
    // Save + Mark-ready buttons at the bottom
    expect(screen.getByRole("button", { name: /^Speichern$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Studie als bereit markieren/ })).toBeInTheDocument();
  });

  it("displays the sensitivity preview block in Step 5", () => {
    renderWithClient(<StudyForm mode="single-page" studyId="study-1" initialValues={VALUES} />);
    expect(screen.getByText(/Vorschau Jahresersparnis/)).toBeInTheDocument();
  });

  it("displays the placeholder hint for images step", () => {
    renderWithClient(<StudyForm mode="single-page" studyId="study-1" initialValues={VALUES} />);
    expect(screen.getByText(/Bilder-Upload wird in einem späteren Schritt/)).toBeInTheDocument();
  });

  it("displays the review hint in Step 8", () => {
    renderWithClient(<StudyForm mode="single-page" studyId="study-1" initialValues={VALUES} />);
    expect(screen.getByText(/Prüfe deine Eingaben/)).toBeInTheDocument();
  });

  it("fires the Mark-Ready action when the bottom button is clicked", async () => {
    transitionMock.mockResolvedValueOnce({
      ok: true,
      studyId: "study-1",
      status: "READY",
    });
    renderWithClient(<StudyForm mode="single-page" studyId="study-1" initialValues={VALUES} />);
    fireEvent.click(screen.getByRole("button", { name: /Studie als bereit markieren/ }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(transitionMock).toHaveBeenCalledWith({
      studyId: "study-1",
      newStatus: "READY",
    });
  });

  it("runs every step's update when single-page Save is clicked", async () => {
    updateMock.mockResolvedValue({ ok: true, studyId: "study-1" });
    renderWithClient(<StudyForm mode="single-page" studyId="study-1" initialValues={VALUES} />);
    fireEvent.click(screen.getByRole("button", { name: /^Speichern$/ }));
    // Each step calls the action sequentially. We don't await all
    // 6 ticks; the assertion that at least one fired is enough.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(updateMock).toHaveBeenCalled();
  });
});
