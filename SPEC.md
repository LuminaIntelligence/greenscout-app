# GreenScout — Machbarkeitsstudien-Webanwendung

> **Status:** Living document. Single source of truth for product & technical scope of the MVP.
> Any code in this repository must conform to this spec. If a desired implementation conflicts with the spec, **pause and ask** — never silently diverge.

---

## 1. Vision

A web application for GreenScout e.V. consultants ("Berater") to capture all input data required for a photovoltaic feasibility study and generate a customer-ready feasibility study document (PDF + sharebare Online-Ansicht) in the established GreenScout layout, with one click.

The current process uses a manual Excel workbook (`Machbarkeitsstudien Auswertung.xlsx`) and a PowerPoint template (`Machbarkeitsstudie-PV-Template_v1_6.pptx`). The application replaces the Excel and the manual placeholder-filling step. Das Original-PDF unter `docs/reference/Machbarkeitsstudie-PV-Template_v1_6.pdf` dient als visuelle Soll-Vorlage für die React-Slide-Renderer-Implementierung (§4.8).

---

## 2. Scope

### 2.1 MVP (Version 1)

The MVP must deliver these five capabilities:

1. **Authentication & user management**
   Email/password login for `BERATER` and `ADMIN` roles. Forced password change on first login. Admin-initiated password reset (no email-based self-service in MVP).

2. **Study creation & persistence**
   Form-based capture of all PV calculation inputs, customer data, location data, and slide-content fields. Studies are stored persistently and listed in a dashboard. The form is available as a wizard *or* a single-page layout; the choice is a per-user preference.

3. **Image upload**
   Per study, exactly two images: `BEFORE` (roof without panels) and `AFTER` (roof with panels). Used in the generated document.

4. **Automatic calculations**
   Derived values (yearly savings, 20-year savings, lease income, CO₂ tonnage, equivalent hectares of forest and football fields, etc.) computed from inputs server-side. See §5 for the calculation contract.

5. **Document generation**
   Auf Klick werden ein populiertes PDF und eine sharebare Online-Ansicht der Machbarkeitsstudie erzeugt. Frühere Versionen bleiben über die Studien-Versionshistorie erreichbar.

### 2.2 V2 (next iteration)

- Self-service password reset via SMTP-based email link.
- Outbound email of the generated PDF directly to the customer.
- Re-uses the SMTP configuration already required for the lockout-admin-alert in MVP.

### 2.3 Phase 3

- Direct PV-Sol integration (today: simulation data is entered manually).
- Multi-language support (today: German only).
- Customer-facing login portal where flächeneigentümer can view and download their own study.

### 2.4 Out of scope (handled elsewhere or never)

- **CRM functions** — lead lists, contact history, calendar integrations → separate system.
- **Accounting / invoicing** — billing for the 998 € evaluation package, lease payment tracking → separate system.
- **Mobile / native apps** — web-responsive only.

---

## 3. Personas

### 3.1 Berater (consultant)
- Internal GreenScout employee or external partner consultant.
- 1–10 users in MVP.
- Owns the studies they create; can hand over studies to other consultants.
- Cannot edit other consultants' studies (read-only at most).

### 3.2 Admin
- Single dedicated admin account: `consulting@lumina-intelligence.ai`.
- Can do everything a Berater can do.
- Additionally:
  - Create / edit / deactivate / hard-delete consultant accounts.
  - Reset any consultant's password (issues a temporary password, forces change on next login).
  - See, edit and reassign **all** studies.
  - Maintain global SMTP settings.
  - Trigger DSGVO hard-delete workflows.

### 3.3 Kunde / Flächeneigentümer (customer)
- **No login in MVP.** Receives the generated PDF out of band from their consultant.
- Phase 3 will add a customer-facing portal.

---

## 4. Functional requirements

### 4.1 Authentication

- Email + password via Auth.js Credentials provider.
- Passwords stored with a modern hash (bcrypt or argon2; argon2 preferred — confirm in implementation phase).
- **Password rules:** minimum 8 characters, must include upper case, lower case, digit, special character. UI must show a **live checklist** that turns each rule green/red as the user types.
- **First login** forces a password change before any other action is allowed.
- **Session duration:** 8 hours (hard expiry; no rolling refresh after expiry).
- **2FA / TOTP:** not in MVP. Architecture must not make it expensive to add later.
- **Lockout:** counter-based, NOT time-window-based. After 5 consecutive failed login attempts → 15-minute lockout. After 10 consecutive failures → 1-hour lockout + admin alert via configured SMTP. Subsequent failures at counter > 10 renew the 1-hour lockout (no escalation, no further admin alerts to avoid spam). The counter resets to 0 **only on a successful login** — NOT when a lockout timer expires. AuditLog `LOGIN_FAIL` entries are written for every failed attempt as a forensic trail; the lockout decision itself is made from the `failedLoginCount` and `lockoutUntil` columns on `User`, not from the audit log.

### 4.2 Roles

| Role | Description |
|---|---|
| `BERATER` | Default role. CRUD on own studies, image upload, document generation, hand over own study to another consultant. |
| `ADMIN` | All `BERATER` rights + user management, SMTP settings, global study access, hard-delete, audit-log inspection. |

### 4.3 User flows

| # | Flow | Trigger | Result |
|---|---|---|---|
| F1 | Login + initial password change | Open app URL | Authenticated session; if first login → forced password change |
| F2 | Create new study | "Neue Studie" button on dashboard | Study persisted in `DRAFT`; form layout matches user's wizard/single-page preference |
| F3 | Open / edit / generate | Study row in dashboard | Editable detail view; on "Dokument generieren" → PPTX + PDF available; status becomes `GENERATED` |
| F4 | Re-generate after edit | Edits in existing study | New document version stored in history; previous versions remain accessible |
| F5 | Admin user management | Admin opens user area | Admin can CRUD consultants, reset passwords (temp password + force-change) |
| F6 | Hand over study | Owner or admin opens study | Study `consultantId` reassigned; audit-log entry created |
| F7 | Admin god-mode | Admin opens any study | Read/write access to any study regardless of `consultantId` |

### 4.4 Customer entity

- A `Customer` may have multiple `Study` records (different properties).
- `companyName` is **optional** (≈90 % of customers are companies, but private persons are supported).
- `contactFirstName` and `contactLastName` are **required** (a customer must always be addressable as a person).
- Exactly one contact person per customer (no N:M).

### 4.5 Study fields (input)

#### Customer & object
- Customer reference (FK to `Customer`).
- Object name (e.g. "Einkaufszentrum Linzgau Center").
- Object address: street, ZIP, city.
- Flurstück / parcel number.

#### PV inputs (mirror the existing Excel)
- Anlagengröße `kWp`
- PV-Stromerzeugung `kWh/Jahr`
- PV-Eigenverbrauch `kWh/Jahr`
- PV-Stromverkauf `€/kWh`
- Stromverbrauch Eigentümer gesamt `kWh/Jahr`
- Versorger-Strompreis `€/kWh`
- Pachtzahlung `€/kWp` (default 100)
- Pacht-Vertragslaufzeit `Jahre` (default 20)

#### Additional fields used in slides
- Modulanzahl, Modulfläche `m²` (from PV-Sol; manual in MVP).
- Eigenverbrauchsquote `%`.
- Netzeinspeisung `kWh/Jahr`.
- Sensitivitäts-Szenarien: alternative Netzstrompreise (z. B. 35 / 40 / 45 ct/kWh) und resultierende Jahres-Ersparnis.
- CO₂-Werte pro Jahr und 20 Jahre, Hektar Mischwald, Anzahl Fußballfelder — entweder eingegeben oder berechnet (siehe §5).
- Termin-Vorschläge (zwei Datums-/Uhrzeit-Felder für Slide 19).
- Berater-Zuordnung (FK to `User`, default = currently logged-in user).

### 4.6 Image upload

- Exactly two images per study: `BEFORE`, `AFTER`.
- Accepted formats: JPG, PNG, WebP.
- Server-side validation: max 10 MB pre-resize, max 4000 × 4000 px.
- On upload: server resizes/optimises (via Pillow) to a fixed bounding box matching the slide placeholder aspect ratio; original is retained for re-rendering if the layout changes later.
- Storage: local filesystem under `./uploads/studies/<studyId>/` in MVP. Path-injection-safe naming (`<uuid>.<ext>`).

### 4.7 Calculations

The Python service exposes a pure calculation function. The same logic is mirrored in the TypeScript domain layer for live preview while the user types.

Reference calculations from the Excel:

```
ersparnis_pro_jahr      = (versorger_preis_eur_kwh - pv_verkauf_eur_kwh) * pv_eigenverbrauch_kwh
ersparnis_pro_monat     = ersparnis_pro_jahr / 12
ersparnis20_jahre       = ersparnis_pro_jahr * 20
pacht_einnahme_einmalig = anlage_kwp * pacht_eur_pro_kwp
gesamterzeugung20j      = pv_erzeugung_kwh_jahr * 20
gesamtvorteil           = ersparnis20_jahre + pacht_einnahme_einmalig
```

> **Field-name note.** The two `…20…` fields keep the digit attached to the
> preceding token (`ersparnis20_jahre`, `gesamterzeugung20j`) — no underscore
> before the digit. This matches the exact wire format produced by the TS
> `camelToSnake` translator on the source-of-truth TS field names
> (`ersparnis20Jahre`, `gesamterzeugung20j`). The Python `DerivedValues`
> schema uses the same names. See DECISIONS 2026-05-27.

CO₂ values (approximate, agreed with GreenScout):
- 1 kWh PV ≈ 0.474 kg CO₂ avoided (German grid mix).
- 1 t CO₂ ≈ 0.0177 ha managed mixed forest sequestration per year (≈ to be confirmed).
- 1 ha ≈ 1.28 football fields (UEFA standard pitch reference).

**These constants must live in a single named-constants module on each side (TS and Py) and be covered by tests** — they may shift when GreenScout updates its methodology.

### 4.8 React-Slide-Renderer-Architektur

> **Pivot 2026-06-01 (§7.10, user-autorisiert):** Die ursprüngliche PPTX-Template-Pipeline ist ersatzlos durch eine React-Komponenten-Architektur abgelöst. Rationale + Folge-PRs siehe `DECISIONS.md` 2026-06-01.

Strategie: **19 Slides als komponentenbasierter React-Tree, serverseitig mit Playwright zu PDF gerendert.** Online-Ansicht für Kunden über signierten HMAC-Token. Visuelle Soll-Vorlage ist das Original-PDF unter `docs/reference/Machbarkeitsstudie-PV-Template_v1_6.pdf` (bleibt im Repo erhalten — Pixel-Soll für die React-Komponenten-Umsetzung).

- **Komponenten-Tree:** Jede Slide lebt als eigene React-Komponente unter `src/features/studies/document/slides/` (z. B. `slide-01-title.tsx` … `slide-19-contact.tsx`). Ein Root-`<Document>`-Wrapper komposit die 19 Slides; Storybook-Stories pro Slide für visuelle Regression.
- **Props-Contract:** Jede Slide erhält die zusammengestellten Studien-Daten als Props (Customer, Study, DerivedValues, Consultant). Die Datenmontage geschieht in einer Server-Action / einem Route-Handler, der Customer + Study + Consultant aus der DB lädt und mit `composeAll()` die DerivedValues vorrechnet (Calc-Endpoint des pyservice bleibt für authoritatives Recalc verfügbar).
- **Layout:** Tailwind + Brand-Tokens aus §8.1 (`forest-green`, `plant-green`, `muted-lime`, `foreground`, `background`, `link`) + Typografie aus §8.2 (Gabarito Semibold / Regular). Keine neuen Farben.
- **Chart auf Slide 15:** Recharts (bereits im Stack via shadcn). Sensitivitäts-Szenarien als Bar/Line-Chart, Daten vom Server vorgerechnet.
- **Slide-17-Timeline:** CSS-Grid mit `grid-auto-rows: 1fr` zur Erzwingung gleicher Spaltenhöhen — ersetzt die fragile PPTX-Grid-Normalisierung der Runde-2-Defekte R2-10 / C2.
- **Bildplatzhalter:** `<img>` mit `object-fit: cover` und festem Aspect-Ratio-Container — ersetzt die PPTX-Image-Forced-Geometry-Logik aus R2-3. Die uploaded BEFORE/AFTER-Bilder werden weiterhin vom pyservice via Pillow auf eine fixe Bounding-Box resized (Pipeline aus T-029a/b/c bleibt unverändert); die React-Slides binden die fertigen Bilder per relativem Pfad.
- **PDF-Rendering:** Playwright (`playwright`-Top-Level-Dep, ab §7.10-Pivot PR 3) rendert die `<Document>`-Komponente headless aus einer **internen Render-Route** `src/app/internal/render-study/[id]/page.tsx` nach PDF. Die Route ist via Shared-Secret-Header `x-internal-render-token` gegen `process.env.INTERNAL_RENDER_TOKEN` gegated (analog `PYTHON_SERVICE_API_KEY`-Pattern aus §6.3 — Service-zu-Service Shared-Secret, KEIN User-Auth-Flow). Bei Mismatch oder fehlender ENV: `notFound()`. Die Route ist nicht öffentlich auffindbar (kein Sitemap-Eintrag, keine Verlinkung, Middleware-Whitelist nur für den Bypass des Session-Auth-Branchs). Print-CSS via `@page size 1920px 1080px` + `page-break-after: always` zwischen Slides. Implementation des Playwright-Wrappers: `src/features/studies/document/services/render-pdf.ts`; aufgerufen aus `generateDocumentAction`. Output: `<GENERATED_DIR>/<studyId>/study-<id>-<timestamp>.pdf`.
- **Online-Ansicht für Kunden:** Öffentliche Route (`app/(public)/studie/[id]/...`) gegated durch signierten HMAC-Token in der URL — kein Login nötig, aber Token + Study-ID müssen serverseitig matchen. Vorab-Light für das Phase-3-Kunden-Portal (SPEC §2.3).
- **Storybook + visuelle Regression:** Story pro Slide mit gemockten Props; Snapshot-Diffs in CI als zusätzliche Qualitäts-Gate jenseits der Vitest-Unit-Coverage.

PDF-Rendering-Flow:

```
generateDocumentAction
  └── renderStudyToPdf(studyId)
        └── chromium.launch() → page.goto(
                                   /internal/render-study/<id>,
                                   header: x-internal-render-token=<INTERNAL_RENDER_TOKEN>
                                 )
              └── Server-Component lädt buildStudyDocumentData(orgId, studyId)
                   → <StudyDocument data={data} /> (alle 19 Slides)
              └── page.pdf({ 1920×1080, landscape, printBackground,
                              preferCSSPageSize, margin: 0 })
                   → <GENERATED_DIR>/<studyId>/study-<id>-<timestamp>.pdf
```

Keine LibreOffice-Subprozess-Abhängigkeit mehr; LibreOffice + `python-pptx` aus pyservice entfernt. Calc-Endpoint + Image-Processor-Endpoint bleiben im pyservice unverändert.

### 4.9 Error handling (UX)

| Severity | Pattern | Examples |
|---|---|---|
| Inline form validation | Field-level message, red border, aria-described-by | Required field empty, invalid email, password rule violation |
| Toast (≤ 5s) | Bottom right, auto-dismiss | "Studie gespeichert", "Bild hochgeladen" |
| Banner (persistent) | Top of view, dismissable | "PDF-Generierung läuft noch (45 s)", "Letzte Generierung fehlgeschlagen, Details ↓" |
| Dialog | Modal, requires confirm/cancel | "Studie wirklich löschen?", "An anderen Berater übergeben?" |
| Full error page | 404 / 500 / 403 routes | Unknown URL, server crash, forbidden study access |

---

## 5. Data model

> Implementation: Prisma schema. PascalCase models, camelCase TS fields, `@map()` to `snake_case` DB columns.

### 5.1 Entities

#### `User`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `email` | `String @unique` | login + contact |
| `passwordHash` | `String` | argon2 |
| `role` | `Role` | enum `ADMIN \| BERATER` |
| `firstName` | `String` | |
| `lastName` | `String` | |
| `phone` | `String?` | |
| `mobile` | `String?` | |
| `addressLine` | `String?` | for slide-19 contact block |
| `signaturePhotoUrl` | `String?` | optional consultant headshot |
| `mustChangePassword` | `Boolean @default(true)` | forced on first login & after admin reset |
| `failedLoginCount` | `Int @default(0)` | |
| `lockoutUntil` | `DateTime?` | |
| `formPreference` | `FormPref @default(WIZARD)` | per-user wizard vs single-page |
| `active` | `Boolean @default(true)` | soft-disable |
| `deletedAt` | `DateTime?` | soft-delete |
| `organizationId` | `String @default("greenscout")` | multi-tenant placeholder |
| `createdAt` / `updatedAt` | timestamps | |

#### `Customer`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `companyName` | `String?` | optional |
| `contactFirstName` | `String` | required |
| `contactLastName` | `String` | required |
| `email` | `String?` | |
| `phone` | `String?` | |
| `billingAddress` | `String?` | company / billing — **different from object address** |
| `billingZipCode` | `String?` | |
| `billingCity` | `String?` | |
| `notes` | `String?` | freitext |
| `deletedAt` | `DateTime?` | soft-delete |
| `organizationId` | `String @default("greenscout")` | |
| `createdAt` / `updatedAt` | timestamps | |

#### `Study`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `consultantId` | `String` (FK `User`) | the assigned `BERATER` |
| `customerId` | `String` (FK `Customer`) | |
| `status` | `StudyStatus` | `DRAFT \| READY \| GENERATED` |
| `objectName` | `String` | |
| `objectAddress` | `String` | |
| `objectZipCode` | `String` | |
| `objectCity` | `String` | |
| `flurstueck` | `String` | |
| `anlageKwp` | `Decimal` | |
| `pvErzeugungKwhJahr` | `Decimal` | |
| `pvEigenverbrauchKwhJahr` | `Decimal` | |
| `pvVerkaufEurKwh` | `Decimal` | |
| `verbrauchKwhJahr` | `Decimal` | |
| `versorgerPreisEurKwh` | `Decimal` | |
| `pachtEurProKwp` | `Decimal @default(100)` | |
| `vertragslaufzeitJahre` | `Int @default(20)` | |
| `modulAnzahl` | `Int?` | |
| `modulFlaecheM2` | `Decimal?` | |
| `eigenverbrauchsquoteProzent` | `Decimal?` | |
| `netzeinspeisungKwhJahr` | `Decimal?` | |
| `szenarioPreis1` / `2` / `3` | `Decimal?` | sensitivity ct/kWh |
| `terminVorschlag1` / `2` | `DateTime?` | for slide 19 |
| `co2Override` | `Boolean @default(false)` | when true: stored CO₂ values used as-is |
| `co2TonnenProJahr` | `Decimal?` | |
| `co2HektarMischwald` | `Decimal?` | |
| `co2FussballfelderProJahr` | `Decimal?` | |
| `deletedAt` | `DateTime?` | |
| `organizationId` | `String @default("greenscout")` | |
| `createdAt` / `updatedAt` / `generatedAt` | timestamps | |

Indexes: `consultantId`, `customerId`, `status`, `(organizationId, status)`.

#### `StudyImage`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `studyId` | `String` (FK `Study`) | |
| `type` | `ImageType` | enum `BEFORE \| AFTER` |
| `filename` | `String` | uuid-based |
| `mimeType` | `String` | |
| `widthPx` / `heightPx` | `Int` | |
| `fileSizeBytes` | `Int` | |
| `uploadedAt` | `DateTime @default(now())` | |

Constraint: `unique(studyId, type)` — at most one image per type per study.

#### `GeneratedDocument`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `studyId` | `String` (FK `Study`) | |
| `format` | `DocFormat` | enum `PPTX \| PDF` |
| `filename` | `String` | |
| `generatedAt` | `DateTime @default(now())` | |
| `generatedById` | `String` (FK `User`) | |

#### `AuditLog`
| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `userId` | `String?` (FK `User`) | nullable for system events |
| `entityType` | `String` | `User`, `Customer`, `Study`, `StudyImage`, `GeneratedDocument`, `Auth`, `System` |
| `entityId` | `String?` | |
| `action` | `String` | `CREATE`, `UPDATE`, `DELETE`, `SOFT_DELETE`, `LOGIN_SUCCESS`, `LOGIN_FAIL`, `LOCKOUT`, `PASSWORD_RESET`, `PASSWORD_CHANGE_FAIL`, `HANDOVER`, `GENERATE_DOCUMENT`, `RETENTION_NOTICE`, `STATUS_CHANGE`, `IMAGE_UPLOADED`, `IMAGE_REPLACED`, `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED` |
| `changeSet` | `Json?` | diff |
| `ipAddress` | `String?` | |
| `userAgent` | `String?` | |
| `createdAt` | `DateTime @default(now())` | |

Indexes: `userId`, `entityType, entityId`, `createdAt`.

#### `Setting`
Single-row key/value store for app-wide config.
| Field | Type | Notes |
|---|---|---|
| `key` | `String @id` | e.g. `smtp.host`, `smtp.port`, `smtp.user`, `smtp.passwordEnc`, `smtp.from`, `retention.years` |
| `value` | `String` | encrypted for secrets |
| `updatedAt` | timestamp | |

### 5.2 Relationships

```
Customer 1 ── N Study
User     1 ── N Study     (as consultant)
User     1 ── N GeneratedDocument (as generator)
Study    1 ── N StudyImage
Study    1 ── N GeneratedDocument
User     1 ── N AuditLog
```

### 5.3 Multi-tenancy posture

Single-tenant in MVP, but every persisted entity carries `organizationId` with default `"greenscout"`. The repository layer accepts an `organizationId` parameter and filters every query by it. Phase-3 multi-tenant rollout will require only:
1. populating `organizationId` from the session,
2. removing the default value,
3. adding a `Organization` table.

No application logic outside the repository layer should reference `organizationId` directly.

---

## 6. Non-functional requirements

### 6.1 DSGVO

- **Soft-delete by default** on `User`, `Customer`, `Study`. Hard-delete only via explicit admin "DSGVO-Löschung"-workflow that cascades and writes a `RETENTION_NOTICE` audit entry.
- **Retention:** 10 years from `Study.createdAt`. A daily cron checks for studies approaching expiry and writes admin-visible notifications 60 / 30 / 7 days before deletion. Auto-deletion occurs at expiry **only after admin confirmation** (no silent destruction).
- **Audit log** is append-only. No `UPDATE` or `DELETE` on `AuditLog` rows from application code.

### 6.2 Performance budget (MVP)

- Form save < 500 ms (excluding image upload).
- Image upload + resize < 5 s for a 10 MB original.
- Document generation (PPTX + PDF) < 30 s end-to-end.
- Dashboard load < 1 s for up to 1 000 studies.

### 6.3 Security

- All passwords hashed with argon2id (`memoryCost=19MiB`, `timeCost=2`, `parallelism=1` as a starting point).
- All app secrets read from environment variables; never logged.
- SMTP password stored encrypted (symmetric, key from env) in the `Setting` table.
- CSRF protection on all state-changing routes (Auth.js handles its own; custom routes use a per-session token).
- Content-Security-Policy headers via Next.js middleware, plus `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, and `Permissions-Policy` applied to every middleware response via an `applySecurityHeaders` helper for defense-in-depth. HSTS and TLS termination live at the production reverse-proxy (see T-050b), NOT in middleware — dev-HTTP traffic would otherwise leak the HSTS directive and lock the dev hostname into HTTPS-only.
- File uploads served with `Content-Disposition: attachment` and a strict allow-list of MIME types.

### 6.4 Internationalisation

German only in MVP. All strings centralised in i18n-ready dictionaries (`src/i18n/de.ts`) so Phase-3 expansion is mechanical.

---

## 7. Architecture

### 7.1 Component overview

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  Next.js app             │   HTTP  │  Python FastAPI service   │
│  Auth, CRUD, file upload │ ──────► │  Pillow image processing  │
│  React-Slides + Playwright│ ◄────── │  PV-Calc (authoritative)  │
│  PDF rendering            │         │                           │
└──────────────────────────┘         └──────────────────────────┘
            │                                     │
            ▼                                     ▼
     ┌─────────────┐                       ┌─────────────┐
     │ PostgreSQL  │                       │ ./uploads & │
     │ (via Prisma)│                       │ ./generated │
     └─────────────┘                       └─────────────┘
```

All containerised; orchestrated by `docker-compose.yml`. Production hosting: a single Hetzner VPS.

### 7.2 Why a separate Python service?

Pillow is the most reliable open-source image-processing library for the BEFORE/AFTER-Photo-Resize-Pipeline (T-029b), und die authoritative PV-Calculation-Implementation in Python ist die Single-Source-of-Truth für die Parity-Tests gegen den TS-Mirror (T-034). Document-Rendering selbst (PDF + Online-Ansicht) läuft im Next.js-Layer via React-Slide-Komponenten + Playwright (siehe §4.8 + DECISIONS.md 2026-06-01) — die historische Begründung für den separaten Service (`python-pptx` + LibreOffice) ist nach dem §7.10-Pivot entfallen, der Service selbst bleibt aber wegen Image + Calc bestehen.

### 7.3 Module layout (frontend)

Feature-based:

```
src/
  features/
    auth/                  # login, password change, lockout
    studies/               # CRUD, wizard, list, document trigger
    customers/             # CRUD
    users/                 # admin user management
    documents/             # generated-document history
    settings/              # admin SMTP & retention
    audit/                 # admin audit-log view
  components/ui/           # shadcn/ui primitives
  lib/                     # db client, auth config, calculation mirror
  app/                     # Next.js App Router routes
  i18n/                    # de.ts dictionary
  types/                   # shared TS types
```

### 7.4 Module layout (Python service)

```
app/
  api/                     # FastAPI routers (calc, images, health, version)
  domain/
    calculations.py        # PV calculations (authoritative; TS mirrors for live preview)
    constants.py           # CO2 factors, defaults
  services/
    formatters.py
    image_processor.py
  schemas/                 # pydantic models
  config.py
  main.py
tests/
```

> **2026-06-01 (§7.10-Pivot):** `pptx_generator.py` + `pdf_renderer.py` + die `documents`-Endpoint + das PPTX-Template wurden entfernt. Document-Rendering läuft jetzt vollständig im Next.js-Layer (siehe §4.8). Original-PDF als visuelle Soll-Vorlage liegt unter `docs/reference/Machbarkeitsstudie-PV-Template_v1_6.pdf`.

---

## 8. Design system

### 8.1 Colour tokens (Tailwind config + CSS variables)

| Token | Hex | Usage |
|---|---|---|
| `forest-green` | `#2D473E` | Dark headlines, footer, brand accent |
| `plant-green` | `#6A8F4E` | Primary (buttons, active states) |
| `muted-lime` | `#B2D082` | Secondary, hover, subtle backgrounds |
| `background` | `#FFFFFF` | Page background |
| `foreground` | `#000000` | Body text |
| `link` | `#CC3366` | Hyperlinks |

Plus standard derived shades (50/100/.../900) generated via Tailwind from the three greens.

### 8.2 Typography

- **Headings:** Gabarito Semibold.
- **Body:** Gabarito Regular.
- Loaded via `next/font/google` or self-hosted (preferred for offline / air-gapped resilience).
- Numeric tables use `font-variant-numeric: tabular-nums`.

### 8.3 Microcopy

- **Internal consultant UI:** *„Du"*-form.
- **Customer-facing content** (the PDF, any emails to customers, any future portal): *„Sie"*-form, consistent with the existing PPTX.
- Date format: `DD.MM.YYYY`.
- Number format: thousands separator `.`, decimal `,` (German locale).
- Currency: `€` after the value with a non-breaking space — `27.500 €`.

### 8.4 Visual language

Modern, state-of-the-art SaaS look. White backgrounds, generous whitespace, clear hierarchy, sparing use of `muted-lime` for accents, deeper `forest-green` for headings. No drop-shadow-heavy "skeuomorphic" styling.

---

## 9. Glossary

| Term | Meaning |
|---|---|
| **Machbarkeitsstudie** | The deliverable PDF/PPTX assessing the PV viability of a customer's property. |
| **Anlage** | The PV installation on the roof. |
| **Anlagengröße** | Installed nominal capacity in kWp. |
| **Eigenverbrauch** | Self-consumed share of the PV-generated electricity. |
| **Pacht** | Lease paid to the property owner by the investor for the right to operate the PV system. |
| **EEG** | German Renewable Energy Sources Act — guarantees the legal framework for 20 years. |
| **PV-Sol** | Third-party simulation software whose output is currently imported manually. |
| **Flurstück** | Cadastral parcel number identifying the property. |
| **READY** | Study status: all required fields filled, but no document generated yet. |
| **GENERATED** | Study status: at least one PPTX+PDF version has been produced. |
