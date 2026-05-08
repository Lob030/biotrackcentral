## Current state

The base operational copilot already exists and works end-to-end:

- Edge function `supabase/functions/ai-command/` with `parse` / `execute` / `execute_batch` actions
- Typed Zod schemas + per-intent handlers (lineas, cajas, lotes, mortalidad, traslados, division)
- `normalizeOperations()` with stringified-payload, `data→payload`, id-dedup hardening + tests
- Frontend: `AICommandBar`, `AIOperationBatchPreview`, `AIOperationCard`, `AIValidationWarnings`, `AIConfirmationDialog`, `AIResultPreview`
- Audit table `ai_journal_runs` (RLS, org-scoped)
- Pending migration file `20260507200000_ai_aliases.sql` exists but is **not yet applied**
- Missing entirely: telemetry table, clarification UI, voice hook, proactive suggestions, macros, analytics page, env separation

The request is enterprise-wide. To stay deterministic, auditable, and avoid overengineering, I propose **5 phases** delivered in this order. Each phase preserves the existing parse → normalize → validate → preview → confirm → execute pipeline. Nothing autonomous, nothing recursive.

---

## Phase 1 — Foundations (DB + clarification + aliases)

**Migrations**
- Apply existing `ai_aliases` migration (idempotent — uses `IF NOT EXISTS`)
- Add `ai_telemetry_events` table: `id, organization_id, user_id, event_type text, duration_ms int, metadata jsonb, created_at` + org-scoped RLS (insert by self, select by org)

**Edge function**
- Add `requires_clarification` intent in `schemas.ts` with payload `{ reason, missing_fields[], suggestions[] }`
- Update `prompt.ts`: when fields are ambiguous, model MUST emit `requires_clarification` instead of guessing
- Inject org aliases into system prompt (load top N from `ai_aliases` at parse-time)
- New `telemetry` action that inserts into `ai_telemetry_events`

**Frontend**
- `AIOperationCard`: render clarification ops with a distinct yellow style + disable execution toggle
- `aiCommand.ts`: add `sendAITelemetry()` (already half-stubbed)
- `pages/Admin.tsx` (or new tab): `AIAliasesManager.tsx` — CRUD list of aliases scoped to the user's org

---

## Phase 2 — Voice copilot

- New hook `src/hooks/useSpeechRecognition.ts` wrapping the Web Speech API behind a stable interface (so we can swap to Whisper later). Returns `{ isListening, transcript, start, stop, supported, error }`.
- `AICommandBar`: mic button with pulse animation, 1s silence auto-stop fills the textarea (does NOT auto-submit). User still clicks "Analizar".
- Telemetry: emit `voice_session_started` / `voice_session_committed` events.

---

## Phase 3 — Proactive suggestions

- `src/lib/aiSuggestions.ts` — pure deterministic rule engine. Reads from existing TanStack queries (lotes, cajas) and emits typed `Suggestion[]`:
  - `weaning_overdue` (lote nacimiento > N days, no destete event)
  - `cage_overcrowded` (lote.cantidad_actual > caja.capacidad)
  - `incomplete_workflow` (lote without caja / linea_genetica)
- New `SuggestionsPanel.tsx` on Dashboard — each suggestion has a "Aplicar con copiloto" button that **fills `AICommandBar` with a synthetic prompt** and opens the standard preview flow. No direct execution.

---

## Phase 4 — Operational macros

- Typed registry `supabase/functions/ai-command/macros.ts`:
  ```ts
  type Macro = {
    id: 'weaning_protocol' | 'deep_cleaning';
    params: ZodSchema;
    expand: (params, ctx) => string; // returns synthetic NL prompt
    maxOps: number;
  };
  ```
- Macros NEVER execute directly. `expand()` returns a natural-language prompt that goes through the existing parser → preview → confirm pipeline.
- Frontend: `MacroPicker.tsx` dropdown next to `AICommandBar` with parameter form + dry-run preview.
- Hard caps: `maxOps ≤ 20`, 30s timeout, conflict detection (refuse if same lote/caja appears in conflicting ops).

---

## Phase 5 — Analytics + environment separation

- `src/pages/CopilotAnalytics.tsx` — admin-only page reading `ai_telemetry_events` + `ai_journal_runs`:
  - Clarification rate, abandon rate, parse-failure rate, avg confirm time, macro usage, manual-edit rate
  - Recharts bar/line charts, all queries org-scoped via RLS
- Environment separation:
  - `.env.staging` / `.env.production` example files + docs in `docs/DEPLOYMENT.md`
  - `package.json` scripts `build:staging`, `build:production` (Vite mode flags)
  - Feature flags via `VITE_FEATURE_*` env vars (voice, macros, proactive can be toggled)
  - Rollback notes (Lovable revert + Supabase migration down strategy)

---

## Cross-cutting

**Security**
- All new tables: org-scoped RLS only, no role escalation paths, `created_by`/`user_id` immutable via insert-only `WITH CHECK (user_id = auth.uid())`.
- Aliases & telemetry strictly org-isolated.

**Testing**
- Extend `normalize_test.ts` with: clarification op passthrough, malformed payload regression, alias substitution.
- New `macros_test.ts`, `clarification_test.ts` (Deno).
- Frontend: 1 Vitest per new pure module (`aiSuggestions`, macro expand functions).

**UX guardrails preserved**
- No auto-execute anywhere
- Voice → fills text, never submits
- Suggestions → fill prompt, never submit
- Macros → expand to prompt, go through preview
- Clarification → blocks execution, requests human input

---

## Deliverable order in this build loop

If you approve, I'll implement **Phase 1 fully** in this loop (highest leverage: unblocks aliases, clarification UI, telemetry), then ask before continuing to Phase 2–5. This keeps each loop reviewable and the diff focused.

**Question before I start:** Do you want all 5 phases implemented in this single loop, or Phase 1 first with subsequent phases gated on your review? Phase 1 alone is ~6 files + 1 migration; all 5 together is ~25 files + 2 migrations and a much larger surface to review.