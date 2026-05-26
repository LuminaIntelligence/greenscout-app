# TASKS.md — Task queue

> This file is owned by the **planner** subagent and updated by all agents as work progresses.
> Format and rules are defined in `.claude/agents/planner.md`.
> Implementers pick the lowest-numbered task with no open `Blocked by` and **one** task per PR.

---

## Status legend
- `⬜ TODO` — not started
- `🟦 IN PROGRESS` — an agent is actively working on it (branch open)
- `🟨 BLOCKED` — waiting on the user, an upstream task, or an external answer
- `✅ DONE` — merged to `main`
- `❌ CANCELLED` — explicitly dropped (keep the entry, write the reason)

---

## Questions for the user
*(planner appends here when a request implies scope beyond `SPEC.md`)*

— none yet —

---

## Open tasks
*(planner appends task entries below, following the template in `.claude/agents/planner.md`)*

---

### Slice 3 — Auth feature

### T-020 Wire SMTP admin-alert to the lockout-stub from T-017
- **Status:** ⬜ TODO
- **Feature:** auth
- **Type:** feat
- **Effort:** S (scope shrunk per DECISIONS T-017 corrective ②)
- **Blocks:** T-021
- **Blocked by:** T-017, T-044 (SMTP infrastructure)
- **Description:**
  T-017 ships the **complete counter-based lockout state machine** (failedLoginCount + lockoutUntil columns on User are the single source of truth, see DECISIONS T-017 corrective ②). T-020's residual scope is purely the SMTP wiring: replace the no-op `emitAdminLockoutAlert(user)` stub at `src/features/auth/services/admin-alerts.ts` with a real SMTP send that uses the encrypted SMTP config from T-044 / Settings. Add an integration test that the real sender is invoked exactly once when counter reaches 10, never on counter > 10. **SPEC §4.1 was precision-edited in T-017's PR** to reflect counter-based (not time-window) semantics — re-read there.
- **Acceptance criteria:**
  - [ ] The `emitAdminLockoutAlert` no-op stub is replaced with a real SMTP send.
  - [ ] SMTP credentials decrypted via the Settings repository + AES-256-GCM helper from T-042.
  - [ ] Email body identifies the locked user (id + email) + timestamp + counterAfter value.
  - [ ] Unit test verifies the function is wired into the existing T-017 flow (no `authorize-credentials.ts` edits needed beyond import path swap).
  - [ ] If SMTP send fails, the auth flow still completes (lockout is enforced from the DB columns; alert is best-effort delivery). Failure logged as `AuditLog` action="SYSTEM" with reason="admin-alert-send-failed".
- **Files likely touched:** `src/features/auth/services/admin-alerts.ts` (replace no-op with real send), `src/features/auth/services/admin-alerts.test.ts` (extend coverage to integration), possibly `src/i18n/de.ts` (email subject/body strings).
- **Pause-triggers anticipated:** §7.6 (outbound HTTP / SMTP send — gated behind T-044's SMTP-settings approval). §7.11 (DSGVO — admin email content must not leak user passwords/hashes).

---

### Slice 4 — Customers CRUD

*(T-023, T-024 and T-024b carried forward to Recently completed — see entries below.)*

---

### Slice 5 — Studies CRUD (form + dashboard)

*(T-025, T-026 (Eltern), T-026a, T-026b, T-027 and T-028 carried forward to Recently completed — all gemerged via PR #39 as one Slice-5 vertical.)*

---

### T-029 Image upload feature (BEFORE/AFTER, server validation, Pillow resize)
- **Status:** ⬜ TODO
- **Feature:** studies (images)
- **Type:** feat
- **Effort:** L → split into T-029a / T-029b
- **Blocks:** T-026b, T-030
- **Blocked by:** T-013, T-022
- **Description:**
  Two-image upload per SPEC §4.6 / decision context. See split tasks for the split — note the aspect-ratio target is best known *after* the PPTX placeholder mapping (T-026 in slice 8). Decision recorded here in the plan: implement upload with a **provisional aspect ratio of 16:9** for the resize bounding box, and add a follow-up task T-029c to revisit the ratio once `docs/pptx-mapping.md` is signed off. Recorded as an assumption — implementer must add an entry to `DECISIONS.md` before merging T-029.
- **Acceptance criteria:** see split tasks.
- **Files likely touched:** see split tasks.
- **Pause-triggers anticipated:** §7.4 (UI), §7.1 (Pillow, `multer` or Next.js form-data handling).

---

### T-029a Image upload — TS frontend + Next.js route handler
- **Status:** ⬜ TODO
- **Feature:** studies (images)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-029b, T-026b
- **Blocked by:** T-013, T-022
- **Description:**
  Implement the upload UI in step 7 (BEFORE + AFTER slots) and the Next.js POST route at `/api/studies/[id]/images`. Client-side checks: MIME in `{image/jpeg, image/png, image/webp}`, size ≤10 MB. Server-side checks: same MIME allow-list (sniffed), size, and pixel-dimension cap ≤4000×4000 via `image-size` lib. Route saves the original file to `./uploads/studies/<studyId>/original/<uuid>.<ext>` and forwards to the Python image processor (T-029b). DB entry created in `StudyImage` with `unique(studyId, type)` enforced.
- **Acceptance criteria:**
  - [ ] Replacing an image of the same type updates the existing row (does not create a duplicate).
  - [ ] Oversize / wrong-MIME files rejected with a German error message.
  - [ ] Filenames are UUID-based; original extension preserved.
  - [ ] Audit-log `CREATE` / `UPDATE` entry for `StudyImage`.
  - [ ] Path traversal attempts (`../../`) rejected.
- **Files likely touched:** `src/features/studies/components/image-uploader.tsx`, `src/app/api/studies/[id]/images/route.ts`, `src/features/studies/services/image-service.ts`.
- **Pause-triggers anticipated:** §7.1 (`image-size` or sharp).

---

### T-029b Image processing — Pillow resize in Python service
- **Status:** ⬜ TODO
- **Feature:** python service (images)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-029c
- **Blocked by:** T-029a, T-006
- **Description:**
  Add `app/services/image_processor.py` exposing `process_image(input_path, output_path, target_ratio)` — opens with Pillow, fits to bounding box with the provisional 16:9 aspect ratio (decision recorded in T-029), saves optimized JPEG/PNG/WebP at quality 85. Add FastAPI endpoint `POST /images/process` accepting `{input_path, output_path, target_ratio}`. Original retained per SPEC §4.6 (only the processed version goes into the slide).
- **Acceptance criteria:**
  - [ ] Pillow installed via `requirements.txt`.
  - [ ] Endpoint returns 200 with `{ width, height, file_size_bytes }`.
  - [ ] Resize completes in <5s for a 10 MB original (SPEC §6.2).
  - [ ] Pytest covers JPG, PNG, WebP fixtures + an oversize fixture.
  - [ ] Original file untouched on disk.
- **Files likely touched:** `services/python/app/services/image_processor.py`, `services/python/app/api/images.py`, `services/python/requirements.txt`, `services/python/tests/test_image_processor.py`.
- **Pause-triggers anticipated:** §7.1 (`Pillow` install).

---

### T-029c Revisit image aspect ratio after PPTX mapping sign-off
- **Status:** ⬜ TODO
- **Feature:** studies (images)
- **Type:** refactor
- **Effort:** S
- **Blocks:** —
- **Blocked by:** T-029b, T-036
- **Description:**
  Once `docs/pptx-mapping.md` (T-036) is signed off and the image placeholder dimensions are known from the template, replace the provisional 16:9 aspect ratio in `image_processor.py` with the actual value. Record the change in `DECISIONS.md`. If any existing study has already uploaded images with the old ratio, re-process them via a one-shot script (no auto-purge of originals — they're retained per SPEC §4.6).
- **Acceptance criteria:**
  - [ ] `image_processor.py` references a single named constant for the target ratio.
  - [ ] Old `DECISIONS.md` assumption marked superseded.
  - [ ] Re-processing script runs idempotently against existing images.
  - [ ] Pytest reflects the corrected ratio.
- **Files likely touched:** `services/python/app/services/image_processor.py`, `services/python/scripts/reprocess_images.py`, `DECISIONS.md`.
- **Pause-triggers anticipated:** §7.4 (changes visible-in-PDF area — must surface).

---

### T-030 F6 hand-over flow + F7 admin god-mode access
- **Status:** ⬜ TODO
- **Feature:** studies
- **Type:** feat
- **Effort:** M
- **Blocks:** T-040
- **Blocked by:** T-028
- **Description:**
  Per SPEC §4.3 F6: the owning consultant or an admin can hand a study over to another consultant. UI: dropdown of active Beraters in a confirmation dialog, audit-log `HANDOVER` entry with `changeSet` containing `{from, to}`. Per F7: admin sees and can edit any study regardless of `consultantId` — extend the study repository to bypass the consultant filter when `role === 'ADMIN'`.
- **Acceptance criteria:**
  - [ ] Berater cannot hand over a study they don't own (server-side enforced).
  - [ ] Confirmation dialog blocks accidental reassignment.
  - [ ] Audit-log entry includes `userId` of the actor, `entityId` of the study, `changeSet={from,to}`.
  - [ ] Admin can open and edit any study; non-admin gets 403 + full error page on others' studies.
  - [ ] Playwright covers F6 happy path and the 403 path.
- **Files likely touched:** `src/features/studies/components/handover-dialog.tsx`, `src/features/studies/services/handover-study.ts`, `src/lib/repositories/study.repository.ts`.
- **Pause-triggers anticipated:** none (no auth-logic changes, just role gates).

---

### Slice 6 — (merged into Slice 5 via T-029)

*(Image upload is handled by T-029a / T-029b / T-029c within slice 5.)*

---

### Slice 7 — Calculation logic (TS + Py mirror)

*(T-031, T-032, T-033 and T-034 carried forward to Recently completed — all gemerged via PR #40 as Slice 2 vertical.)*

---

### Slice 8 — Python service + PPTX template wiring

*(T-035 and T-036 carried forward to Recently completed — see entries below.)*

---

*(T-037 carried forward to Recently completed — see entry below.)*

---

### Slice 9 — PDF rendering

*(T-038, T-038a, T-038b and T-039 carried forward to Recently completed — all gemerged via PR #42 as Slice-3b vertical.)*

---

### Slice 10 — Document history

*(T-040 carried forward to Recently completed — gemerged via PR #42 as part of the Slice-3b vertical.)*

---

### Slice 11 — Admin user management

### T-041 Admin users CRUD + deactivate + hard-delete + reset password
- **Status:** ⬜ TODO
- **Feature:** users (admin)
- **Type:** feat
- **Effort:** L → split into T-041a / T-041b
- **Blocks:** T-042
- **Blocked by:** T-019, T-028
- **Description:**
  Admin-only `/admin/users` area for managing consultant accounts. See split tasks below for the split: T-041a covers create / edit / deactivate, T-041b covers hard-delete (DSGVO-relevant) and reset-password.
- **Acceptance criteria:** see split tasks.
- **Files likely touched:** see split tasks.
- **Pause-triggers anticipated:** §7.3 (auth-adjacent), §7.11 (hard-delete touches personal data).

---

### T-041a Admin users — create / edit / deactivate
- **Status:** ⬜ TODO
- **Feature:** users (admin)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-041b
- **Blocked by:** T-019, T-028
- **Description:**
  `/admin/users` list (TanStack Table, columns: name | email | role | active | last login | actions), `/admin/users/new` and `/admin/users/[id]/edit` forms. Create generates a random temp password, sets `mustChangePassword=true`, persists the user, returns the temp password to the admin in a one-time toast — never store it plaintext. Deactivate sets `active=false`; reactivate sets `active=true`. Soft-delete sets `deletedAt=now` and removes from the list. Audit-log entries for `CREATE`, `UPDATE`, `SOFT_DELETE` on `User`.
- **Acceptance criteria:**
  - [ ] Only `ADMIN` can access the area (403 + full error page otherwise).
  - [ ] Temp password shown once and cleared from memory.
  - [ ] Deactivated users cannot log in (checked by T-017).
  - [ ] Audit-log entries with `userId` of the actor.
  - [ ] Playwright covers F5 (admin user management happy path).
- **Files likely touched:** `src/app/(admin)/admin/users/**`, `src/features/users/components/**`, `src/features/users/services/**`.
- **Pause-triggers anticipated:** §7.3.

---

### T-041b Admin users — reset password + hard-delete (DSGVO)
- **Status:** ⬜ TODO
- **Feature:** users (admin)
- **Type:** feat
- **Effort:** M
- **Blocks:** —
- **Blocked by:** T-041a
- **Description:**
  "Passwort zurücksetzen" button generates a new temp password (one-time toast to the admin), sets `mustChangePassword=true`, clears `failedLoginCount`/`lockoutUntil`, writes `AuditLog` `PASSWORD_RESET`. "DSGVO-Löschung" button on a *soft-deleted* user triggers a hard-delete dialog requiring the admin to type the user's email to confirm; cascades clean removal of dependent rows that don't violate audit-log integrity (audit log entries kept with `userId` retained for legal record). Writes a `RETENTION_NOTICE` audit entry referencing the hard-delete.
- **Acceptance criteria:**
  - [ ] Reset issues a new temp password and forces change on next login.
  - [ ] Hard-delete only available on already-soft-deleted users.
  - [ ] Confirmation requires typed email match.
  - [ ] Audit log preserved (entries retain `userId` even though the user row is gone).
  - [ ] Playwright covers the reset flow and the hard-delete dialog (both confirm + cancel).
- **Files likely touched:** `src/features/users/services/reset-password.ts`, `src/features/users/services/hard-delete-user.ts`, `src/app/(admin)/admin/users/[id]/dsgvo-delete/page.tsx`.
- **Pause-triggers anticipated:** §7.11 (DSGVO hard-delete), §7.3 (password reset).

---

### Slice 12 — SMTP settings (admin)

### T-042 AES-256-GCM crypto module for SMTP settings
- **Status:** ⬜ TODO
- **Feature:** settings
- **Type:** feat
- **Effort:** M
- **Blocks:** T-043, T-044
- **Blocked by:** T-013
- **Description:**
  Per **DECISIONS.md decision #4**, implement `src/features/settings/crypto.ts` with `encrypt(plain): string` and `decrypt(blob): string`. Algorithm AES-256-GCM via Node's `crypto`. Key loaded from `SETTINGS_ENCRYPTION_KEY` (32 bytes, base64-decoded); 12-byte random nonce per call; storage format `base64(nonce)|base64(ciphertext)|base64(tag)`. Throw if the env var is missing or wrong length. Add to `.env.example` with placeholder value + a comment that generation is `openssl rand -base64 32`.
- **Acceptance criteria:**
  - [ ] Roundtrip test (`encrypt` → `decrypt`) passes.
  - [ ] Tampering with any of the three segments causes `decrypt` to throw (auth tag verification).
  - [ ] Wrong-key decryption fails with a clear error (not silent garbage).
  - [ ] Missing/short `SETTINGS_ENCRYPTION_KEY` throws on first call.
  - [ ] Module coverage = 100%.
- **Files likely touched:** `src/features/settings/crypto.ts`, `src/features/settings/crypto.test.ts`, `.env.example`.
- **Pause-triggers anticipated:** §7.3 (security primitive).

---

### T-043 SMTP settings admin UI + Setting table CRUD
- **Status:** ⬜ TODO
- **Feature:** settings
- **Type:** feat
- **Effort:** M
- **Blocks:** T-044
- **Blocked by:** T-042, T-041a
- **Description:**
  `/admin/settings` (admin-only) form for SMTP config: `smtp.host`, `smtp.port`, `smtp.user`, `smtp.passwordEnc` (password input → encrypted via T-042 before persistence), `smtp.from`, `retention.years` (default 10 per SPEC §6.1). Each field stored as one row in `Setting` (the password row is the only encrypted value). Read of decrypted password only on demand inside the SMTP send flow. Audit-log `UPDATE` entry for each changed key with `changeSet` recording the key names changed (never the values).
- **Acceptance criteria:**
  - [ ] Only `ADMIN` can access; non-admin gets 403.
  - [ ] Password field input value never echoed back; on edit, the field shows a placeholder and saves only if non-empty.
  - [ ] Audit-log entries never include the plaintext password.
  - [ ] Decrypted password kept in memory only inside the SMTP send call.
  - [ ] Playwright covers the save flow and round-trip read.
- **Files likely touched:** `src/app/(admin)/admin/settings/page.tsx`, `src/features/settings/components/smtp-settings-form.tsx`, `src/features/settings/services/setting-service.ts`.
- **Pause-triggers anticipated:** §7.3 (secret handling).

---

### T-044 Test-send button + wire lockout admin alert to real SMTP
- **Status:** ⬜ TODO
- **Feature:** settings
- **Type:** feat
- **Effort:** M
- **Blocks:** T-046
- **Blocked by:** T-043, T-020
- **Description:**
  Add a "Test-Mail senden" button on the settings page that sends a fixed test message to the admin email. Implement `src/features/settings/services/smtp-sender.ts` (Nodemailer or built-in). Replace the no-op `notifyAdminLockout` stub from T-020 with this real sender. Failures handled gracefully — the test button shows a toast, real lockout alerts log to audit and don't throw if SMTP is unconfigured (system continues to function).
- **Acceptance criteria:**
  - [ ] Test send delivers a basic plain-text email when SMTP is configured.
  - [ ] Lockout flow (10 failed attempts) triggers a real email + audit entry when SMTP configured.
  - [ ] If SMTP is unconfigured, lockout alert silently degrades to audit-entry-only (no crash).
  - [ ] No SMTP password is ever logged.
  - [ ] Pytest/Vitest covers the configured + unconfigured branches with a mocked transport.
- **Files likely touched:** `src/features/settings/services/smtp-sender.ts`, `src/features/auth/services/admin-alert.ts` (replace stub), `src/features/settings/components/smtp-settings-form.tsx` (test button).
- **Pause-triggers anticipated:** §7.1 (`nodemailer` install), §7.6 (outbound SMTP is an external integration — must surface explicitly before the first test send).

---

### Slice 13 — Audit-log admin view

### T-045 Audit-log read-only admin view with filters + pagination
- **Status:** ⬜ TODO
- **Feature:** audit
- **Type:** feat
- **Effort:** M
- **Blocks:** T-046
- **Blocked by:** T-041a
- **Description:**
  `/admin/audit` admin-only page listing `AuditLog` rows. Columns: timestamp | user | action | entityType | entityId | changeSet preview | ipAddress. Filters: entityType, action, date range, user. Pagination 50/100/200. No edit/delete buttons anywhere — UI never exposes mutations. Server-side: the audit repository explicitly does **not** export `update` or `delete` methods (append-only at the application layer).
- **Acceptance criteria:**
  - [ ] Only `ADMIN` can access.
  - [ ] Filters compose correctly (entityType + action + date range together).
  - [ ] `changeSet` rendered as collapsible JSON.
  - [ ] No `PUT`/`PATCH`/`DELETE` route handler exists for `/api/audit/*`.
  - [ ] Repository file inspected: no `update` / `delete` exports; ESLint or unit test enforces this.
  - [ ] Playwright covers filter combinations.
- **Files likely touched:** `src/app/(admin)/admin/audit/page.tsx`, `src/features/audit/components/audit-table.tsx`, `src/features/audit/services/audit-service.ts`, `src/lib/repositories/audit-log.repository.ts`.
- **Pause-triggers anticipated:** §7.11 (audit log is DSGVO-adjacent — confirm append-only is enforced).

---

### Slice 14 — Retention cron (Python service)

### T-046 APScheduler in-memory daily retention job + notice audit entries
- **Status:** ⬜ TODO
- **Feature:** python service (retention)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-047
- **Blocked by:** T-044, T-045
- **Description:**
  Per **DECISIONS.md decision #8**, install `apscheduler` in the Python service. Add `app/services/retention.py` with `find_studies_approaching_expiry(now)` and `emit_retention_notices(studies)`. Register a `BackgroundScheduler` (`MemoryJobStore`) in `app/main.py` on startup, configured to run the job daily at 02:00 UTC. The job queries studies whose `createdAt + retention_years` (from `Setting`, default 10) falls within the next 60 days; writes a `RETENTION_NOTICE` `AuditLog` entry **and** an in-app admin notification for each study hitting the 60 / 30 / 7-day mark (idempotent — don't double-notify on subsequent days). **Never** auto-deletes anything. On scheduler shutdown, jobs are dropped per V2 backlog note about persistent store.
- **Acceptance criteria:**
  - [ ] Scheduler boots with the FastAPI app and shuts down cleanly.
  - [ ] Daily job is idempotent: running it twice on the same day produces one notice per study/threshold, not two.
  - [ ] `RETENTION_NOTICE` audit entries written with the study ID and threshold (60/30/7).
  - [ ] No path produces a hard-delete from the cron.
  - [ ] Pytest covers all three threshold paths with synthetic dates (fake-clock pattern).
- **Files likely touched:** `services/python/app/services/retention.py`, `services/python/app/main.py`, `services/python/requirements.txt`, `services/python/tests/test_retention.py`.
- **Pause-triggers anticipated:** §7.1 (`apscheduler` install), §7.11 (DSGVO retention behaviour).

---

### T-047 In-app admin notifications feed + retention notice surface
- **Status:** ⬜ TODO
- **Feature:** audit (notifications)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-048
- **Blocked by:** T-046
- **Description:**
  Add a lightweight `Notification` table (new table — additive, no risky schema change) with `id`, `userId` (admin receiver), `kind` (`RETENTION_NOTICE` initially), `payload Json`, `readAt`, `createdAt`. Python retention job writes rows via a new internal endpoint `POST /notifications/admin` on the Next.js side (or directly via Prisma if you add a sidecar — pick one and document in `DECISIONS.md`). Admin sees a bell icon with unread count; opening the panel lists notices linking to the study. Mark-as-read on click.
- **Acceptance criteria:**
  - [ ] New `Notification` Prisma model + migration added.
  - [ ] Bell icon shows unread count; clicking marks read.
  - [ ] Each notice links to the relevant study.
  - [ ] Berater users don't see admin notifications.
  - [ ] Playwright covers the unread-then-read flow.
- **Files likely touched:** `prisma/schema.prisma`, `prisma/migrations/<timestamp>_notifications/`, `src/features/notifications/components/notification-bell.tsx`, `src/app/api/notifications/admin/route.ts`.
- **Pause-triggers anticipated:** none (additive table only — see CLAUDE.md §7.2 exception). §7.11 keep in mind.

---

### T-048 Admin DSGVO hard-delete UI for Study (retention follow-through)
- **Status:** ⬜ TODO
- **Feature:** studies (admin)
- **Type:** feat
- **Effort:** M
- **Blocks:** —
- **Blocked by:** T-047
- **Description:**
  Add a "DSGVO-Löschung" admin action on each `Study` once it's past retention (or when a `RETENTION_NOTICE` exists). Dialog requires the admin to type the customer's last name to confirm. Cascade-deletes `StudyImage`, `GeneratedDocument`, and on-disk files under `./uploads/studies/<id>/` and `./generated/<id>/`. Audit-log entry `DELETE` (with `entityType="Study"`, `entityId`, `changeSet` summarising what was deleted; **never** the personal data itself). Berater never sees this action.
- **Acceptance criteria:**
  - [ ] Action only visible to admin and only on studies eligible per retention or with an unresolved `RETENTION_NOTICE`.
  - [ ] Confirmation requires typed customer last name match.
  - [ ] All files on disk removed (verified post-delete).
  - [ ] Audit-log entry written; entry does NOT contain personal data.
  - [ ] Playwright covers happy path + cancel.
- **Files likely touched:** `src/app/(admin)/admin/studies/[id]/dsgvo-delete/page.tsx`, `src/features/studies/services/hard-delete-study.ts`.
- **Pause-triggers anticipated:** §7.11 (DSGVO hard-delete — most-sensitive operation in the app).

---

### Slice 15 — Polish

### T-048b GreenScout SVG logo integration
- **Status:** ⬜ TODO
- **Feature:** chore (assets)
- **Type:** feat
- **Effort:** S
- **Blocks:** —
- **Blocked by:** T-018
- **Description:**
  Replace the text-only `"GreenScout"` placeholder in `src/app/(auth)/layout.tsx` and other brand-surfaces with the actual GreenScout SVG logo, extracted from the existing GreenScout-Stylesheet/Brand-Guide assets. Provide responsive sizing (mobile: h-8, desktop: h-10 typical) and ensure proper contrast on `bg-background`. Add the SVG as `public/brand/greenscout-logo.svg` (or `.tsx` if inline-stroke colour required for theming). Consider also adding a favicon variant if not already in place.
- **Acceptance criteria:**
  - [ ] `public/brand/greenscout-logo.svg` exists with the official logo glyph.
  - [ ] `src/app/(auth)/layout.tsx` (and any other brand surfaces) use the SVG instead of the text placeholder.
  - [ ] Logo renders crisp at 1x and 2x dpi.
  - [ ] Tab title still reads "Anmeldung — GreenScout"; the visible h1 swap from text to SVG doesn't break aria semantics (alt text or sr-only fallback).
- **Files likely touched:** `public/brand/greenscout-logo.svg` (new), `src/app/(auth)/layout.tsx`, possibly `src/app/layout.tsx` (root) for favicon.
- **Pause-triggers anticipated:** §7.4 if the logo introduces colors outside the SPEC §8.1 palette — confirm before merging.

---

### T-049 Centralised German i18n dictionary `src/i18n/de.ts`
- **Status:** ⬜ TODO
- **Feature:** i18n
- **Type:** chore
- **Effort:** M
- **Blocks:** T-053
- **Blocked by:** T-018
- **Description:**
  Audit every user-facing string introduced in prior slices, move it into `src/i18n/de.ts` keyed by feature (`auth.login.title`, `studies.wizard.step1.heading`, etc.), and refactor components to import from the dictionary. Distinguish "Du" strings (internal UI) from "Sie" strings (any customer-facing output) by namespace prefix. ESLint rule or doc-lint catches inline German strings outside `de.ts`.
- **Acceptance criteria:**
  - [ ] `src/i18n/de.ts` is the single source of all UI strings.
  - [ ] "Du" vs "Sie" namespaces clearly separated.
  - [ ] Grep test fails the PR if a non-trivial German string appears outside `de.ts`.
  - [ ] Existing Playwright tests still pass.
- **Files likely touched:** `src/i18n/de.ts`, every UI component touched in prior slices.
- **Pause-triggers anticipated:** none.

---

### T-050 CSP tightening + error pages (404 / 403 / 500)
- **Status:** ⬜ TODO
- **Feature:** chore (security + ux)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-053
- **Blocked by:** T-021
- **Description:**
  Tighten the CSP from T-021: remove `'unsafe-inline'` on styles (use nonces or Tailwind's static output), confirm `script-src` is `'self'` plus the Next.js inline-bootstrap nonce only. Add custom error pages: `src/app/not-found.tsx` (404), `src/app/forbidden/page.tsx` (403), `src/app/error.tsx` (500) per SPEC §4.9 full-error-page pattern. All pages use design tokens, German microcopy.
- **Acceptance criteria:**
  - [ ] CSP has no `unsafe-inline` (verified in browser).
  - [ ] All three error pages render with proper status codes.
  - [ ] Forbidden page reached by non-admin hitting an admin route.
  - [ ] 500 page reached on a deliberate thrown error in a test route.
  - [ ] Playwright covers each error page.
- **Files likely touched:** `src/middleware.ts`, `src/app/not-found.tsx`, `src/app/forbidden/page.tsx`, `src/app/error.tsx`.
- **Pause-triggers anticipated:** §7.3 (security headers).

---

*(T-050a carried forward to Recently completed — see entry below.)*

### T-050b Production reverse-proxy hardening (HSTS + TLS termination)
- **Status:** ⬜ TODO
- **Feature:** chore (deployment)
- **Type:** feat
- **Effort:** S
- **Blocks:** —
- **Blocked by:** T-021
- **Description:**
  Configure the VPS reverse-proxy (likely Caddy given Hetzner conventions; Traefik or nginx also valid) to: (a) enforce HSTS via `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, (b) terminate TLS at the proxy (Let's Encrypt cert), (c) force-redirect HTTP → HTTPS, (d) forward `X-Forwarded-For` + `X-Forwarded-Proto` to the upstream Next.js. Per DECISIONS T-021 corrective: HSTS lives at the proxy, NOT in middleware (dev-HTTP would otherwise leak the directive and lock the dev hostname into HTTPS-only for months). Agent authors the config snippets in `docs/deployment.md`; **production execution is human-only per §8.10**.
- **Acceptance criteria:**
  - [ ] `docs/deployment.md` contains a fully-formed Caddyfile (or equivalent for Traefik / nginx) ready to drop on the VPS.
  - [ ] HSTS header value matches the SPEC §6.3 baseline (`max-age=63072000; includeSubDomains; preload`).
  - [ ] HTTP → HTTPS redirect rule documented.
  - [ ] X-Forwarded-* propagation documented so Auth.js v5 `trustHost` works correctly.
  - [ ] §8.10 reminder explicit: agent never executes `caddy reload` or equivalent against the VPS.
- **Files likely touched:** `docs/deployment.md` (new or extension), possibly a `deploy/Caddyfile.example` template.
- **Pause-triggers anticipated:** §8.10 (production target — config is authored only, never applied).

---

### T-051 Playwright E2E suite for F1–F7
- **Status:** ⬜ TODO
- **Feature:** test
- **Type:** test
- **Effort:** L → split into T-051a / T-051b
- **Blocks:** T-053
- **Blocked by:** T-040, T-041a
- **Description:**
  End-to-end happy-path coverage of every flow in SPEC §4.3. Split into two PRs for review tractability. See T-051a / T-051b.
- **Acceptance criteria:** see split tasks.
- **Files likely touched:** see split tasks.
- **Pause-triggers anticipated:** none.

---

### T-051a Playwright E2E — F1, F2, F3, F4
- **Status:** ⬜ TODO
- **Feature:** test
- **Type:** test
- **Effort:** M
- **Blocks:** T-051b
- **Blocked by:** T-040
- **Description:**
  Author Playwright specs for F1 (login + forced password change on first login), F2 (create new study from dashboard), F3 (open existing study → generate document → download PPTX+PDF), F4 (edit existing study → re-generate → new version appears in version list). Use a seeded test DB. Tests run headless in CI.
- **Acceptance criteria:**
  - [ ] All four flows green in CI.
  - [ ] Tests use page-object pattern; selectors are role-based (a11y-friendly).
  - [ ] Test fixtures include a non-first-login admin and a first-login Berater.
- **Files likely touched:** `e2e/auth.spec.ts`, `e2e/study-create.spec.ts`, `e2e/document-generate.spec.ts`, `e2e/fixtures/**`, `playwright.config.ts`.
- **Pause-triggers anticipated:** §7.1 (`@playwright/test` install).

---

### T-051b Playwright E2E — F5, F6, F7
- **Status:** ⬜ TODO
- **Feature:** test
- **Type:** test
- **Effort:** M
- **Blocks:** T-053
- **Blocked by:** T-051a, T-041a
- **Description:**
  Author Playwright specs for F5 (admin user CRUD + reset password), F6 (study hand-over to another consultant), F7 (admin god-mode editing another consultant's study).
- **Acceptance criteria:**
  - [ ] All three flows green in CI.
  - [ ] F5 verifies the temp password is shown once.
  - [ ] F6 verifies the audit-log entry presence in the admin audit view.
  - [ ] F7 verifies non-admin gets 403 on the same route.
- **Files likely touched:** `e2e/admin-users.spec.ts`, `e2e/handover.spec.ts`, `e2e/admin-god-mode.spec.ts`.
- **Pause-triggers anticipated:** none.

---

### T-052 Docker Compose smoke test (compose up → all services healthy)
- **Status:** ⬜ TODO
- **Feature:** chore (docker)
- **Type:** test
- **Effort:** S
- **Blocks:** T-053
- **Blocked by:** T-039, T-046
- **Description:**
  Add a smoke script (`scripts/smoke.sh` for POSIX, `scripts/smoke.ps1` for PowerShell) that runs `docker compose up -d`, waits for `web` to serve `/api/health`, `pyservice` to serve `/health`, and `db` to accept connections. CI runs this in a dedicated job after image builds.
- **Acceptance criteria:**
  - [ ] Script exits 0 when all three healthchecks pass within 60 s.
  - [ ] Script exits non-zero with structured logs on any failure.
  - [ ] CI job invokes the script and tears down with `docker compose down -v` afterwards.
- **Files likely touched:** `scripts/smoke.sh`, `scripts/smoke.ps1`, `.github/workflows/ci.yml`.
- **Pause-triggers anticipated:** §8.10 reminder — script must never target production hostnames.

---

### T-053 README + CONTRIBUTING + final docs sweep
- **Status:** ⬜ TODO
- **Feature:** docs
- **Type:** docs
- **Effort:** M
- **Blocks:** —
- **Blocked by:** T-049, T-050, T-051b, T-052
- **Description:**
  Author `README.md` (project overview, quickstart, local dev steps for both Node and Python, link to `SPEC.md`, `CLAUDE.md`, `DECISIONS.md`) and `CONTRIBUTING.md` (branch naming, conventional commits, pre-commit gates, CI requirements, pause-trigger reminder). Audit `docs/` directory for stragglers (calc-sources, pptx-mapping, db, docker, ci, python-service, pre-commit) and ensure each is linked from the README. Sweep for any TODO(claude) markers left behind and either resolve or escalate.
- **Acceptance criteria:**
  - [ ] README covers setup → run → test → build for both Next.js and Python.
  - [ ] CONTRIBUTING covers branch naming, commit style, pre-commit gates, and the "pause and ask" rule.
  - [ ] All files in `docs/` are linked from README.
  - [ ] No `TODO(claude):` markers remain unresolved at this point.
- **Files likely touched:** `README.md`, `CONTRIBUTING.md`, `docs/**`.
- **Pause-triggers anticipated:** none.

---

## Future (Phase 3)

*(parked items — not actionable in MVP, kept here as placeholders so the scope decision is visible)*

- **PV-Sol-Output-Upload (PDF/CSV).** Phase 3 — per **DECISIONS.md decision #7**, MVP keeps Modulanzahl / Modulfläche / Eigenverbrauchsquote / Netzeinspeisung as manual numeric fields. Future scope: accept a PV-Sol export, parse it, prefill those fields. Any premature "small optional upload" idea during MVP is a Pause-Trigger §7.6 (external integration).
- **SMTP-encryption key rotation with `encryption_key_version` column on `Setting`.** V2 — per **DECISIONS.md decision #4**, MVP uses a single static `SETTINGS_ENCRYPTION_KEY`. When this lands, add a versioned column and a re-encrypt-all-rows migration script.
- **APScheduler persistence via `SQLAlchemyJobStore`.** V2 hardening — per **DECISIONS.md decision #8**, MVP uses in-memory jobs (dropped on container restart). When this lands, jobs survive restarts and missed-fire policy becomes explicit.
- **Common-password blocklist as 6th password rule.** Phase 3 — per DECISIONS T-016 design (decision (c) Vorschlag), MVP relies on rule-based password validation only. Future: add a `commonPasswordsBlocklist` Set (offline, e.g. derived from Bitwarden's published Top-N list) as a 6th rule predicate. No external API call; bundle the wordlist at build time.
- **Password-history (prevent reuse of last N passwords).** Phase 3 — per DECISIONS T-016 design (decision (d) Vorschlag), MVP allows password reuse on rotation. Future: new `PasswordHistory` table tracking last N argon2id hashes per user. **Schema-Änderung → §7-pause-trigger when picked up.** Cleanup policy: rolling window per user (keep latest N, delete older).

---

## Recently completed
*(implementer / reviewer move tasks here once merged. Newest first.)*

### T-040 ✅ Generated document persistence + per-study version list UI
- **Merged:** 2026-05-26 via PR #42 (Slice 3b vertical).
- **Branch:** `feat/pptx-pdf-generator-and-versions`
- **Summary:** `generateDocumentAction` Server Action wires the per-study "Dokument generieren"-Button on the study detail page to the Python `POST /api/documents/generate` endpoint via `callDocumentsGenerate`. On success, two `GeneratedDocument` rows (PPTX + PDF) are persisted with `studyId`, `generatedById`, `filename = <consultantLastName>_<customerLastName>_<objectSlug>_v<NN>_<YYYY-MM-DD>.<ext>` (slug = lowercase ASCII-folded, max 40 chars), `generatedAt`. Files written under `./generated/<studyId>/<filename>`. `Study.status` flipped to `GENERATED` and `Study.generatedAt = now` inside the same `$transaction` as the document rows. `AuditLog` `GENERATE_DOCUMENT` entry recorded per generation. Per-study "Versionen"-Panel lists every version newest-first with download buttons; `/api/studies/[id]/documents/[docId]/download` serves the file with `Content-Disposition: attachment` and the original filename preserved. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 3b (T-037/T-038a/T-038b/T-039/T-040) silent decisions per §14 (consolidated)".

### T-039 ✅ LibreOffice headless PDF render + Python service Dockerfile update
- **Merged:** 2026-05-26 via PR #42 (Slice 3b vertical).
- **Branch:** `feat/pptx-pdf-generator-and-versions`
- **Summary:** `services/python/app/services/pdf_renderer.py` invokes `libreoffice --headless --convert-to pdf --outdir <out> <input.pptx>` via `subprocess.run` with a hard 30 s timeout (SPEC §6.2). `services/python/Dockerfile` switched from `python:3.12-slim` to `python:3.12-bookworm` (alpine doesn't ship LibreOffice in a usable form) and installs `libreoffice` + `fonts-dejavu-core` via `apt-get install -y --no-install-recommends`. `POST /api/documents/generate` (T-035 stub replaced) now chains PPTX gen → PDF render → returns `DocumentGenerateResponse` with both file paths + metadata; structured error envelope surfaces timeout / missing-LibreOffice / render-fail cases so the Next.js banner can render the correct message per SPEC §4.9. Pytest covers happy, timeout, and LibreOffice-missing paths via subprocess mock + a real LibreOffice integration test gated behind `@pytest.mark.libreoffice`. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 3b (T-037/T-038a/T-038b/T-039/T-040) silent decisions per §14 (consolidated)".

### T-038b ✅ PPTX image-placeholder replacement
- **Merged:** 2026-05-26 via PR #42 (Slice 3b vertical).
- **Branch:** `feat/pptx-pdf-generator-and-versions`
- **Summary:** Image-insertion half of `pptx_generator.py`: locates shapes named `{{image_before}}` / `{{image_after}}`, captures `left/top/width/height`, removes the placeholder, inserts a new picture at the same position scaled to fit while preserving aspect ratio (centered with letterbox where needed). Both images required — `MissingImageError` raised with a clear message if either is absent, surfaced via the Next.js error banner. Pytest covers happy path + missing-image path with fixture images. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 3b (T-037/T-038a/T-038b/T-039/T-040) silent decisions per §14 (consolidated)".

### T-038a ✅ PPTX text-placeholder replacement
- **Merged:** 2026-05-26 via PR #42 (Slice 3b vertical).
- **Branch:** `feat/pptx-pdf-generator-and-versions`
- **Summary:** Text-replacement half of `services/python/app/services/pptx_generator.py`: walks every shape in every slide, finds `{{snake_case_key}}` tokens **across runs** (handles python-pptx's run-split quirk by stitching consecutive runs together when a token is split), replaces with the value formatted per SPEC §8.3 (German numbers `1.234,56`, currency `27.500 €` with NBSP, dates `DD.MM.YYYY HH:mm`). Run-level font / colour / size preserved. Long-text fields rely on `MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE` set in T-037. Unit test uses a fixture template with 5 known placeholders + asserts run.font properties stay untouched. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 3b (T-037/T-038a/T-038b/T-039/T-040) silent decisions per §14 (consolidated)".

### T-037 ✅ Apply `{{snake_case}}` placeholders to the PPTX template (post-sign-off)
- **Merged:** 2026-05-26 via PR #42 (Slice 3b vertical).
- **Branch:** `feat/pptx-pdf-generator-and-versions`
- **Summary:** `templates/Machbarkeitsstudie-PV-Template_v1_6.pptx` edited via `python-pptx`: every red `#FF0000` literal from the signed-off `docs/pptx-mapping.md` replaced with its `{{snake_case_key}}` placeholder. Run-level formatting (font, red colour, size) preserved. `MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE` set on long-text frames (customer name, object address, object name). Image-placeholder shapes renamed to `{{image_before}}` / `{{image_after}}` so the generator can locate them by shape name. One-off script `services/python/scripts/apply_placeholders.py` performs the edits idempotently from the mapping doc; running it twice produces deterministic results. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 3b (T-037/T-038a/T-038b/T-039/T-040) silent decisions per §14 (consolidated)".

### T-036 ✅ Author `docs/pptx-mapping.md` from the existing template
- **Merged:** 2026-05-26 via PR #41 (Slice 3a vertical).
- **Branch:** `feat/document-gen-backend-and-mapping`
- **Summary:** First-pass extraction of every red `#FF0000` literal in `templates/Machbarkeitsstudie-PV-Template_v1_6.pptx` into `docs/pptx-mapping.md`, with `snake_case` placeholder keys aligned to `StudyCalcInput` / `DerivedValues` / Prisma `Study|Customer|User` fields. Three-column slide-by-slide table (Slide # | Shape ⏐ run | Current literal | Proposed key | Source | Notes), aggregated keylist (alphabetical, deduplicated), and disambiguation summary surfacing the six items requiring user resolution (Slide-5 `468.982`, Slide-14 ohne-PV / mit-PV formulas, Slide-19 Telefon/E-Mail rotation, Slide-4 + 5 image-shape mapping, Slide-9 vs 12/14/15 ct-unification). Sign-off checklist + provenance pointer (stdlib-only `scripts/inspect-pptx.py`) included. Template untouched per T-036's "no PPTX edits" gate. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "T-035/T-036 silent decisions for Slice 3a (consolidated §14)".

### T-035 ✅ FastAPI calc/documents/version endpoints + Next.js python-service-client
- **Merged:** 2026-05-26 via PR #41 (Slice 3a vertical).
- **Branch:** `feat/document-gen-backend-and-mapping`
- **Summary:** Python side: `app/api/endpoints/calc.py` (`POST /api/calc` → `compose_all` → `DerivedValues`, X-API-Key gated), `app/api/endpoints/documents.py` (`POST /api/documents/generate` — Slice-3a STUB returning typed 501 `DocumentGeneratePendingResponse` until placeholder sign-off lands), `app/api/endpoints/version.py` (`GET /version` unauthenticated), `app/api/dependencies.py` (`verify_api_key` shared-secret guard via `secrets.compare_digest` against `PYTHON_SERVICE_API_KEY` env, lazy-resolved to keep `/health` + `/version` reachable without env setup). Pydantic v2 schemas in `app/schemas/`: `calc.py` (`StudyCalcInput`, `DerivedValues`, all-non-negative validation), `documents.py` (`DocumentGenerateRequest`, `DocumentGenerateResponse`, `DocumentGeneratePendingResponse`), `version.py`. Next.js side: `src/lib/python-service-client.ts` with `callCalc` + `callDocumentsGenerate`, camelCase ↔ snake_case shallow-translator at the boundary, `PythonServiceCallResult<T>` discriminated union (`unauthorized | bad-request | validation | not-implemented | server-error | timeout | network`), `AbortController` + `PYTHON_SERVICE_TIMEOUT_SECONDS` env (default 60s), per-pattern 100% Vitest threshold. Pytest coverage: `test_api_calc.py`, `test_api_documents.py`, `test_api_version.py`. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "T-035/T-036 silent decisions for Slice 3a (consolidated §14)".

### T-034 ✅ Parity tests — TS vs Python calculation outputs
- **Merged:** 2026-05-26 via PR #40 (Slice 2 vertical).
- **Branch:** `feat/calculations-slice`
- **Summary:** 22-fixture shared JSON suite (`services/python/tests/fixtures/calc-parity-fixtures.json`, generated by `scripts/generate-calc-parity-fixtures.mjs` from the TS `composeAll()` as source-of-truth) covering baseline + edges (zero/large/sensitivity 35/40/45 ct/kWh / override on+off / decimal-heavy / 15-/20-/25-year contracts / extreme 1 kWp / 2000 kWp / verkauf>versorger pathological / all-zero / high-pacht 200 / typical). Vitest suite `src/lib/calculations/parity.test.ts` + pytest suite `services/python/tests/test_parity.py` consume the same fixture file. Tolerance budget: `1e-6` relative for monetary fields, `1e-4` for CO₂ derivatives — documented in `docs/calc-sources.md`. CI runs both suites; any mismatch fails the PR. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 2 (T-031/T-032/T-033/T-034) silent decisions per §14 (consolidated)".

### T-033 ✅ Python calculation module (authoritative for document generation)
- **Merged:** 2026-05-26 via PR #40 (Slice 2 vertical).
- **Branch:** `feat/calculations-slice`
- **Summary:** `services/python/app/domain/calculations.py` mirrors T-032 field-for-field. `Decimal` arithmetic on monetary intermediates via `Decimal(str(value))` pattern (private `_d()` helper) — `float` only at the `compose_all()` API boundary that serialises through the pydantic `DerivedValues` model. CO₂ derivatives stay on the float pathway (the underlying constants 0.474 / 0.0177 / 1.28 are themselves 3–4-sig-fig approximations). Pydantic v2 `StudyCalcInput` model in `services/python/app/schemas/calc.py` with `extra="forbid"`, `frozen=True`, non-negative validation on every physical input. `co2_override` semantics match the TS side: short-circuits when override is true AND the override value is not None. 22 pytest cases at 100 % coverage on `calculations.py`; `pytest-cov` added to `requirements-dev.txt` (pytest plugin, taste-level per §14.2). Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 2 (T-031/T-032/T-033/T-034) silent decisions per §14 (consolidated)".

### T-032 ✅ TS calculation module (live preview)
- **Merged:** 2026-05-26 via PR #40 (Slice 2 vertical).
- **Branch:** `feat/calculations-slice`
- **Summary:** `src/lib/calculations/index.ts` ships every formula from SPEC §4.7 plus the three CO₂ derivatives. Pure-functional, deterministic. Types in `src/lib/calculations/types.ts`. `composeAll()` single-shot helper for callers wanting the full output. `co2Override` short-circuits when both `co2Override === true` AND the respective override is defined. 100 % per-pattern Vitest threshold on `src/lib/calculations/**` enforced (added in T-015b, no longer dormant). Wizard Step 5 sensitivity preview replaced its T-026b STUB with live `composeAll()`: each `szenarioPreis*` substitutes into `versorgerPreisEurKwh` and re-runs the pipeline. `buildCalcInput()` defaults missing optionals to SPEC §4.5 (`pachtEurProKwp=100`, `vertragslaufzeitJahre=20`). `isCalcInputComplete()` gates the preview on four required inputs. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 2 (T-031/T-032/T-033/T-034) silent decisions per §14 (consolidated)".

### T-031 ✅ Calculation constants modules (TS + Py) with CO₂ provisional marker
- **Merged:** 2026-05-26 via PR #40 (Slice 2 vertical).
- **Branch:** `feat/calculations-slice`
- **Summary:** Six named constants exported on both sides with identical numeric values: `CO2_KG_PER_KWH_PV = 0.474`, `CO2_HA_MISCHWALD_PER_T_PER_YEAR = 0.0177` (marked `// PROVISIONAL` in TS and `# PROVISIONAL` in Py per DECISIONS "CO₂ Mischwald-Faktor provisional"), `FOOTBALL_FIELDS_PER_HA = 1.28`, `DEFAULT_PACHT_EUR_PER_KWP = 100`, `DEFAULT_VERTRAGSLAUFZEIT_JAHRE = 20`, `DEFAULT_SENSITIVITY_CT_KWH = [35, 40, 45]`. `docs/calc-sources.md` ships the living constant register (`Konstante | Wert | Quelle | Stand | Anmerkung`) plus the T-034 parity tolerance contract. Tests assert *referenced* (not the literal numeric value) so a future correction stays a one-liner per decision #2. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 2 (T-031/T-032/T-033/T-034) silent decisions per §14 (consolidated)".

### T-028 ✅ Studies dashboard (TanStack Table, filters, status state machine)
- **Merged:** 2026-05-26 via PR #39 (Slice 5 vertical, ein PR per User-Spec).
- **Branch:** `feat/studies-crud-slice`
- **Summary:** `/studies` Dashboard mit TanStack-Table (object name | customer | status badge | consultant | created | actions), Status-Filter via native `<select>` (siehe DECISIONS #9), `Neue Studie`-Button (F2). State-Machine `DRAFT → READY → GENERATED` server-seitig im `setStudyStatus`-Repo-Helper enforced via `STATUS_TRANSITIONS`-Allow-List + typed `InvalidStudyStatusTransitionError`. Berater sehen nur eigene Studien (Repo-Filter via `consultantId`); Admin sieht alles (F7 admin god-mode). `transition-status.ts` Server Action schreibt `STATUS_CHANGE`-Audit-Eintrag (additiv zur SPEC §5.1 allow-list per DECISIONS #7). Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 5 (T-025/T-026/T-027/T-028) silent decisions per §14 (consolidated)".

### T-027 ✅ Study single-page layout (anchored sections)
- **Merged:** 2026-05-26 via PR #39 (Slice 5 vertical).
- **Branch:** `feat/studies-crud-slice`
- **Summary:** `mode="single-page"` Pfad in geteilter `StudyForm`-Komponente (siehe DECISIONS Slice-5 #4 — wizard und single-page teilen sich eine Komponente). Sticky-Left-Anchor-Nav mit acht Section-Cards (`#section-1`…`#section-8`), Save-Button am Ende iteriert alle Schritte sequenziell durch. Honors `User.formPreference === 'SINGLE_PAGE'`. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 5 (T-025/T-026/T-027/T-028) silent decisions per §14 (consolidated)".

### T-026b ✅ Wizard steps 5–8
- **Merged:** 2026-05-26 via PR #39 (Slice 5 vertical).
- **Branch:** `feat/studies-crud-slice`
- **Summary:** Step 5 (Sensitivität — drei `szenarioPreis1/2/3`-Felder mit Defaults 35/40/45 ct/kWh + Mini-Preview-Liste als STUB markiert `TODO(slice-2): replace with calculation module from T-032`), Step 6 (Termine — `datetime-local`-Inputs, kein neues Plugin), Step 7 (Bilder — visible-placeholder mit Hint auf T-029a), Step 8 (Review — `SummaryRow`-List + `studies.bereit-markieren`-Button der `transition-status` `DRAFT → READY` triggert). Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 5 (T-025/T-026/T-027/T-028) silent decisions per §14 (consolidated)".

### T-026a ✅ Wizard shell + steps 1–4
- **Merged:** 2026-05-26 via PR #39 (Slice 5 vertical).
- **Branch:** `feat/studies-crud-slice`
- **Summary:** `<StudyForm mode="wizard">` mit Stepper (8 Positionen, plant-green-Highlight), Prev/Next-Buttons, per-Step zod-Validierung gegen die jeweilige T-025-Schema, Autosave via `updateStudyAction` bei jedem Schritt-Übergang. Step 1 (Kunde via T-022 `CustomerSelect`), Step 2 (Objekt/Flurstück), Step 3 (PV-Inputs), Step 4 (Modul-/Anlagenspezifikation). Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 5 (T-025/T-026/T-027/T-028) silent decisions per §14 (consolidated)".

### T-025 ✅ Study zod schema set (one schema per wizard step)
- **Merged:** 2026-05-26 via PR #39 (Slice 5 vertical).
- **Branch:** `feat/studies-crud-slice`
- **Summary:** Zehn neue Files unter `src/features/studies/schemas/`: `step1-kunde.ts` bis `step8-review.ts` (acht Step-Schemas), `study-full-schema.ts` (composed) + `common.ts` (Helpers wie `positiveDecimal`). Sensitivity-Defaults 35/40/45 ct/kWh exportiert als `SENSITIVITY_DEFAULTS`. Alle Schemas + Defaults sind co-located getestet. Status-Flip carry-forward.
- **Decisions:** siehe `DECISIONS.md` Eintrag "Slice 5 (T-025/T-026/T-027/T-028) silent decisions per §14 (consolidated)".

### T-024b ✅ Coverage gate honesty — global denominator = whole `src` tree
- **Merged:** 2026-05-26 via PR #38.
- **Branch:** `chore/t024b-coverage-gate-honesty`
- **Summary:** `vitest.config.ts` `coverage.include` flipped from a curated opt-in allow-list to `["src/**/*.{ts,tsx}"]`. Every legitimately-excluded category now lives in `coverage.exclude` with an inline `//` comment justifying the exclusion (Prisma generated client, test files, declaration files, i18n dictionary, Prisma singleton, shadcn UI primitives, Next.js route shells, config files, scaffold placeholders). All pre-existing per-pattern thresholds remain enforced verbatim. New per-pattern 100 % thresholds added for `src/features/auth/actions/{sign-in,change-password,sign-out}.ts` — same trust-boundary class as the customer Server Actions. New tests `sign-in.test.ts` and `change-password.test.ts` ship to satisfy the new thresholds; `sign-out.test.ts` was already in place. Global lines/branches/functions/statements measured against the new whole-`src` denominator with all gates (global 80 % + every per-pattern 100 %/90 %) green. Status-flip carry-forward (war `🟦 IN PROGRESS`, faktisch gemerged in PR #38).
- **Decisions:** siehe `DECISIONS.md` Eintrag "T-024b — Coverage gate honesty (binding)".

### T-050a ✅ Production deploy infrastructure (deploy.sh + nginx + compose + Anleitung)
- **Merged:** 2026-05-25 via PR #27 (+ Folge-Hotfixes PRs #28–#36 für CSP-Nonce / force-dynamic / sundry deploy-related corrections).
- **Branch:** `chore/t050a-deploy-infrastructure` (siehe PR-Historie für Folge-Branches).
- **Summary:** Erste deploybare Produktions-Instanz auf Hetzner-VPS (`greenscout.lumina-intelligence.ai`). Liefert `deploy.sh` (idempotent, deutsche Meldungen), `docker-compose.prod.yml` (web/api/db, benannte Volumes, Web nur auf 127.0.0.1:4000), `.env.production.example` (Platzhalter), `docs/deploy-anleitung.md` (Schritt-für-Schritt). nginx + certbot statt Caddy (T-050b's Caddyfile bleibt Referenz). Reverse-Proxy-Switch Caddy→nginx vorab vom Orchestrator freigegeben (§7.10). Eine Serie von Folge-Hotfixes (PRs #28–#36) korrigierte CSP-Nonce-Propagation (request-headers + force-dynamic root layout), kleine Deploy-Skript-Edges und weitere Produktions-Findings — alle auf demselben deploy-pfad. Status-Flip carry-forward (war `🟦 IN PROGRESS`, faktisch gemerged).
- **Decisions:** siehe `DECISIONS.md` Einträge zu T-050a und den Folge-CSP-Hotfixes.

### T-024 ✅ Customer detail view + soft-delete action
- **Merged:** 2026-05-23 via PR #26.
- **Branch:** `feat/t024-customer-detail`
- **Summary:** Detail-Seite unter `/customers/[id]` zeigt Kundendaten + Liste der zugehörigen Studien (Link je Studie). Delete-Button via SPEC §4.9 Confirmation-Dialog führt **soft-delete** (`deletedAt = now`) aus; gelöschte Kunden verschwinden aus T-022's Listenansicht, deren Studien bleiben erhalten. Audit-Log `SOFT_DELETE`-Eintrag mit `userId`, `entityType="Customer"`, `entityId`. Server Action `softDeleteCustomerAction` mit voller Multi-Tenant-Ownership-Check + Header-Extraction; 100% per-pattern Coverage (vitest threshold im `vitest.config.ts` aktiv). Playwright deckt confirm + dismiss Pfade. Status-Flip carry-forward (war `🟦 IN PROGRESS`, faktisch gemerged).
- **Decisions:** siehe `DECISIONS.md` Eintrag "T-024 silent decisions per §14 (consolidated)".

### T-023 ✅ Customer create / edit form
- **Merged:** 2026-05-22 via PR #25.
- **Branch:** `feat/t023-customer-form`
- **Summary:** Formular unter `/customers/new` und `/customers/[id]/edit` mit RHF + zod. Felder per SPEC §4.4 / §5.1 (`companyName` optional; `contactFirstName`/`contactLastName` Pflicht; `email`, `phone`, `billingAddress`/`billingZipCode`/`billingCity`, `notes`). Submit via TanStack-Query-Optimistic-Update, dann Redirect zur Detail-Seite. Server Actions `createCustomerAction` + `updateCustomerAction` schreiben `CREATE`/`UPDATE` Audit-Log-Einträge mit `changeSet`-Diff (Update). 100% per-pattern Coverage auf beide Actions (vitest threshold aktiv). Form preserved values on validation failure. Playwright happy-path Create + Edit. Status-Flip carry-forward (war `⬜ TODO`, faktisch gemerged).
- **Decisions:** siehe `DECISIONS.md` Eintrag "T-023 silent decisions per §14 (consolidated)".

### T-022 ✅ Customer feature: schema + repository + list page
- **Merged:** 2026-05-21 via PR #24 (`063633d`)
- **Branch:** `feat/t022-customer-list`
- **Summary:** First Slice-4 business-feature task. App-shell layout at `src/app/(app)/layout.tsx` with topbar (logo + "Kunden" nav + user dropdown with sign-out Server Action). TanStack Query v5 + Table v8 installed (SPEC §2 stack, §14.3 plugin-of-approved). `/customers` page: Server Component fetches initial 25 rows via `listCustomers(orgId, { includeStudyCount: true })`, hands off to `CustomerTable` client component. Search input debounced 300ms, page-based pagination 25/page, URL-state `?page=N&search=…` for refresh/share-link safety. Empty state differentiated (no-customers vs no-results). Repository extended with `includeStudyCount` overload + new `countCustomers`. `GET /api/customers` JSON endpoint for client refetches (auth-gated). Disabled "Anzeigen"/"Bearbeiten" actions with i18n suffix `(verfügbar in T-024/T-023)`. ESLint scoped override `react-hooks/incompatible-library` on `*-table.tsx` (TanStack Table memoization). 226 tests / 90.54% global coverage.
- **Decisions:** see `DECISIONS.md` entry "T-022 silent decisions per §14 (consolidated)".

### T-021 ✅ Security headers hardening + applySecurityHeaders helper + docs/security.md
- **Merged:** 2026-05-21 via PR #23 (`73336d1`)
- **Branch:** `feat/t021-security-headers`
- **Summary:** `applySecurityHeaders(response)` helper in `src/middleware.ts`, called on every response branch (pass-through + 2 redirects). 5 headers total: CSP (from T-017) + X-Frame-Options DENY + Referrer-Policy strict-origin-when-cross-origin + X-Content-Type-Options nosniff + Permissions-Policy "camera=(), microphone=(), geolocation=()". Deliberately omitted: X-XSS-Protection (deprecated), interest-cohort=() (FLoC dead), HSTS (lives at reverse-proxy per new T-050b task). 12 middleware tests, 100% coverage. New `docs/security.md` (150 lines, 9 sections) as canonical posture doc. `deploy/Caddyfile.example` authored for T-050b human-operator deployment. SPEC §6.3 clarified additively.
- **Decisions:** see `DECISIONS.md` entries "T-021 Security headers hardening (user-confirmed, binding)" + "T-021 implementation per §14 (consolidated)".

### T-019 ✅ Forced first-login password change flow
- **Merged:** 2026-05-21 via PR #22 (`56689c9`)
- **Branch:** `feat/t019-password-change`
- **Summary:** `/password-change` page with `currentPassword` + `newPassword` + `confirmNewPassword` + reusable `PasswordRuleChecklist` 3-state component (neutral/passed/not-passed, hasTyped sticky). Server Action runs lockout-first algorithm (post-auth, no enumeration concern — explicit contrast with T-017a verify-first). $transaction wraps the three success writes (updatePasswordHash + setMustChangePassword + resetFailedLoginCount). **JWT refresh via `unstable_update({})`** AFTER the transaction → jwt callback re-fetches from DB via `findUserById` → all 6 token fields refreshed → THEN redirect. JWT-update branch lives in `src/lib/auth.ts` (Node side, not auth.config.ts — Prisma can't run in Edge). New audit action `PASSWORD_CHANGE_FAIL` added to SPEC §5.1 allow-list. Plus an unexpected client-bundle fix: dropped `hashPassword`/`verifyPassword` re-export from `password-policy.ts` because the PasswordRuleChecklist (client component) was pulling `@node-rs/argon2` native bindings into the client bundle. 15 new i18n keys. 187 total tests, 100% coverage on change-password.ts + password-rule-checklist.tsx.
- **Decisions:** see `DECISIONS.md` entries "T-019 Forced password change design (user-confirmed, binding)" + "T-019 implementation per §14 (consolidated)".

### T-018 ✅ Login page (email + password + lockout banner)
- **Merged:** 2026-05-21 via PR #21 (`cf1fc8a`)
- **Branch:** `feat/t018-login-page`
- **Summary:** `/login` page per the user-approved design recap. Email + password fields, no checklist (per KORREKTUR — login verifies existing passwords, doesn't compose), soft-distinguished error UX via T-017a's typed `SignInResult` (generic for invalid, lockout banner with `<Lock>` icon + countdown for the locked-with-correct-password path). Logo text-only "GreenScout" above Card. Subtle "Passwort vergessen?" hint below submit. 7 new i18n keys. 136 total tests / 9 LoginForm tests / coverage 93.78% global. CSP header verified live via `curl -I`. Browser-console CSP verification was the user's manual pre-merge step.
- **Decisions:** see `DECISIONS.md` entries "T-018 Login page design (user-confirmed, binding)" + "T-018 implementation per §14 (consolidated)".

### T-017a ✅ Verify-first authorize + timing hardening + next-auth exact pin
- **Merged:** 2026-05-21 via PR #20 (`e66fc13`)
- **Branch:** `fix/auth-verify-first-and-pin`
- **Summary:** Reordered `authorize-credentials.ts` to verify-first: argon2 always runs (against `user.passwordHash` for existing users, against `DUMMY_ARGON2_HASH` for non-existent) — eliminates email-enumeration timing side-channel. Custom `CredentialsSignin` subclasses `LockedAccountError(lockedUntil)` + `AccountUnavailableError("deleted"|"inactive")` thrown only on password-correct paths. `signInAction` returns discriminated `SignInResult` union with typed `errorCode` + optional `lockedUntil`. Locked-correct-password leaves counter and lockoutUntil UNCHANGED. `next-auth` pinned exact to `5.0.0-beta.31` (no caret — betas don't follow SemVer). 19 test scenarios at 100% coverage on `authorize-credentials.ts`. **Deviation noted**: `CredentialsSignin` imported from `@auth/core/errors` (not `next-auth` barrel) because the barrel pulls `next/server` into Vitest. Same class.
- **Decisions:** see `DECISIONS.md` entries "T-017a Verify-First Korrektur per ④" + "T-017a implementation per §14".

### T-017 ✅ Auth.js v5 Credentials provider + session config
- **Merged:** 2026-05-20 via PR #19 (`dfbc176`)
- **Branch:** `feat/auth-credentials-provider`
- **Summary:** Auth.js v5 (`next-auth@^5.0.0-beta.31` in `dependencies` — no stable v5 exists on npm). JWT strategy, 8h hard expiry. Token payload: 6 fields incl. `organizationId`. Edge/Node config split (`auth.config.ts` Edge-safe + `auth.ts` Node-runtime) for `@node-rs/argon2` native bindings. **T-017 shipped the complete counter-based lockout state machine** per user-corrective. Three latent bugs surfaced AFTER merge → corrective T-017a follows: (1) lockout-check ran BEFORE verify-password, breaking the soft-distinguished UX from decision ④; (2) timing side-channel — non-existent users skipped argon2 verify; (3) next-auth installed with caret, but betas don't follow SemVer.
- **Decisions:** see `DECISIONS.md` entries "T-017 Auth.js v5 Credentials + session config (user-confirmed, binding)" + "T-017 implementation per §14 (consolidated)" + "T-017a Verify-First Korrektur per ④ (user-confirmed, binding)".

### T-016 ✅ Password-policy module (argon2id + rules)
- **Merged:** 2026-05-20 via PR #18 (`f9fac3c`)
- **Branch:** `feat/password-policy-module`
- **Summary:** `src/features/auth/password-policy.ts` (5 Unicode-aware rule predicates `\p{Lu}` / `\p{Ll}` / `[0-9]` / `[^\p{L}\p{N}]/u`, `Object.frozen(passwordRules)`, `validatePassword`) + `src/features/auth/password-constants.ts` (extracted to avoid circular re-export between policy and hash modules) + i18n seed `src/i18n/de.ts` (5 password-rule keys + typed `t()` helper). `hash-password.ts` refactored to consume policy constants. Vitest per-pattern 100% threshold on password-policy.ts active in CI. 13 test files / 96 tests, all green. Global coverage 96.12%.
- **Decisions:** see `DECISIONS.md` entries "T-016 password-policy module design" + "T-016 password-policy module implementation".

### T-015b ✅ Vitest + RTL + coverage setup
- **Merged:** 2026-05-20 via PR #17 (`6a9a5c1`)
- **Branch:** `chore/vitest-rtl-coverage-setup`
- **Summary:** Vitest 4.1.7 + @vitejs/plugin-react 6.0.2 + @vitest/coverage-v8 + jsdom 29.1.1 + @testing-library/{react,jest-dom,user-event} installed. `vitest.config.ts` + `vitest.setup.ts` at repo root. `tsconfig.json` re-includes `**/*.test.ts(x)` + adds `vitest/globals` + `@testing-library/jest-dom` types. npm scripts `test`, `test:watch`, `test:coverage`. CI `web-tests` stub promoted to real `Vitest` job (rename), runs `npx prisma generate → vitest run --coverage → upload coverage artifact`. **11/11 idle test files pass (69/69 assertions), zero test-side fixes needed.** Coverage 92.62%/89.71%/95.83%/92.98% on the narrowed business-logic surface (`src/lib/**` + `src/features/**/{services,utils,schemas,hooks}/**` + `src/features/**/*-policy.{ts,tsx}`, excluding `src/lib/db.ts` Prisma wiring + `**/example.ts` T-001 scaffolds + `src/i18n/**`). User-approved §14.2 coverage-scope-narrowing rationale: avoid the anti-pattern of trivial-tests-for-coverage on untested-by-design UI shells and route entries. User-action required: promote `Vitest` to 8th required check on `main` branch protection.
- **Decisions:** see `DECISIONS.md` entry "T-015b silent decisions per §14 (consolidated)".

### T-015 ✅ Idempotent admin seed (`prisma db seed`)
- **Merged:** 2026-05-20 via PR #16 (`49e908e`)
- **Branch:** `feat/admin-seed-script`
- **Summary:** `prisma/seed.ts` provisions the `ADMIN`-role user idempotently. Reads `SEED_ADMIN_EMAIL`/`SEED_ADMIN_TEMP_PASSWORD` from env; normalises email; argon2id-hashes the temp password via `@node-rs/argon2 2.0.2` (chosen over `argon2` to avoid node-gyp build-tool requirements); creates with `mustChangePassword=true` if absent, no-op if exists (incl. soft-deleted). Audit entry written on creation only (`entityType=User`, `action=CREATE`, `userId=NULL` for system event). Uses repository-layer functions exclusively (`createUser`, `findUserByEmail`, `createAuditEntry`); only `@/lib/db` imported directly, for the final `prisma.$disconnect()`. New `src/features/auth/utils/hash-password.ts` with `hashPassword`/`verifyPassword` using SPEC §6.3 baseline + `PASSWORD_HASH_*` env overrides. Plan deviation: `Algorithm` const-enum + `isolatedModules` required `2 as Algorithm` cast. Two new top-level deps: `@node-rs/argon2` (deps), `tsx` (devDeps) — both pre-approved per user directive. **Slice 2 closes with this PR.**
- **Decisions:** see `DECISIONS.md` entry "T-015 silent decisions per §14 (consolidated)".

### T-014 ✅ Implement repository helper layer with organizationId filter
- **Merged:** 2026-05-20 via PR #15 (`09c8eac`)
- **Branch:** `feat/repository-layer`
- **Summary:** 7 entity repositories at `src/lib/repositories/` (User 12 functions, Customer 5, Study 7, StudyImage 4, GeneratedDocument 2, AuditLog 2, Setting 3 = 35 total) + `withOrg<T>` helper + `withTransaction` + `PrismaTransaction` alias. Prisma Client singleton at `src/lib/db.ts` with Next dev hot-reload protection. `organizationId` required first parameter on every function (TypeScript-enforced, no defaults). Soft-delete default-on with `includeDeleted: true` opt-in. `normaliseEmail()` called in User repo's email-touching functions. Update/delete uses `where: { id, organizationId }` so cross-tenant ID guesses silently no-op. `hardDeleteUser` marked `TODO(T-041b)` for DSGVO. ESLint flat-config bans `@/generated/prisma` imports with trusted-path override for `src/lib/db.ts`, `src/lib/repositories/**`, `prisma/seed.ts` — deliberate violation verified. Dockerfile.web added `npx prisma generate` step in builder stage as CI-driven follow-on.
- **Decisions:** see `DECISIONS.md` entry "T-014 silent decisions per §14 (consolidated)".

### T-013 ✅ Initial Prisma migration + local DB apply
- **Merged:** 2026-05-20 via PR #14 (`f3e8474`)
- **Branch:** `chore/prisma-initial-migration`
- **Summary:** `prisma/migrations/20260520074451_initial_schema/migration.sql` (225 lines) generated and applied. 5 `CREATE TYPE ... AS ENUM` + 7 `CREATE TABLE` + 14 `CREATE INDEX` + 2 `CREATE UNIQUE INDEX` + 6 FK constraints. All cascade behaviour matches the DECISIONS contract verbatim (Study→User RESTRICT, Study→Customer RESTRICT, StudyImage→Study CASCADE, GeneratedDocument→Study CASCADE, GeneratedDocument→User SET NULL, AuditLog→User SET NULL). Pre-migrate hard-gate (`prisma format` + `prisma validate`) ran clean. Local Postgres via docker compose on `:5433` (host had Postgres 17 on `:5432`). CI `prisma-migrate-check` promoted: renamed from `Prisma migrate (stub — T-013)` to `Prisma migrate`, real `migrate deploy` + `generate` against fresh CI Postgres service container, 33s/38s green on both events. **User added `Prisma migrate` as the 7th required check on `main` branch protection** — Slice 2 fully gated by CI.
- **Decisions:** see `DECISIONS.md` entry "T-013 silent decisions per §14 (consolidated)".

### T-012 ✅ Define GeneratedDocument + AuditLog + Setting models
- **Merged:** 2026-05-20 via PR #13 (`f1c13a0`)
- **Branch:** `chore/prisma-generated-document-audit-setting`
- **Summary:** Three final Slice-2 models. `GeneratedDocument` (6 fields, **user-corrected cascades**: `studyId → Study Cascade/Cascade` so DSGVO hard-delete wipes DB rows AND physical PDFs under `./generated/studies/<studyId>/`, `generatedById String? → User SetNull/Cascade` so user hard-delete doesn't block on old generation history). `AuditLog` (10 fields, `changeSet Json?` as jsonb, `entityType`/`action` as String allow-list app-side, no `@updatedAt` append-only, `userId → User SetNull/Cascade`, four indexes incl. composite `(org, createdAt DESC)`). `Setting` (3 fields, key/value-store for SMTP encryption + retention config, no organizationId in MVP). User+Study extended with `generatedDocuments`/`auditLogs`/`documents` back-relations. Schema now feature-complete at 255 lines, 7 models, 5 enums. All gates 0; pragmatic write-then-split commit strategy (Husky doesn't validate intermediate states).
- **Decisions:** see `DECISIONS.md` entry "T-012 silent decisions per §14 (consolidated)".

### T-011 ✅ Define Study + StudyImage models with constraints
- **Merged:** 2026-05-20 via PR #12 (`9a15789`)
- **Branch:** `chore/prisma-study-studyimage-models`
- **Summary:** `Study` model (33 fields incl. relations to User+Customer with named `"ConsultantStudies"` / `"CustomerStudies"` relations, all §7.7-money-relevant Decimal precisions per DECISIONS matrix — `anlageKwp(10,3)`, `pv*KwhJahr/verbrauch*/netzeinspeisung*(12,2)`, `pvVerkauf*/versorgerPreis*/szenarioPreis*(8,4)` with string defaults `"0.35"/"0.40"/"0.45"`, `pachtEurProKwp(8,2) @default(100)`, `vertragslaufzeit Int @default(20)`, `modulFlaecheM2(10,2)`, `eigenverbrauchsquoteProzent(5,2)`, `co2*(10,2)`, six compound indexes from contract). `StudyImage` (8 fields, `@@unique([studyId, type])`, Cascade delete). User+Customer extended with `consultantStudies`/`studies` back-relations. Pragmatic commit-split: full schema written first, intermediate commits intentionally fail `prisma validate` (Husky doesn't run it) — final state validates clean. All gates 0, `db:generate` 68ms.
- **Decisions:** see `DECISIONS.md` entry "T-011 silent decisions per §14 (consolidated)".

### T-010 ✅ Define enums + User + Customer models
- **Merged:** 2026-05-20 via PR #11 (`efcfaf4`)
- **Branch:** `chore/prisma-user-customer-models`
- **Summary:** 5 enums (`Role`, `StudyStatus`, `ImageType`, `DocFormat`, `FormPref`) + `User` model (19 fields incl. `passwordChangedAt` V2-prep, `mustChangePassword`, `lockoutUntil`, `formPreference` default `WIZARD`, soft-delete, `organizationId @default("greenscout")`, two compound indexes) + `Customer` model (13 fields, two compound indexes). Email normalisation utility staged at `src/features/auth/utils/normalise-email.ts` (pure `email.trim().toLowerCase()`) with co-located Vitest-API tests waiting for T-018 install. `tsconfig.json` excludes `**/*.test.ts(x)` until Vitest lands. `eslint.config.mjs` ignores `src/generated/**` (Prisma client). Plan deviation: Prisma 5.22 `prisma format` enforced multi-line enum syntax; single-line briefing version was rejected, pivoted mechanically. Quality gates all 0; `prisma format`, `validate`, `db:generate` all clean.
- **Decisions:** see `DECISIONS.md` entry "T-010 silent decisions per §14 (consolidated)".

### T-009 ✅ Install Prisma + Postgres client + scaffold schema header
- **Merged:** 2026-05-20 via PR #10 (`0194eab`)
- **Branch:** `chore/prisma-install-scaffold`
- **Summary:** Prisma 5.22.0 + @prisma/client 5.22.0 + pg 8.21.0 installed (SPEC §2-pinned; v6 upgrade prompt ignored). `prisma/schema.prisma` scaffolded with generator + datasource only — no models yet (deferred to T-010+). Generator output set to `../src/generated/prisma` (gitignored). npm scripts added: `db:generate`, `db:studio`, `db:migrate`. `db:seed` deferred to T-015 per DECISIONS. `docs/prisma.md` covers setup, schema-change workflow (with §7 pause-trigger reminder), and `prisma migrate deploy` forbidden per §7.9/§8.6. **Plan deviation:** `npx prisma init` failed on Node 24 + Prisma 5.22 with `util.isError` upstream bug — implementer manually scaffolded `prisma/schema.prisma` to the briefing template; identical end result. Pre-migrate sanity: `prisma format` and `prisma validate` both exit 0 on the empty-models schema. `src/lib/db.ts` deferred to T-014 (repository layer) per the 5-PR Slice-2 rollout.
- **Decisions:** see `DECISIONS.md` entry "T-009 silent decisions per §14 (consolidated)".

### T-008 ✅ GitHub Actions CI workflow stub
- **Merged:** 2026-05-19 via PR #9 (`59ae07d`)
- **Branch:** `chore/github-actions-ci`
- **Summary:** `.github/workflows/ci.yml` with 8 jobs (5 live: `actionlint`, `lint-typecheck` Node 24, `python-checks` Python 3.12, `build-images` matrix web+pyservice, `gitleaks-scan`; 3 stubs: `web-tests` echoing T-018, `e2e` echoing T-051a/b, `prisma-migrate-check` echoing T-013 with Postgres service block pre-wired). Trigger: `pull_request` + `push: { branches-ignore: [main] }` with concurrency cancellation. Top-level `permissions: { contents: read }`. Cache: setup-node npm + setup-python pip + docker/build-push-action `type=gha`. `actionlint` via `reviewdog/action-actionlint@v1` (rhysd ships only the binary). `gitleaks-action@v2` with `GITHUB_TOKEN` for `pull_request` event path (first-run fix in `fb36e4e`). `docker/build-push-action@v6` with `push: false`. No deploy job, no production secrets. `docs/ci.md` documents branch-protection setup. **First CI runs both green** (push 1m48s, pull_request 3m13s — all 8 jobs pass). Branch protection on `main` activated by user with 6 live required checks; 3 stub jobs deliberately not yet required (see DECISIONS "Branch protection on `main` activated").
- **Decisions:** see `DECISIONS.md` entries "T-008 silent decisions per §14 (consolidated)" and "Branch protection on `main` activated (user-confirmed, with promotion TODOs)".

### T-007 ✅ Compose Docker stack skeleton (Next.js + Python + Postgres)
- **Merged:** 2026-05-19 via PR #8 (`99cb4d9`)
- **Branch:** `chore/docker-compose-stack`
- **Summary:** Three-service Docker Compose stack: `web` (Next.js multi-stage build on `node:24-alpine`, runs as `nextjs:1001`), `pyservice` (single-stage `python:3.12-slim`, runs as `gsuser:1001`, no LibreOffice yet — deferred to T-039), `db` (`postgres:16-alpine`, named volume `postgres-data`). Single bridge network `gs-network`. Bind mounts `./uploads` + `./generated` into both `web` and `pyservice`. Ports loopback-only (127.0.0.1). `output: "standalone"` added to `next.config.ts`. `.dockerignore` excludes node_modules/.next/.venv/.git/docs/big binaries/.claude/.env*. Compose-time env overrides rewrite `web.DATABASE_URL` to `host=db` and `web.PYTHON_SERVICE_URL` to `http://pyservice:8000`; `.env`'s localhost-style URLs stay for native `npm run dev`. AUTH_SECRET kept (Auth.js v5 — not NEXTAUTH_SECRET from the task description). Verification: `compose config` 0, `compose build` 0 (web 283 MB, pyservice 231 MB), all three healthy within ~75s, `wget -qO- http://pyservice:8000/health` from inside web returned `{"status":"ok"}` (service-name DNS verified). Two §14-silent verification fixes: db port parameterised to `${POSTGRES_PORT:-5432}` after host-side conflict, web healthcheck pinned to `127.0.0.1` instead of `localhost` after alpine wget IPv6 misroute.
- **Decisions:** see `DECISIONS.md` entry "T-007 silent decisions per §14 (consolidated)".

### T-006 ✅ Scaffold Python FastAPI service skeleton
- **Merged:** 2026-05-19 via PR #7 (`a0541c1`)
- **Branch:** `chore/python-service-skeleton`
- **Summary:** `services/python/` skeleton per SPEC §7.4. FastAPI 0.115+ + uvicorn[standard] + pydantic v2 + python-multipart. `GET /health` returns `{"status": "ok"}` via `app.api.health` router. requirements.txt + requirements-dev.txt split (no Poetry/PDM/uv). `pyproject.toml` tool-config only (ruff py312/line-100/E-F-W-I-UP-B-C4-PT-RUF-SIM-TCH, pyright strict, pytest with asyncio_mode=auto). Domain + services + config are docstring-only stubs with `TODO(T-XX):` markers. **Custom Node launcher `scripts/run-py-tool.mjs`** bridges lint-staged to venv-installed ruff/pyright/pytest cross-platform (Windows Scripts/ vs Unix bin/). Hook-fire perf: TS 7.77s, Python 5.91s. All gates green: Python (ruff/pyright/pytest) + TS (typecheck/lint/format:check).
- **Decisions:** see `DECISIONS.md` entry "T-006 silent decisions per §14 (consolidated)".

### T-005 ✅ Set up Husky + lint-staged + gitleaks pre-commit gates
- **Merged:** 2026-05-19 via PR #6 (`25fe997`)
- **Branch:** `chore/husky-lintstaged-gitleaks`
- **Summary:** Husky 9.1.7 + lint-staged 17.0.5 installed. `.husky/pre-commit` runs project-wide `tsc --noEmit` → per-file `lint-staged` (eslint+prettier on TS/JS, prettier on md/json/yml/yaml/css, ruff+pyright on py — no-op until T-006) → `gitleaks git --staged --redact --verbose` last. `.gitleaks.toml` extends defaults with `.env.example` allowlist. `.gitattributes` enforces LF on `.husky/*` + `*.sh` to defend against Windows `core.autocrlf`. `docs/pre-commit.md` documents pipeline + per-OS install + §8.12 bypass warning. Clean-commit perf measured at 7.99s cold / 7.72s warm. Two §14-silent plan deviations resolved: gitleaks 8.30 removed `protect --staged` → switched to `gitleaks git --staged`; canonical AWS example `AKIAIOSFODNN7EXAMPLE` is internally allowlisted in 8.30 → fixture pivoted to a synthetic GitHub PAT for reliable rule trigger.
- **Decisions:** see `DECISIONS.md` entry "T-005 silent decisions per §14 (consolidated)".

### T-004 ✅ Wire ESLint + Prettier + tsc gates
- **Merged:** 2026-05-19 via PR #5 (`16d49f4`)
- **Branch:** `chore/eslint-prettier-gates`
- **Summary:** ESLint v9 flat config extended with typescript-eslint 8.59.4, eslint-plugin-react 7.37.5, eslint-plugin-react-hooks 7.1.1, eslint-plugin-jsx-a11y 6.10.2, canonical eslint-plugin-import 2.32.0 (not the -x fork — Next pre-wires the canonical), eslint-config-prettier 10.1.8 (last in array). Prettier 3.8.3 with prettier-plugin-tailwindcss 0.8.0 for class auto-sort. `prettier.config.mjs` + `.prettierignore` created. Cross-feature relative imports blocked via `no-restricted-imports` `../*` pattern (not zones — would have blocked `@/*` alias). `@typescript-eslint/no-explicit-any: error`, `no-unused-vars: error` with `^_` opt-out, `jsx-a11y/alt-text: error` covering `<img>` + Next `<Image>`. npm scripts: `lint`, `lint:fix`, `format`, `format:check`, `typecheck` — `eslint .` direct (not `next lint`, deprecated in 15.5). 21 existing source files reformatted via Prettier; no behaviour change.
- **Decisions:** see `DECISIONS.md` entry "T-004 silent decisions per §14 (consolidated)".

### T-003 ✅ Install shadcn/ui primitives + base components
- **Merged:** 2026-05-19 via PR #4 (`654768c`)
- **Branch:** `chore/shadcn-ui-primitives`
- **Summary:** shadcn 4.7.0 CLI init with new-york style and CSS-variables; 18 primitives under `src/components/ui/`. Tailwind v3 compatibility cleanup (stripped v4-only imports). Brand-token mapping landed: `primary=plant-green`, `secondary=muted-lime`, `accent=forest-green`, `destructive=#DC2626` (new — soft-flagged, see decisions). `Toaster` + `TooltipProvider` mounted in `layout.tsx`. Sonner wrapper with hard-pinned `theme="light"`. RHF+zod+`@hookform/resolvers` for `form` primitive. Smoke demo page renders all 18 primitives in four sections.
- **Decisions:** see `DECISIONS.md` entry "T-003 silent decisions per §14 (consolidated)".

### T-002 ✅ Configure Tailwind 3 + design tokens + Gabarito font
- **Merged:** 2026-05-19 via PR #2 (`36eaa7e`)
- **Branch:** `chore/tailwind-design-tokens`
- **Summary:** Tailwind 3.4.19 + PostCSS 8.5.14 + Autoprefixer 10.5.0 + tailwindcss-animate 1.0.7. Self-hosted Gabarito Regular + SemiBold via `next/font/local` in `public/fonts/` with OFL licence. Six SPEC §8.1 colour tokens wired as Tailwind theme colours and `:root` CSS variables; three brand greens get 50–900 ramps via HSL-shift (muted-lime DEFAULT pinned to step 400).
- **Decisions:** see `DECISIONS.md` entry "T-002 dependency set + Gabarito font strategy".

### T-001 ✅ Initialise Next.js 15 + TypeScript strict workspace
- **Merged:** 2026-05-19 via PR #1 (`a54059a`)
- **Branch:** `chore/init-nextjs-typescript`
- **Summary:** Next 15.5.18 + React 19 + TS 5 strict scaffold via `create-next-app@^15`. Full `@/*` path-alias map. Turbopack default. `.editorconfig`, `.nvmrc` (Node 24), `next.config.ts`, `eslint.config.mjs`.
- **Decisions:** see `DECISIONS.md` entries "T-001 dependency set + scaffolding path approved" and "T-001 post-implementation choices".

---

## Suggested first-run prompt for the planner

> *"Read `SPEC.md` and `CLAUDE.md`. Seed `TASKS.md` with the initial backlog needed to ship the MVP described in `SPEC.md` §2.1. Group tasks into vertical slices: project bootstrap → data model + Prisma → auth → customers CRUD → studies CRUD → image upload → calculation logic (TS+Py mirror) → Python service + PPTX template wiring → PDF rendering → document history → admin user management → SMTP settings → audit log → retention cron → polish. Surface anticipated pause-triggers. Stop after seeding — do not implement."*
