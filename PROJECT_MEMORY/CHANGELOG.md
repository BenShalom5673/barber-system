# CHANGELOG — Barber System

Each entry records a meaningful code change: what changed, why, and which files were affected.

---

## 2026-04-26 — Full PROJECT_MEMORY audit and corrections

**What changed:**
All five PROJECT_MEMORY files were audited against the actual codebase and corrected.

**Mismatches found and fixed:**
- API route methods were wrong: `staff/[id]` has PATCH+DELETE (not GET+PATCH); `staff/[id]/schedule/weekly` has PUT only (not GET/PATCH); `settings/operational` has GET+PUT (not GET+PATCH).
- Database table list was incomplete: missing `users`, `accounts`, `sessions`, `verification_tokens` (Auth.js tables), and `notification_settings` (separate from `notifications`).
- Tech stack was incomplete: missing `next-intl`, `framer-motion`, `React 19`.
- "Debug console.log count" was wrong: said 2, actually 6.
- Auth.js status was wrong: said "planned, not built" — but schema tables ARE defined.
- Architecture section was missing: `src/i18n/`, `src/middleware.ts`, home page, full API route list.
- `slotIntervalMinutes` conflict documented: DB default is 15, product rule requires 5 — now listed as a known risk.
- Bug #3 added: `ServiceStep` only passes `serviceId`, not service name/price — blocker for ConfirmStep.

**Files affected:**
- `PROJECT_MEMORY/PROJECT_MASTER.md`
- `PROJECT_MEMORY/CURRENT_STATE.md`
- `PROJECT_MEMORY/RULES.md`
- `PROJECT_MEMORY/NEXT_TASKS.md`
- `PROJECT_MEMORY/CHATGPT_CONTEXT.md`

---

## 2026-04-26 — Gap-based scheduling with 5-minute alignment

**What changed:**
The availability engine now generates slots dynamically from the end of each existing appointment, stepping forward by the service duration. Only times that fall on 5-minute increments are included.

**Why:**
The old approach only injected a single "gap start" point per blocked range. It did not continue generating slots after that point (e.g. only 12:25 appeared, not 12:50 and 13:15). The fix propagates the full sequence from each gap end.

**Files affected:**
- `src/server/services/availability.service.ts` — replaced `gapStarts` (single-point) with `gapCandidates` loop.
- `scripts/seed-dev.ts` — added `DATE2 = '2026-04-28'`, `slot2()` helper, and one test appointment for דוד ending at 12:25 IL on 2026-04-28.

---

## 2026-04-26 — PROJECT_MEMORY folder created

**What changed:**
Created `/PROJECT_MEMORY/` with five documentation files.

**Why:**
Non-developer owner requested persistent memory so that Claude can understand the project from scratch at the start of any new session.

**Files affected:**
- `PROJECT_MEMORY/PROJECT_MASTER.md` (new)
- `PROJECT_MEMORY/CURRENT_STATE.md` (new)
- `PROJECT_MEMORY/RULES.md` (new)
- `PROJECT_MEMORY/CHANGELOG.md` (new)
- `PROJECT_MEMORY/NEXT_TASKS.md` (new)

