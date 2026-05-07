# Multi-Operation AI Copilot — Operational Journal Parser

## Goal

Upgrade the Copilot from "one command → one intent" to "one operational note → N validated intents", reviewed and executed as a batch, while preserving the existing parse/execute separation, RLS, typed handlers, zod validation and audit logs.

## Architecture overview

```text
 ┌──────────────┐       ┌─────────────────────┐      ┌────────────────────┐
 │ user note    │──────▶│ /ai-command?action= │─────▶│ LLM (tool calling) │
 │ (free text)  │       │   parse             │      │  → operations[]    │
 └──────────────┘       └──────────┬──────────┘      └──────────┬─────────┘
                                   │ zod validate per op        │
                                   ▼                            │
                        ┌──────────────────────┐                │
                        │ batch envelope:      │◀───────────────┘
                        │  valid[] + invalid[] │
                        └──────────┬───────────┘
                                   ▼
                       ┌──────────────────────┐
                       │ AIOperationBatch     │  user reviews,
                       │ Preview (cards)      │  toggles, edits selection
                       └──────────┬───────────┘
                                  ▼
                       ┌──────────────────────┐
                       │ /ai-command?action=  │  sequential, per-op
                       │   execute_batch      │  re-validation + handler
                       └──────────────────────┘
```

The LLM still produces only structured JSON via tool calling. It never touches the DB, never emits SQL, never performs autonomous execution. Each operation is independently validated, previewed, and explicitly approved by the user before any handler runs.

## What changes vs current

- `parse` returns a **batch** of operations (1..N) instead of a single intent. Single-intent UI keeps working — a 1-op batch renders as a single card.
- A new `execute_batch` action runs operations sequentially; each op is re-validated server-side with the same zod schema and dispatched to the existing typed handler. Per-op success/failure is captured.
- New UI: a batch preview with one card per operation, toggles to include/exclude, and clear error messages for invalid operations. Partial execution is the default.
- New audit log table `ai_journal_runs` records the original note, extracted operations, and per-op execution results.

## Schema additions (zod)

In `supabase/functions/ai-command/schemas.ts`:

- New `operationSchema` = current intent envelope + a string `id` (`tmp-1`, `tmp-2`, …) to correlate parse → execute.
- New `batchEnvelopeSchema = z.object({ operations: z.array(operationSchema).min(1).max(20) })`.
- `validateOperation(raw)` mirrors current `validateIntent` but returns `{ ok: true, op } | { ok: false, id, intent?, raw, error }` so invalid ops do not abort the batch.

No existing intent schemas change. No DB schema changes for intents themselves.

## Edge function changes (`supabase/functions/ai-command/index.ts`)

- `actionParse`:
  - Same auth + org context loading.
  - New tool definition `registrar_operaciones` whose `parameters` is `{ operations: [ oneOf <intent variants with id> ] }` with `min 1, max 20`.
  - Updated system prompt: "Extract ALL operations present in the note as separate items. Preserve order. If a sentence is ambiguous, include it with confidence < 0.6. Never merge unrelated operations."
  - After the LLM returns, validate the envelope, then validate each operation independently. Return:
    ```json
    {
      "ok": true,
      "operations": [ { "id", "intent", "confidence", "payload", "requires_confirmation": true } ],
      "invalid":   [ { "id", "intent?", "error", "raw" } ]
    }
    ```
- `actionExecuteBatch` (new, `?action=execute_batch`):
  - Accepts `{ note?: string, operations: ValidatedOperation[] }`.
  - Re-auths, re-validates each op with zod, then calls the existing `HANDLERS[intent]` sequentially.
  - Captures `{ id, status: "ok" | "error", summary?, affected?, error? }` per op. One failing op does NOT abort the rest, but destructive ops that depend on a prior op's resolved ref simply fail their own ref-resolution step (handlers already throw `ResolveError`).
  - Writes one row to `ai_journal_runs` with the original note, operations, and results.
- Backward-compat: `actionExecute` (single op) is kept. Frontend single-shot flows still work.

## Frontend changes

- `src/data/aiCommand.ts`:
  - New types `BatchParseResult`, `ValidatedOperation`, `OperationExecutionResult`.
  - New `parseBatch(text)` → calls `?action=parse` (now returns batch shape).
  - New `executeBatch(note, operations)` → calls `?action=execute_batch`.
  - Keep `parseCommand` / `executeCommand` as thin wrappers for compatibility.

- New components in `src/components/ai/`:
  - `AIOperationCard.tsx` — single op card: intent label, confidence chip, payload table (reuses logic from current `AIResultPreview`), include/exclude toggle, low-confidence + destructive warnings, post-execution status badge (✓ ok / ✗ error + message).
  - `AIValidationWarnings.tsx` — banner listing invalid operations from parse phase with reason and the original snippet.
  - `AIOperationBatchPreview.tsx` — full preview dialog: header summary ("3 operaciones detectadas, 2 seleccionadas"), invalid warnings, scrollable list of `AIOperationCard`, footer with "Ejecutar 2 operaciones" / Cancel. Disables run when nothing selected. After execution, re-renders cards with their result statuses and offers a "Cerrar" button.

- `AICommandBar.tsx` updates:
  - Switch input from `<Input />` to `<Textarea />` (auto-grow, multi-line) so users can paste journals.
  - On submit, call `parseBatch`. Open `AIOperationBatchPreview` instead of `AIConfirmationDialog`.
  - Examples list updated to include a multi-line journal example.
  - Keep ⌘K shortcut and floating launcher.

- `AIConfirmationDialog.tsx` is no longer the primary path but stays for any single-intent callers.

## Database additions (audit)

New table `ai_journal_runs` (only addition, no edits to existing tables):

- `organization_id uuid`, `user_id uuid`, `note text`, `operations jsonb`, `results jsonb`, `created_at timestamptz default now()`.
- RLS: select/insert restricted to `organization_id = get_user_org(auth.uid())` and `user_id = auth.uid()` for insert. No update, no delete.
- Insert performed from the edge function under the user's JWT (RLS enforced).

## Validation strategy

1. **Envelope validation**: the LLM tool call must match `batchEnvelopeSchema` (1..20 ops). If not, return 422.
2. **Per-operation validation**: each op runs through its existing intent zod schema. Failures become `invalid[]` entries with a human-readable error; they do NOT block the rest.
3. **Re-validation on execute**: every op is re-parsed by zod on `execute_batch` so a tampered payload from the client is rejected.
4. **Reference resolution**: handlers continue to resolve textual refs (`A1`, `C57-22`) inside the user's org via existing `resolve.ts`. Unknown refs surface as per-op errors.
5. **Confidence**: ops with `confidence < 0.6` are marked low-confidence in the UI and pre-unchecked, forcing explicit user opt-in.

## Partial execution handling

- Server executes only the operations the client sends, in array order.
- Each handler call is wrapped in try/catch; a thrown error becomes `{ status: "error", error: msg }` for that op only; the loop continues.
- Response shape:
  ```json
  { "ok": true, "results": [ { "id": "tmp-1", "status": "ok", "summary": "...", "affected": {...} },
                             { "id": "tmp-2", "status": "error", "error": "Caja A9 no existe" } ] }
  ```
- UI replaces each card's footer with its result; user can re-open the bar and re-issue corrections for the failed ones.

## Safety boundaries (preserved)

- LLM output is constrained to the tool schema; no free text, no SQL, no shell.
- Zod validates envelope and every payload twice (parse + execute).
- All writes go through existing typed handlers using the user's JWT → RLS enforced.
- Org-scoped reference resolution prevents cross-tenant access.
- Rate limiting from Lovable AI Gateway (429/402) is propagated unchanged.
- Sequential execution avoids race conditions on shared lote counters.
- Hard caps: max 20 operations per batch, max 4000 chars per note.

## Ambiguity handling

- System prompt instructs the LLM to include uncertain items with `confidence < 0.6` rather than guess.
- Low-confidence cards render with an amber warning and are unchecked by default.
- Operations missing a required ref (e.g. an unknown caja code) become `invalid[]` from per-op zod or from ref resolution at execute time, with the offending field highlighted.

## Auditability

`ai_journal_runs` stores: original note, validated operations, invalid ops, execution results, timestamps, user, org. Combined with the existing `lote_eventos` audit trail this gives full traceability: "what did the user paste" → "what did the AI extract" → "what was executed and what failed".

## Files

**Created**
- `src/components/ai/AIOperationCard.tsx`
- `src/components/ai/AIOperationBatchPreview.tsx`
- `src/components/ai/AIValidationWarnings.tsx`
- `supabase/migrations/<ts>_ai_journal_runs.sql` (new audit table + RLS)

**Edited**
- `supabase/functions/ai-command/index.ts` (batch tool, `parse` returns batch, new `execute_batch`)
- `supabase/functions/ai-command/schemas.ts` (operation + batch envelope, `validateOperation`)
- `supabase/functions/ai-command/prompt.ts` (multi-operation extraction rules)
- `src/data/aiCommand.ts` (batch types + helpers)
- `src/components/ai/AICommandBar.tsx` (textarea, batch preview wiring)

**Untouched**
- All existing handlers in `supabase/functions/ai-command/handlers/*`
- `resolve.ts`
- All existing intent schemas
- `AIResultPreview.tsx` and `AIConfirmationDialog.tsx` (kept for compatibility)

## Future scalability

- Per-intent grouping in the UI ("3 cajas, 2 nacimientos, 1 línea") becomes trivial because operations are typed.
- Read-only "explain" intents (`resumen_lote`, `proyeccion_stock`) plug into the same batch pipeline as side-effect-free ops.
- Dependency hints (`depends_on: ["tmp-1"]`) can be added to the operation schema later without breaking clients.
- Streaming progress (per-op WebSocket / SSE) is a future drop-in on top of the same sequential executor.
- Replay / undo can be built later from `ai_journal_runs` since the original note + extracted ops are stored.
