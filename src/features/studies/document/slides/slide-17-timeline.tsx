import { customerDisplayName, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 17 — "Der Weg zur Inbetriebnahme".
 *
 * Treue Reproduktion (Pivot-2b PASS 2, siehe DECISIONS 2026-06-02).
 *
 * **Pass-2-Korrekturen (Q9 + Q10 User-Antworten):**
 *  - **7 Spalten statt 6.** User-Direktinspektion der PPTX zeigte:
 *    Spalte 4 ("Phase III") fehlte in Pass 1, „Projektrechte
 *    Vermarktung und -Verkauf" gehört dort hin, NICHT als letzte Spalte
 *    nach Bauausführung.
 *  - **Korrekte Phasen-Reihenfolge (User-verifizierte Liste):**
 *     1. Phase I (Machbarkeitsstudie) → "Technisch und wirtschaftlich
 *        tragfähiges Vorprojekt..."
 *     2. Vor-Phase II (Vertragsbedingungen) → "Rechtliche Grundlage zur
 *        Einleitung..."
 *     3. Phase II (Projektierung) → "Baureifestatus PV-Anlage..."
 *     4. Phase III (Investorensuche) → "Projektrechte Vermarktung und
 *        -Verkauf"  ← in Pass 1 als letzte Spalte irrtümlich
 *     5. Projektumsetzung (Bauausführung) → "Abschluss Installation
 *        PV-Anlage"
 *     6. Inbetriebnahme (Betrieb) → "Auszahlung Pacht und PV-Anlage im
 *        Betrieb"
 *     7. Bis 20 Jahre → "Sie sparen"  ← Q9: gehört als
 *        Ergebnis-Label der 7. Spalte, nicht als Mitten-Box.
 *  - Layout-Konsequenz: `grid-template-columns: repeat(7, …)` plus
 *    `grid-auto-rows: 1fr` für gleiche Spaltenhöhen.
 *
 * Statische Texte wörtlich aus dem PPTX (siehe `template-content.json`
 * Slide 17, Pass-2-Regenerierung mit allen 7 Ergebnis-Textfeldern):
 *  - Text 0 (Headline) — "Der Weg zur Inbetriebnahme".
 *  - Rechteck 15 — "Inhalte" (Header-Label für die obere Bullet-Reihe).
 *  - Rechteck 16 — "Ergebnisse" (Header-Label für die untere Bullet-Reihe).
 *  - 7 Phasen-Spalten Inhalte aus Textfeld 2/3/4/20/5/6/7, Ergebnisse aus
 *    Textfeld 8/9/10/21/11/12/13.
 *  - Spezial-Block (Rechteck: abgerundete Ecken 14) — "Jetzt ist
 *    notwendig.. ...eine Telefon-Konferenz mit unseren Projektberatern,
 *    um Ihre Fragen zu klären und das weitere Vorgehen zu besprechen.".
 *    Im Original-PDF steht dieser links neben der Spalten-Timeline.
 *  - Footnote (Text 14) — "* Ob ein Projektrecht für Investoren attraktiv
 *    ist, hängt maßgeblich von der Strommenge, welche ihr Unternehmen
 *    aus der Anlage über den Stromliefervertrag bezieht, ab."
 *  - Footnote (Textfeld 18) — "Unverbindliche Projektentwicklung
 *    insbesondere wegen der Abhängigkeit der „Stadtwerke" (des
 *    Netzbetreibers)".
 *  - Footnote (Textfeld 24) — "Für weitere Besprechungen ist unser
 *    Projektberater zuständig (siehe Seite 19)".
 */
export default function Slide17Timeline({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const pacht = formatEurNumber(data.derived.pachtEinnahmeEinmalig);
  const ersparnisJahr = formatEurNumber(data.derived.ersparnisProJahr);
  const ersparnis20 = formatEurNumber(data.derived.ersparnis20Jahre);

  type Phase = {
    title: string;
    inhalte: string[];
    ergebnisse: string[];
  };
  // 7 Phasen-Spalten in der User-verifizierten Reihenfolge (Q10).
  const phases: Phase[] = [
    {
      // Spalte 1 — Phase I (Machbarkeitsstudie)
      title: "Phase I\nMachbarkeitsstudie",
      inhalte: [
        "Zentrale Aspekte der Machbarkeitsstudie:",
        "Technische Dachanalyse und Planbelegung (PV-Sol)",
        "Verschattungs- und Ertragsberechnung",
        "Vorläufige Modul- und Wechselrichterauslegung",
        "Ermittlung der Eigenverbrauchsquote",
        "Aufnahme der Kundenanforderungen",
        "Wirtschaftlichkeits-Bewertung inkl. Strompreisvergleich",
        "Sensitivitätsanalyse Strompreisszenarien",
      ],
      ergebnisse: [
        "Technisch und wirtschaftlich tragfähiges Vorprojekt",
        "Definition der optimalen Anlagengröße",
        "Einsparpotential erkennen",
      ],
    },
    {
      // Spalte 2 — Vor-Phase II (Vertragsbedingungen)
      title: "Vor-Phase II\nVertragsbedingungen",
      inhalte: [
        "Vertragsbedingungen:",
        "Regelung der Dachnutzung für die PV-Anlage",
        "Laufzeit der Pacht - Eintragung einer beschränkt persönlichen Dienstbarkeit",
        "Definition von Rechten und Pflichten des Betreibers",
        "Regelung zu Versicherung und Haftung",
        "Kostenübernahme für Planung, Errichtung, Betrieb und Rückbau der Anlage",
      ],
      ergebnisse: [
        "Rechtliche Grundlage zur Einleitung der Projektentwicklung (Phase II)",
        "Beginn Phase II nach Vertragsunterzeichnung",
      ],
    },
    {
      // Spalte 3 — Phase II (Projektierung)
      title: "Phase II\nProjektierung",
      inhalte: [
        "Projektierung:",
        "Prüfung der statischen Umsetzbarkeit (inkl. ggf. statischem Nachweis)",
        "Netzanschlussanfrage beim Netzbetreiber",
        "Abstimmung Netzverknüpfungspunkt",
        "Ausarbeitung Einspeise- und Messkonzept",
        "Definition erforderlicher Schutztechnik (z.B. NA-Schutz)",
        "Technische Projektdokumentation für Investoren",
        "Finales Anlagenlayout sowie detaillierte String und Wechselrichterauslegung",
      ],
      ergebnisse: [
        "Baureifestatus PV-Anlage (RTB = Ready-To-Build)",
        "Netzanschlusszusage Finalem techn. Anlagenkonzept",
        "Dokumentationspaket für Investoren",
      ],
    },
    {
      // Spalte 4 — Phase III (Investorensuche / Projektrechte-Vermarktung)
      title: "Phase III\nInvestorensuche",
      inhalte: [
        "Projektrechteentwicklung ist abgeschlossen: Vermarktungsphase beginnt.",
        `Nach Vermarktung Zahlung Dachpacht ca. ${pacht} €`,
        "Investorensuche: Für das Projekt kann jetzt ein geeigneter Investor gesucht werden, entsprechendes Netzwerk vorhanden",
        "Über den Investor steht entsprechendes GU für die Bauplanung zur Verfügung",
        "GreenScout e.V. kann hier beratend unterstützen",
      ],
      ergebnisse: ["Projektrechte Vermarktung und -Verkauf"],
    },
    {
      // Spalte 5 — Projektumsetzung (Bauausführung)
      title: "Projektumsetzung\n(AC/DC)",
      inhalte: [
        "Bauausführung (AC/DC):",
        "Detailplanung der AC und DC-Seite",
        "Koordination mit Netzbetreiber und Versicherern",
        "Materialdisposition und Baustellenorganisation — Der tägl. Betrieb wird nicht eingeschränkt",
        "Montage der Unterkonstruktion und PV-Module",
        "DC-Verkabelung und Wechselrichter-installation",
        "AC-Anbindung und Integration in die vorhandene Elektroinfrastruktur",
        "Umsetzung der erforderlichen Schutz- und Sicherheitskonzepte",
      ],
      ergebnisse: ["Abschluss Installation PV-Anlage"],
    },
    {
      // Spalte 6 — Inbetriebnahme (Betrieb)
      title: "Inbetriebnahme",
      inhalte: [
        "Betrieb: Mess-, Steuer- und Regelsysteme sowie Betriebskontrollen",
        "Instandhaltung: Durchführung von Inspektionen, Wartungen und ähnlichen Maßnahmen",
        "Instandsetzung: Gegebenenfalls Reparaturarbeiten und Erneuerungen",
      ],
      ergebnisse: ["Auszahlung Pacht und PV-Anlage im Betrieb"],
    },
    {
      // Spalte 7 — Bis 20 Jahre (Q9: "Sie sparen" als Ergebnis-Label)
      title: "Bis 20 Jahre",
      inhalte: [
        "Sie beziehen Strom direkt von Ihrem eigenen Dach:",
        `ca. ${ersparnisJahr} € pro Jahr Ersparnis`,
        `ca. ${ersparnis20} € in 20 Jahren`,
        "Kostengünstiger als beim regionalen Anbieter",
        "Unabhängig von Strompreisschwankungen",
      ],
      ergebnisse: ["Sie sparen"],
    },
  ];

  return (
    <SlideFrame slideNumber={17} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-3">
        {/* Headline (Text 0) */}
        <h2 className="text-center text-[28px] font-extrabold text-forest-green">
          Der Weg zur Inbetriebnahme
        </h2>

        {/* Hauptbereich: linke „Jetzt ist notwendig"-Spalte + 7-Spalten-Timeline */}
        <div className="flex flex-1 gap-3">
          {/* Linke Spalte — "Jetzt ist notwendig" call-out (Rechteck 14) */}
          <div className="flex w-[180px] flex-shrink-0 flex-col justify-center rounded-lg bg-plant-green-50 p-3 text-[12px] leading-[1.4] text-forest-green">
            <div className="text-[14px] font-bold">Jetzt ist notwendig..</div>
            <p className="mt-2">
              …eine Telefon-Konferenz mit unseren Projektberatern, um Ihre Fragen zu klären und das
              weitere Vorgehen zu besprechen.
            </p>
          </div>

          {/* 7-Spalten Phasen-Grid mit grid-auto-rows: 1fr */}
          <div
            className="grid flex-1 gap-2"
            style={{
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gridAutoRows: "min-content 1fr min-content",
            }}
          >
            {/* Row 1: Phase-Titel */}
            {phases.map((p, i) => (
              <h4
                key={`title-${i}`}
                className="whitespace-pre-line rounded-t-md bg-plant-green px-2 py-1 text-[10px] font-bold leading-tight text-white"
              >
                {p.title}
              </h4>
            ))}

            {/* Row 2: Inhalte */}
            {phases.map((p, i) => (
              <div
                key={`inhalte-${i}`}
                className="flex flex-col rounded-md bg-muted-lime-50 p-2 text-[8px] leading-[1.3] text-foreground"
              >
                <div className="mb-1 text-[9px] font-bold text-plant-green">Inhalte</div>
                <ul className="space-y-0.5">
                  {p.inhalte.map((b, idx) => (
                    <li key={idx} className="flex gap-1">
                      <span className="text-plant-green">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Row 3: Ergebnisse */}
            {phases.map((p, i) => (
              <div
                key={`ergebnisse-${i}`}
                className="flex flex-col rounded-md bg-forest-green p-2 text-[9px] leading-[1.3] text-white"
              >
                <div className="mb-1 text-[10px] font-bold">Ergebnisse</div>
                <ul className="space-y-0.5">
                  {p.ergebnisse.map((b, idx) => (
                    <li key={idx} className="flex gap-1">
                      <span>•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Footnotes */}
        <div className="space-y-1 text-[10px] leading-[1.3] text-forest-green opacity-70">
          <p>
            Unverbindliche Projektentwicklung insbesondere wegen der Abhängigkeit der
            „Stadtwerke&ldquo; (des Netzbetreibers)
          </p>
          <p>
            * Ob ein Projektrecht für Investoren attraktiv ist, hängt maßgeblich von der Strommenge,
            welche ihr Unternehmen aus der Anlage über den Stromliefervertrag bezieht, ab.
          </p>
          <p>Für weitere Besprechungen ist unser Projektberater zuständig (siehe Seite 19)</p>
        </div>
      </div>
    </SlideFrame>
  );
}
