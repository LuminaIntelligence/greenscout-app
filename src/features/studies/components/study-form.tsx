"use client";

/**
 * T-026 + T-027 StudyForm — shared client component for both the
 * 8-step wizard and the anchored single-page layout.
 *
 * Mode contract:
 *   - `mode="wizard"`: stepper UI, prev/next buttons, autosave on
 *     "Weiter" via `updateStudyAction`.
 *   - `mode="single-page"`: every section rendered at once with a
 *     sticky left anchor nav. Save button at the bottom runs the
 *     `updateStudyAction` for every section sequentially.
 *
 * The form holds the full study state in one RHF instance. Per-step
 * "Weiter" picks the matching step's zod schema for client-side
 * validation, then posts that step's slice to the Server Action
 * (which re-validates server-side, defence-in-depth).
 *
 * Step 8 "Studie als bereit markieren" calls `transitionStudyStatusAction`
 * with `DRAFT → READY`, which gates on `studyFullSchema` server-side.
 *
 * Focus-loss regression fix (2026-05-26): the eight `Section<N>`
 * renderers were originally defined as *nested* functions inside this
 * component. Every parent re-render — including the one that fires
 * after every keystroke via `setValues` — produced fresh component
 * identities, which forced React to unmount + remount the entire
 * sub-tree. That tore the focused `<input>` element out of the DOM,
 * `document.activeElement` reset to `<body>`, and the next keystroke
 * landed nowhere. All sections now live at module scope and receive
 * their state through explicit props, so the input identity is stable
 * across re-renders.
 *
 * @see DECISIONS.md → Wizard-Step layout (decision #5)
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { softDeleteStudyAction as _softDeleteStudyAction } from "@/features/studies/actions/soft-delete-study";
import { transitionStudyStatusAction } from "@/features/studies/actions/transition-status";
import { type StudyStepKey, updateStudyAction } from "@/features/studies/actions/update-study";
import { SENSITIVITY_DEFAULTS } from "@/features/studies/schemas/step5-sensitivity";
import { CustomerSelect } from "@/features/studies/components/customer-select";
import {
  StudyImageUpload,
  type UploadedImageInfo,
} from "@/features/studies/components/study-image-upload";
import { t, type TranslationKey } from "@/i18n/de";
import { composeAll, type StudyCalcInput } from "@/lib/calculations";

// Silence the unused-import warning until F2 dashboard wires it.
void _softDeleteStudyAction;

/**
 * One-source-of-truth form values. All numeric values stay `number`
 * to match the zod schemas' output types.
 */
export interface StudyFormValues {
  customerId: string;
  objectName: string;
  objectAddress: string;
  objectZipCode: string;
  objectCity: string;
  flurstueck: string;
  anlageKwp: number | "";
  pvErzeugungKwhJahr: number | "";
  pvEigenverbrauchKwhJahr: number | "";
  pvVerkaufEurKwh: number | "";
  verbrauchKwhJahr: number | "";
  versorgerPreisEurKwh: number | "";
  pachtEurProKwp: number | "";
  vertragslaufzeitJahre: number | "";
  modulAnzahl: number | "";
  modulFlaecheM2: number | "";
  eigenverbrauchsquoteProzent: number | "";
  netzeinspeisungKwhJahr: number | "";
  szenarioPreis1: number | "";
  szenarioPreis2: number | "";
  szenarioPreis3: number | "";
  terminVorschlag1: string;
  terminVorschlag2: string;
  bildBefore: UploadedImageInfo | null;
  bildAfter: UploadedImageInfo | null;
}

export const STEP_KEYS: readonly StudyStepKey[] = [
  "step1",
  "step2",
  "step3",
  "step4",
  "step5",
  "step6",
] as const;

// Step 7 (images) and Step 8 (review) sit on top of the 6 data steps.
// The wizard treats them as additional positions in the stepper, but
// they don't post via `updateStudyAction` — Step 7 is a placeholder
// for T-029a and Step 8 is the read-only review + status-transition.
export const WIZARD_STEP_TITLES: readonly TranslationKey[] = [
  "studies.wizard.step1.title",
  "studies.wizard.step2.title",
  "studies.wizard.step3.title",
  "studies.wizard.step4.title",
  "studies.wizard.step5.title",
  "studies.wizard.step6.title",
  "studies.wizard.step7.title",
  "studies.wizard.step8.title",
];

export interface StudyFormProps {
  mode: "wizard" | "single-page";
  studyId: string;
  initialValues: StudyFormValues;
}

/**
 * Shared props every Section component receives from the parent.
 * Replaces the closure-capture that the previous in-line sections
 * relied on. `patch` is the field-level setter; sections never see
 * the raw `setValues` setter.
 *
 * `studyId` is required by Section7Bilder's image-upload widget so it
 * can target the right study on the upload endpoint. The other
 * sections ignore it.
 */
interface SectionRenderProps {
  values: StudyFormValues;
  stepErrors: Record<string, string>;
  patch: <K extends keyof StudyFormValues>(field: K, value: StudyFormValues[K]) => void;
  isPending: boolean;
  studyId: string;
}

export function StudyForm({ mode, studyId, initialValues }: StudyFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<StudyFormValues>(initialValues);
  const [stepIndex, setStepIndex] = useState(0); // 0..7 (8 steps)
  const [isPending, startTransition] = useTransition();
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  function patch<K extends keyof StudyFormValues>(field: K, value: StudyFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function dataForStep(key: StudyStepKey): Record<string, unknown> {
    switch (key) {
      case "step1":
        return { customerId: values.customerId };
      case "step2":
        return {
          objectName: values.objectName,
          objectAddress: values.objectAddress,
          objectZipCode: values.objectZipCode,
          objectCity: values.objectCity,
          flurstueck: values.flurstueck,
        };
      case "step3":
        return {
          anlageKwp: values.anlageKwp,
          pvErzeugungKwhJahr: values.pvErzeugungKwhJahr,
          pvEigenverbrauchKwhJahr: values.pvEigenverbrauchKwhJahr,
          pvVerkaufEurKwh: values.pvVerkaufEurKwh,
          verbrauchKwhJahr: values.verbrauchKwhJahr,
          versorgerPreisEurKwh: values.versorgerPreisEurKwh,
          pachtEurProKwp: values.pachtEurProKwp,
          vertragslaufzeitJahre: values.vertragslaufzeitJahre,
        };
      case "step4":
        return {
          modulAnzahl: values.modulAnzahl,
          modulFlaecheM2: values.modulFlaecheM2,
          eigenverbrauchsquoteProzent: values.eigenverbrauchsquoteProzent,
          netzeinspeisungKwhJahr: values.netzeinspeisungKwhJahr,
        };
      case "step5":
        return {
          szenarioPreis1: values.szenarioPreis1,
          szenarioPreis2: values.szenarioPreis2,
          szenarioPreis3: values.szenarioPreis3,
        };
      case "step6":
        return {
          terminVorschlag1: values.terminVorschlag1,
          terminVorschlag2: values.terminVorschlag2,
        };
    }
  }

  async function saveStep(key: StudyStepKey): Promise<boolean> {
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await updateStudyAction({
          studyId,
          stepKey: key,
          data: dataForStep(key),
        });
        if (result.ok) {
          setStepErrors({});
          resolve(true);
        } else if (result.errorCode === "validation" && result.fieldErrors) {
          setStepErrors(result.fieldErrors);
          resolve(false);
        } else {
          const errKey: TranslationKey =
            result.errorCode === "not-found"
              ? "studies.error.not-found"
              : result.errorCode === "forbidden"
                ? "studies.error.forbidden"
                : "studies.error.server";
          toast.error(t(errKey));
          resolve(false);
        }
      });
    });
  }

  async function handleNext() {
    // Step 7 + Step 8 have no data-posting; the wizard advances
    // without calling the Server Action.
    if (stepIndex >= 6) {
      setStepIndex((i) => Math.min(i + 1, WIZARD_STEP_TITLES.length - 1));
      return;
    }
    const key = STEP_KEYS[stepIndex];
    if (key === undefined) return;
    const ok = await saveStep(key);
    if (ok) {
      toast.success(t("studies.toast.updated"));
      setStepIndex((i) => Math.min(i + 1, WIZARD_STEP_TITLES.length - 1));
    }
  }

  function handlePrev() {
    setStepIndex((i) => Math.max(0, i - 1));
    setStepErrors({});
  }

  async function handleSaveAll() {
    // Single-page mode: post every step sequentially. First failure
    // short-circuits.
    for (const key of STEP_KEYS) {
      const ok = await saveStep(key);
      if (!ok) {
        return;
      }
    }
    toast.success(t("studies.toast.updated"));
    router.refresh();
  }

  async function handleMarkReady() {
    startTransition(async () => {
      const result = await transitionStudyStatusAction({
        studyId,
        newStatus: "READY",
      });
      if (result.ok) {
        toast.success(t("studies.toast.ready"));
        router.refresh();
        router.push("/studies");
        return;
      }
      if (result.errorCode === "incomplete") {
        toast.error(t("studies.error.incomplete"));
        return;
      }
      if (result.errorCode === "invalid-transition") {
        toast.error(t("studies.error.invalid-transition"));
        return;
      }
      const errKey: TranslationKey =
        result.errorCode === "not-found"
          ? "studies.error.not-found"
          : result.errorCode === "forbidden"
            ? "studies.error.forbidden"
            : "studies.error.server";
      toast.error(t(errKey));
    });
  }

  // ─── Section renderers ────────────────────────────────────────────
  // Sections are defined at module scope (see bottom of file) so that
  // their identity is stable across re-renders. Without this, typing
  // into any input fires `setValues` → re-renders parent → fresh
  // nested-component identity → React unmounts + remounts the sub-tree
  // → focused input is torn out → next keystroke lands nowhere.

  const sectionProps: SectionRenderProps = { values, stepErrors, patch, isPending, studyId };
  const sectionRenderers: ReadonlyArray<(props: SectionRenderProps) => React.JSX.Element> = [
    Section1Kunde,
    Section2Objekt,
    Section3PvInputs,
    Section4Modul,
    Section5Sensitivity,
    Section6Termine,
    Section7Bilder,
    Section8Review,
  ];

  if (mode === "single-page") {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-3 font-heading text-lg text-forest-green">
            {t("studies.single-page.nav-heading")}
          </h2>
          <ol className="space-y-2 text-sm">
            {WIZARD_STEP_TITLES.map((titleKey, idx) => (
              <li key={titleKey}>
                <a className="text-link hover:underline" href={`#section-${idx + 1}`}>
                  {idx + 1}. {t(titleKey)}
                </a>
              </li>
            ))}
          </ol>
        </aside>
        <div className="space-y-6">
          {sectionRenderers.map((Renderer, idx) => (
            <Card key={idx} id={`section-${idx + 1}`}>
              <CardContent className="pt-6">
                <h3 className="mb-4 font-heading text-lg text-forest-green">
                  {idx + 1}. {t(WIZARD_STEP_TITLES[idx] as TranslationKey)}
                </h3>
                <Renderer {...sectionProps} />
              </CardContent>
            </Card>
          ))}
          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={() => handleSaveAll()}
              disabled={isPending}
              className="bg-plant-green text-white hover:bg-plant-green/90"
            >
              {isPending ? t("studies.action.saving") : t("studies.action.save")}
            </Button>
            <Button variant="outline" onClick={() => handleMarkReady()} disabled={isPending}>
              {t("studies.action.mark-ready")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── wizard mode ──
  const ActiveSection = sectionRenderers[stepIndex] ?? sectionRenderers[0]!;
  const isLastStep = stepIndex === WIZARD_STEP_TITLES.length - 1;
  return (
    <div className="space-y-6">
      <Stepper currentIndex={stepIndex} />
      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 font-heading text-xl text-forest-green">
            {stepIndex + 1}. {t(WIZARD_STEP_TITLES[stepIndex] as TranslationKey)}
          </h2>
          <ActiveSection {...sectionProps} />
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={isPending || stepIndex === 0}>
          {t("studies.action.previous")}
        </Button>
        {isLastStep ? (
          <Button
            onClick={handleMarkReady}
            disabled={isPending}
            className="bg-plant-green text-white hover:bg-plant-green/90"
          >
            {t("studies.action.mark-ready")}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={isPending}
            className="bg-plant-green text-white hover:bg-plant-green/90"
          >
            {isPending ? t("studies.action.saving") : t("studies.action.next")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Section renderers (module-scope; stable identity across renders) ──

function Section1Kunde({ values, stepErrors, patch, isPending }: SectionRenderProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="customerId">{t("studies.field.customer")}</Label>
      <CustomerSelect
        value={values.customerId || undefined}
        onChange={(next) => patch("customerId", next)}
        disabled={isPending}
      />
      <FieldError name="customerId" errors={stepErrors} />
    </div>
  );
}

function Section2Objekt({ values, stepErrors, patch }: SectionRenderProps) {
  return (
    <div className="space-y-4">
      <Field
        label={t("studies.field.object-name")}
        name="objectName"
        value={values.objectName}
        onChange={(v) => patch("objectName", v)}
        errors={stepErrors}
      />
      <Field
        label={t("studies.field.object-address")}
        name="objectAddress"
        value={values.objectAddress}
        onChange={(v) => patch("objectAddress", v)}
        errors={stepErrors}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label={t("studies.field.object-zip")}
          name="objectZipCode"
          value={values.objectZipCode}
          onChange={(v) => patch("objectZipCode", v)}
          errors={stepErrors}
          className="sm:col-span-1"
        />
        <Field
          label={t("studies.field.object-city")}
          name="objectCity"
          value={values.objectCity}
          onChange={(v) => patch("objectCity", v)}
          errors={stepErrors}
          className="sm:col-span-2"
        />
      </div>
      <Field
        label={t("studies.field.flurstueck")}
        name="flurstueck"
        value={values.flurstueck}
        onChange={(v) => patch("flurstueck", v)}
        errors={stepErrors}
      />
    </div>
  );
}

function Section3PvInputs({ values, stepErrors, patch }: SectionRenderProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <NumberField
        label={t("studies.field.anlage-kwp")}
        name="anlageKwp"
        value={values.anlageKwp}
        onChange={(v) => patch("anlageKwp", v)}
        errors={stepErrors}
      />
      <NumberField
        label={t("studies.field.pv-erzeugung")}
        name="pvErzeugungKwhJahr"
        value={values.pvErzeugungKwhJahr}
        onChange={(v) => patch("pvErzeugungKwhJahr", v)}
        errors={stepErrors}
      />
      <NumberField
        label={t("studies.field.pv-eigenverbrauch")}
        name="pvEigenverbrauchKwhJahr"
        value={values.pvEigenverbrauchKwhJahr}
        onChange={(v) => patch("pvEigenverbrauchKwhJahr", v)}
        errors={stepErrors}
      />
      <NumberField
        label={t("studies.field.pv-verkauf")}
        name="pvVerkaufEurKwh"
        value={values.pvVerkaufEurKwh}
        onChange={(v) => patch("pvVerkaufEurKwh", v)}
        errors={stepErrors}
        step="0.001"
      />
      <NumberField
        label={t("studies.field.verbrauch")}
        name="verbrauchKwhJahr"
        value={values.verbrauchKwhJahr}
        onChange={(v) => patch("verbrauchKwhJahr", v)}
        errors={stepErrors}
      />
      <NumberField
        label={t("studies.field.versorger-preis")}
        name="versorgerPreisEurKwh"
        value={values.versorgerPreisEurKwh}
        onChange={(v) => patch("versorgerPreisEurKwh", v)}
        errors={stepErrors}
        step="0.001"
      />
      <NumberField
        label={t("studies.field.pacht")}
        name="pachtEurProKwp"
        value={values.pachtEurProKwp}
        onChange={(v) => patch("pachtEurProKwp", v)}
        errors={stepErrors}
      />
      <NumberField
        label={t("studies.field.vertragslaufzeit")}
        name="vertragslaufzeitJahre"
        value={values.vertragslaufzeitJahre}
        onChange={(v) => patch("vertragslaufzeitJahre", v)}
        errors={stepErrors}
        step="1"
      />
    </div>
  );
}

function Section4Modul({ values, stepErrors, patch }: SectionRenderProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <NumberField
        label={t("studies.field.modul-anzahl")}
        name="modulAnzahl"
        value={values.modulAnzahl}
        onChange={(v) => patch("modulAnzahl", v)}
        errors={stepErrors}
        step="1"
      />
      <NumberField
        label={t("studies.field.modul-flaeche")}
        name="modulFlaecheM2"
        value={values.modulFlaecheM2}
        onChange={(v) => patch("modulFlaecheM2", v)}
        errors={stepErrors}
      />
      <NumberField
        label={t("studies.field.eigenverbrauchsquote")}
        name="eigenverbrauchsquoteProzent"
        value={values.eigenverbrauchsquoteProzent}
        onChange={(v) => patch("eigenverbrauchsquoteProzent", v)}
        errors={stepErrors}
        step="0.1"
      />
      <NumberField
        label={t("studies.field.netzeinspeisung")}
        name="netzeinspeisungKwhJahr"
        value={values.netzeinspeisungKwhJahr}
        onChange={(v) => patch("netzeinspeisungKwhJahr", v)}
        errors={stepErrors}
      />
    </div>
  );
}

function Section5Sensitivity({ values, stepErrors, patch }: SectionRenderProps) {
  // Slice 2 (T-032) — replaced the simplified stub with the
  // authoritative TS calc module. Each scenario substitutes its
  // ct/kWh price into `versorgerPreisEurKwh` and runs composeAll()
  // to derive the yearly + 20-year savings.
  const baseInput = buildCalcInput(values);
  const inputsComplete = isCalcInputComplete(values);

  function previewForScenario(price: number | ""): { yearly: number; total: number } | null {
    if (!inputsComplete || price === "" || price <= 0) {
      return null;
    }
    const scenarioInput: StudyCalcInput = {
      ...baseInput,
      versorgerPreisEurKwh: price,
    };
    const derived = composeAll(scenarioInput);
    return { yearly: derived.ersparnisProJahr, total: derived.ersparnis20Jahre };
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("studies.hint.sensitivity")}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NumberField
          label={t("studies.field.szenario-preis-1")}
          name="szenarioPreis1"
          value={values.szenarioPreis1}
          onChange={(v) => patch("szenarioPreis1", v)}
          errors={stepErrors}
          step="0.01"
        />
        <NumberField
          label={t("studies.field.szenario-preis-2")}
          name="szenarioPreis2"
          value={values.szenarioPreis2}
          onChange={(v) => patch("szenarioPreis2", v)}
          errors={stepErrors}
          step="0.01"
        />
        <NumberField
          label={t("studies.field.szenario-preis-3")}
          name="szenarioPreis3"
          value={values.szenarioPreis3}
          onChange={(v) => patch("szenarioPreis3", v)}
          errors={stepErrors}
          step="0.01"
        />
      </div>
      <div className="mt-2 space-y-1 text-sm">
        {inputsComplete ? (
          <>
            <p className="text-muted-foreground">{t("studies.hint.sensitivity-preview")}</p>
            <ScenarioRow
              label={t("studies.field.szenario-preis-1")}
              price={values.szenarioPreis1}
              preview={previewForScenario(values.szenarioPreis1)}
              duration={baseInput.vertragslaufzeitJahre}
            />
            <ScenarioRow
              label={t("studies.field.szenario-preis-2")}
              price={values.szenarioPreis2}
              preview={previewForScenario(values.szenarioPreis2)}
              duration={baseInput.vertragslaufzeitJahre}
            />
            <ScenarioRow
              label={t("studies.field.szenario-preis-3")}
              price={values.szenarioPreis3}
              preview={previewForScenario(values.szenarioPreis3)}
              duration={baseInput.vertragslaufzeitJahre}
            />
          </>
        ) : (
          <p className="italic text-muted-foreground">{t("studies.hint.sensitivity-incomplete")}</p>
        )}
      </div>
    </div>
  );
}

function Section6Termine({ values, stepErrors, patch, isPending }: SectionRenderProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="terminVorschlag1">{t("studies.field.termin-vorschlag-1")}</Label>
        <Input
          id="terminVorschlag1"
          type="datetime-local"
          value={values.terminVorschlag1}
          onChange={(e) => patch("terminVorschlag1", e.target.value)}
          disabled={isPending}
        />
        <FieldError name="terminVorschlag1" errors={stepErrors} />
      </div>
      <div>
        <Label htmlFor="terminVorschlag2">{t("studies.field.termin-vorschlag-2")}</Label>
        <Input
          id="terminVorschlag2"
          type="datetime-local"
          value={values.terminVorschlag2}
          onChange={(e) => patch("terminVorschlag2", e.target.value)}
          disabled={isPending}
        />
        <FieldError name="terminVorschlag2" errors={stepErrors} />
      </div>
    </div>
  );
}

function Section7Bilder({ values, patch, isPending, studyId }: SectionRenderProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("studies.hint.images-placeholder")}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StudyImageUpload
          studyId={studyId}
          kind="BEFORE"
          currentImage={values.bildBefore}
          onUploaded={(image) => patch("bildBefore", image)}
          disabled={isPending}
        />
        <StudyImageUpload
          studyId={studyId}
          kind="AFTER"
          currentImage={values.bildAfter}
          onUploaded={(image) => patch("bildAfter", image)}
          disabled={isPending}
        />
      </div>
    </div>
  );
}

function Section8Review({ values }: SectionRenderProps) {
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">{t("studies.hint.review")}</p>
      <Separator />
      <SummaryRow label={t("studies.field.object-name")} value={values.objectName} />
      <SummaryRow label={t("studies.field.object-address")} value={values.objectAddress} />
      <SummaryRow
        label={t("studies.field.object-zip") + " / " + t("studies.field.object-city")}
        value={`${values.objectZipCode} ${values.objectCity}`.trim()}
      />
      <SummaryRow label={t("studies.field.flurstueck")} value={values.flurstueck} />
      <SummaryRow label={t("studies.field.anlage-kwp")} value={String(values.anlageKwp)} />
      <SummaryRow
        label={t("studies.field.pv-erzeugung")}
        value={String(values.pvErzeugungKwhJahr)}
      />
      <SummaryRow label={t("studies.field.termin-vorschlag-1")} value={values.terminVorschlag1} />
      <SummaryRow label={t("studies.field.termin-vorschlag-2")} value={values.terminVorschlag2} />
    </div>
  );
}

// ─── Small helpers (kept in-file to avoid widening the export surface) ──

function Stepper({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">
        {t("studies.wizard.step")
          .replace("{current}", String(currentIndex + 1))
          .replace("{total}", String(WIZARD_STEP_TITLES.length))}
      </span>
      {WIZARD_STEP_TITLES.map((titleKey, idx) => (
        <span
          key={titleKey}
          className={
            idx === currentIndex
              ? "rounded bg-plant-green px-2 py-1 text-white"
              : idx < currentIndex
                ? "rounded bg-muted-lime px-2 py-1 text-forest-green"
                : "rounded bg-muted px-2 py-1 text-muted-foreground"
          }
        >
          {idx + 1}. {t(titleKey)}
        </span>
      ))}
    </div>
  );
}

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (next: string) => void;
  errors: Record<string, string>;
  className?: string;
}

function Field({ label, name, value, onChange, errors, className }: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} value={value} onChange={(e) => onChange(e.target.value)} />
      <FieldError name={name} errors={errors} />
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  name: string;
  value: number | "";
  onChange: (next: number | "") => void;
  errors: Record<string, string>;
  step?: string;
}

function NumberField({ label, name, value, onChange, errors, step }: NumberFieldProps) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        inputMode="decimal"
        step={step ?? "0.01"}
        value={value === "" ? "" : value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") onChange("");
          else {
            const parsed = Number(raw);
            onChange(Number.isFinite(parsed) ? parsed : "");
          }
        }}
      />
      <FieldError name={name} errors={errors} />
    </div>
  );
}

function FieldError({ name, errors }: { name: string; errors: Record<string, string> }) {
  const messageKey = errors[name];
  if (!messageKey) return null;
  const isKnownKey = messageKey.startsWith("studies.error.");
  const message = isKnownKey ? t(messageKey as TranslationKey) : messageKey;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[200px_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">
        {value && value.length > 0 ? value : t("studies.review.summary-empty")}
      </dd>
    </div>
  );
}

function numericOrZero(value: number | ""): number {
  return value === "" ? 0 : value;
}

function formatEuro(value: number): string {
  // German-locale: 1.234,56 € — non-breaking space ( ) before €
  // per SPEC §8.3.
  const fixed = value.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withThousand = (intPart ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousand},${decPart} €`;
}

interface ScenarioRowProps {
  label: string;
  price: number | "";
  preview: { yearly: number; total: number } | null;
  duration: number;
}

function ScenarioRow({ label, price, preview, duration }: ScenarioRowProps) {
  const priceLabel =
    price === "" ? t("studies.hint.sensitivity-price-empty") : `${formatPrice(price)} / kWh`;
  if (!preview) {
    return (
      <p>
        <span className="font-medium">{label}</span> ({priceLabel}):{" "}
        <span className="italic text-muted-foreground">
          {t("studies.hint.sensitivity-incomplete")}
        </span>
      </p>
    );
  }
  return (
    <p>
      <span className="font-medium">{label}</span> ({priceLabel}): {formatEuro(preview.yearly)} /
      Jahr · {formatEuro(preview.total)} / {duration} {t("studies.field.vertragslaufzeit")}
    </p>
  );
}

function formatPrice(value: number): string {
  // German-locale price formatting with 2-4 decimals depending on
  // magnitude. Sensitivity prices are typically 0.35 EUR/kWh.
  const fixed = value.toFixed(value < 1 ? 2 : 4);
  return `${fixed.replace(".", ",")} €`;
}

/**
 * Slice 2 — required inputs for the Step 5 calc preview to render
 * meaningful numbers. Returns false if any of the four PV economics
 * inputs is missing; the UI surfaces a hint in that case.
 */
function isCalcInputComplete(v: StudyFormValues): boolean {
  return (
    v.anlageKwp !== "" &&
    v.pvErzeugungKwhJahr !== "" &&
    v.pvEigenverbrauchKwhJahr !== "" &&
    v.pvVerkaufEurKwh !== ""
  );
}

/**
 * Slice 2 — projects the wizard form state into the shape the
 * `@/lib/calculations` module consumes. Missing optional numerics
 * fall back to SPEC §4.5 defaults (pacht 100 EUR/kWp, contract 20y).
 */
function buildCalcInput(v: StudyFormValues): StudyCalcInput {
  return {
    anlageKwp: numericOrZero(v.anlageKwp),
    pvErzeugungKwhJahr: numericOrZero(v.pvErzeugungKwhJahr),
    pvEigenverbrauchKwhJahr: numericOrZero(v.pvEigenverbrauchKwhJahr),
    pvVerkaufEurKwh: numericOrZero(v.pvVerkaufEurKwh),
    verbrauchKwhJahr: numericOrZero(v.verbrauchKwhJahr),
    versorgerPreisEurKwh: numericOrZero(v.versorgerPreisEurKwh),
    pachtEurProKwp: v.pachtEurProKwp === "" ? 100 : v.pachtEurProKwp,
    vertragslaufzeitJahre: v.vertragslaufzeitJahre === "" ? 20 : v.vertragslaufzeitJahre,
    co2Override: false,
  };
}

/**
 * Exported for the wizard / single-page page wrappers to hydrate
 * initialValues from the persisted Study row.
 */
export const SENSITIVITY_DEFAULT_VALUES = {
  szenarioPreis1: SENSITIVITY_DEFAULTS.szenarioPreis1,
  szenarioPreis2: SENSITIVITY_DEFAULTS.szenarioPreis2,
  szenarioPreis3: SENSITIVITY_DEFAULTS.szenarioPreis3,
} as const;
