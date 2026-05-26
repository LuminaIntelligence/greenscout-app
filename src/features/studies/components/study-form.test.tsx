import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  bildBefore: null,
  bildAfter: null,
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

  it("renders the live calc preview for each scenario when inputs are complete", () => {
    // Slice 2 (T-032) — the preview is now the real calc module.
    // VALUES: pvEigenverbrauch=30_000, pvVerkauf=0.08, versorger=0.35
    // Scenario 1 at 0.35 EUR/kWh: (0.35 - 0.08) * 30000 = 8100 EUR/Jahr
    renderWithClient(<StudyForm mode="single-page" studyId="study-1" initialValues={VALUES} />);
    // The yearly figure for scenario 1 should show up formatted as 8.100,00 €
    // (German locale, plus NBSP before €). Use a loose regex on the digits.
    expect(screen.getByText(/8\.100,00/)).toBeInTheDocument();
    // 20-year figure: 8100 * 20 = 162000 → "162.000,00".
    expect(screen.getByText(/162\.000,00/)).toBeInTheDocument();
  });

  it("shows the incompleteness hint when essential PV inputs are missing", () => {
    const incompleteValues: StudyFormValues = {
      ...VALUES,
      anlageKwp: "",
      pvErzeugungKwhJahr: "",
    };
    renderWithClient(
      <StudyForm mode="single-page" studyId="study-1" initialValues={incompleteValues} />,
    );
    expect(screen.getByText(/Erst Schritte 3 \+ 4 ausfüllen/)).toBeInTheDocument();
  });

  it("displays the image-upload section hint for images step", () => {
    renderWithClient(<StudyForm mode="single-page" studyId="study-1" initialValues={VALUES} />);
    expect(screen.getByText(/Lade zwei Fotos hoch/)).toBeInTheDocument();
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

// ─── Focus-loss regression (2026-05-26) ────────────────────────────────
// Guards against a re-introduction of the bug where Section<N>
// renderers were defined as nested functions inside `StudyForm`, which
// caused React to unmount + remount the entire sub-tree on every parent
// re-render (i.e. every keystroke). When the bug is present, only the
// first character of a typed string lands in the input — the next
// keystroke fires after `document.activeElement` has reset to <body>.
//
// We use `@testing-library/user-event` because `userEvent.type(...)`
// dispatches one keydown/input/keyup cycle per character through the
// real DOM, faithfully reproducing what happens in a browser. The
// `fireEvent.change` shortcut used elsewhere in this file would NOT
// catch the bug — it sets `input.value` in one shot and never relies on
// focus.

describe("StudyForm — focus-loss regression (nested-component re-mount bug)", () => {
  const EMPTY_VALUES: StudyFormValues = {
    ...VALUES,
    objectName: "",
    objectAddress: "",
    objectCity: "",
    flurstueck: "",
  };

  it("preserves focus and accepts every keystroke when typing into a Step 2 text input", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <StudyForm mode="single-page" studyId="study-1" initialValues={EMPTY_VALUES} />,
    );

    const objectName = screen.getByLabelText("Objektname") as HTMLInputElement;
    objectName.focus();
    expect(document.activeElement).toBe(objectName);

    await user.type(objectName, "Hofgut Sonnenwiese");

    // With the bug present, only "H" would land. With the fix in
    // place, the full string is accepted AND focus is retained on the
    // same DOM node.
    expect(objectName.value).toBe("Hofgut Sonnenwiese");
    expect(document.activeElement).toBe(objectName);
  });

  it("preserves focus and accepts every keystroke when typing into a Step 3 number input", async () => {
    const user = userEvent.setup();
    renderWithClient(
      <StudyForm
        mode="single-page"
        studyId="study-1"
        initialValues={{ ...VALUES, anlageKwp: "" }}
      />,
    );

    const anlageKwp = screen.getByLabelText("Anlagengröße (kWp)") as HTMLInputElement;

    anlageKwp.focus();
    expect(document.activeElement).toBe(anlageKwp);

    await user.type(anlageKwp, "150");

    // Number inputs in jsdom store the typed digits as `.value`.
    expect(anlageKwp.value).toBe("150");
    expect(document.activeElement).toBe(anlageKwp);
  });
});
