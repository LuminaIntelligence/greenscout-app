import { customerDisplayName, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 17 — "Der Weg zur Inbetriebnahme".
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 17). Slide-17 ist das mit Abstand
 * dichteste Slide — sechs Phasen-Spalten mit je Inhalte- und Ergebnisse-
 * Texten, plus mehrere Footnote-Blöcke. Reproduziert über ein 6-Spalten-
 * Grid mit `grid-auto-rows: 1fr` (Defekt R2-10/C2 — gleiche Spaltenhöhen
 * für die Phasen-Karten).
 *
 *  - Text 0 (Headline) — "Der Weg zur Inbetriebnahme".
 *  - Rechteck 15 — "Inhalte" (Header-Label für die obere Bullet-Reihe).
 *  - Rechteck 16 — "Ergebnisse" (Header-Label für die untere Bullet-Reihe).
 *  - 6 Phasen-Spalten (Textfeld 2/8 / 3/9 / 4/10 / 5 / 6 / 20/21):
 *     1. Machbarkeitsstudie (Inhalte / Ergebnisse)
 *     2. Vertragsbedingungen (Inhalte / Ergebnisse — "Rechtliche
 *        Grundlage zur Einleitung der Projektentwicklung (Phase II) /
 *        Beginn Phase II nach Vertragsunterzeichnung")
 *     3. Projektierung (Inhalte / Ergebnisse)
 *     4. Bauausführung (AC/DC)
 *     5. Betrieb
 *     6. Projektrechte Vermarktung und -Verkauf — mit
 *        "{{pacht_einnahme_einmalig_eur}} €"-Marker
 *  - Spezial-Block (Rechteck: abgerundete Ecken 14) — "Jetzt ist
 *    notwendig.. ...eine Telefon-Konferenz mit unseren Projektberatern,
 *    um Ihre Fragen zu klären und das weitere Vorgehen zu besprechen."
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
  const phases: Phase[] = [
    {
      title: "Machbarkeitsstudie",
      inhalte: [
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
      title: "Vertragsbedingungen",
      inhalte: [
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
      title: "Projektierung",
      inhalte: [
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
      title: "Bauausführung (AC/DC)",
      inhalte: [
        "Detailplanung der AC und DC-Seite",
        "Koordination mit Netzbetreiber und Versicherern",
        "Materialdisposition und Baustellenorganisation – Der Tägl. Betrieb wird nicht eingeschränkt",
        "Montage der Unterkonstruktion und PV-Module",
        "DC-Verkabelung und Wechselrichter-installation",
        "AC-Anbindung und Integration in die vorhandene Elektroinfrastruktur",
        "Umsetzung der erforderlichen Schutz- und Sicherheits-konzepte",
      ],
      ergebnisse: ["Abschluss Installation PV-Anlage"],
    },
    {
      title: "Betrieb",
      inhalte: [
        "Mess-, Steuer- und Regelsysteme sowie Betriebskontrollen",
        "Instandhaltung: Durchführung von Inspektionen, Wartungen und ähnlichen Maßnahmen",
        "Instandsetzung: Gegebenenfalls Reparaturarbeiten und Erneuerungen",
      ],
      ergebnisse: [
        "Auszahlung Pacht und PV-Anlage im Betrieb",
        `Sie beziehen Strom direkt von Ihrem eigenen Dach: ca. ${ersparnisJahr} € pro Jahr Ersparnis · ca. ${ersparnis20} € in 20 Jahren`,
        "Kostengünstiger als beim regionalen Anbieter",
        "Unabhängig von Strompreisschwankungen",
        "Sie sparen",
      ],
    },
    {
      title: "Projektrechte Vermarktung und -Verkauf",
      inhalte: [
        "Projektrechteentwicklung ist abgeschlossen: Vermarktungsphase beginnt.",
        `Nach Vermarktung Zahlung Dachpacht ca. ${pacht} €`,
        "Investorensuche: Für das Projekt kann jetzt ein geeigneter Investor gesucht werden, entsprechendes Netzwerk vorhanden",
        "Über den Investor steht entsprechendes GU für die Bauplanung zur Verfügung",
        "GreenScout e.V. kann hier beratend unterstützen",
      ],
      ergebnisse: [],
    },
  ];

  return (
    <SlideFrame slideNumber={17} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-3">
        {/* Headline (Text 0) */}
        <h2 className="text-[28px] font-bold text-forest-green">Der Weg zur Inbetriebnahme</h2>

        {/* "Jetzt ist notwendig" call-out (Rechteck 14) */}
        <div className="rounded-lg bg-plant-green-50 p-3 text-[14px] leading-[1.35] text-forest-green">
          <span className="font-bold">Jetzt ist notwendig..</span> …eine Telefon-Konferenz mit
          unseren Projektberatern, um Ihre Fragen zu klären und das weitere Vorgehen zu besprechen.
        </div>

        {/* 6-column timeline grid with grid-auto-rows: 1fr */}
        <div
          className="grid flex-1 gap-2"
          style={{
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gridAutoRows: "1fr",
          }}
        >
          {phases.map((p, i) => (
            <div key={i} className="flex flex-col gap-1">
              {/* Phase title */}
              <h4 className="rounded-t-md bg-plant-green px-2 py-1 text-[11px] font-bold leading-tight text-white">
                {p.title}
              </h4>
              {/* Inhalte */}
              <div className="flex-1 rounded-md bg-muted-lime-50 p-2 text-[9px] leading-[1.25] text-foreground">
                <div className="mb-1 text-[10px] font-bold text-plant-green">Inhalte</div>
                <ul className="space-y-0.5">
                  {p.inhalte.map((b, idx) => (
                    <li key={idx} className="flex gap-1">
                      <span className="text-plant-green">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Ergebnisse */}
              {p.ergebnisse.length > 0 ? (
                <div className="rounded-md bg-forest-green p-2 text-[9px] leading-[1.25] text-white">
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
              ) : null}
            </div>
          ))}
        </div>

        {/* Footnotes */}
        <div className="space-y-1 text-[10px] leading-[1.3] text-forest-green opacity-70">
          <p>
            * Ob ein Projektrecht für Investoren attraktiv ist, hängt maßgeblich von der Strommenge,
            welche ihr Unternehmen aus der Anlage über den Stromliefervertrag bezieht, ab.
          </p>
          <p>
            Unverbindliche Projektentwicklung insbesondere wegen der Abhängigkeit der
            „Stadtwerke&ldquo; (des Netzbetreibers)
          </p>
          <p>Für weitere Besprechungen ist unser Projektberater zuständig (siehe Seite 19)</p>
        </div>
      </div>
    </SlideFrame>
  );
}
