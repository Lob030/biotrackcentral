# Operational AI Assistant MVP

A workflow-constrained operational copilot under `src/modules/bioterio/ai/`. Gemini parses one command into one intent; the runtime validates, previews, confirms, and executes via existing workflows. The AI never writes to the database.

## Pipeline

```text
User command
   ▼
ai-plan edge fn  (Gemini 2.5 Flash, tool-calling, single-op)
   ▼
OperationalPlan JSON  { intent, args, confidence, status }
   ▼
Zod validation (shared schemas)
   ▼
Runtime validation layer (occupancy, qty, breeding, weaning…)
   ▼
Operational preview (human-readable deltas)
   ▼
User confirmation (extra confirm for destructive ops)
   ▼
executor.ts → existing *Workflow via useWorkflowActions
   ▼
Operational events → projection updates → dashboard refresh
   ▼
ai_action_logs row finalized (status, durations, snapshots)
```

## Hard rules (architectural)

- **Model**: `google/gemini-2.5-flash` only. No preview models.
- **Single operation**: 1 command = 1 intent, or `NEEDS_DISAMBIGUATION`, or `INVALID_OPERATION`.
- **No memory**: each call gets only workspace + active instance + minimal projection context. No chat history.
- **No autonomy**: AI emits tool calls only; never mutates data; never executes workflows.
- **Allowed intents (closed set)**: `CREATE_LOT`, `SUBDIVIDE_LOT`, `MOVE_LOT`, `ASSIGN_LOT_TO_CAGE`, `REGISTER_MORTALITY`, `CREATE_BREEDING_GROUP`, `REGISTER_LITTER`, `REGISTER_WEANING`.
- **Disambiguation**: if multiple entities match a reference (e.g. multiple "ASF" lots), return `NEEDS_DISAMBIGUATION` with candidates — never guess.
- **Confidence**: `high | medium | low`. `low` → forced disambiguation, never auto-preview.
- **Execution lock**: global `isExecutingPlan` (Zustand store) disables submit + preview confirm; single-flight per tab; idempotency key per plan written to `ai_action_logs` to block double-submit across tabs.
- **Validation is authoritative**: runtime checks override AI args. Invalid → blocked at preview, never executed.

## File layout

```text
src/modules/bioterio/ai/
  index.ts
  intents.ts                 # IntentName union, labels, DESTRUCTIVE set
  schemas.ts                 # Zod per-intent arg schemas (client mirror)
  resolver.ts                # code/name → entity (lot, cage); returns candidates[] for ambiguity
  validation.ts              # occupancy, qty, breeding, weaning, subdivision rules
  preview.ts                 # builds PlanPreview { affectedLots, affectedCages, deltas, warnings }
  executor.ts                # OperationalPlan → useWorkflowActions call; updates ai_action_logs
  client.ts                  # planAction(prompt) → calls ai-plan edge fn
  state.ts                   # Zustand: isExecutingPlan, currentPlan
  prompts/
    systemPrompt.ts          # strict parser prompt (provided verbatim)
    intentExamples.ts        # few-shot dataset
  components/
    OperationalAssistantBar.tsx     # ⌘K floating bar (replaces AIAgentBar)
    OperationalPlanPreview.tsx      # human-readable preview modal
    DisambiguationPicker.tsx        # candidate selector when NEEDS_DISAMBIGUATION

supabase/functions/_shared/
  bioterio-ai-schemas.ts     # Deno mirror of Zod schemas + tool definitions

supabase/functions/ai-plan/index.ts   # rewritten for single-op, Gemini 2.5 Flash
supabase/functions/ai-execute/         # DELETED (deploy-delete + filesystem-delete)
```

## Edge function `ai-plan`

- POST `{ prompt, workspaceId, instanceId, context? }`.
- Validates JWT, loads minimal context (active workspace, instance, lot/cage codes index for resolution hints — no full data dump).
- Calls Lovable AI Gateway with `model: "google/gemini-2.5-flash"`, `tool_choice: "required"`, one tool per allowed intent + `needs_disambiguation` + `invalid_operation`.
- Reads exactly one tool call. Validates args with Zod (deno mirror). Resolves refs.
- Returns one of:
  - `{ status: "ok", operation: { id, intent, args, confidence, preview, warnings } }`
  - `{ status: "needs_disambiguation", reason, candidates: [{ field, options: [...] }] }`
  - `{ status: "invalid", reason }`
- Writes `ai_action_logs` row with `status='planned'`, `intent`, `confidence`, `preview_snapshot`, `operational_context`. No mutations beyond this audit row.

## Client execution

- `executor.ts` consumes the approved plan, calls the matching `useWorkflowActions` method (1:1 mapping). Sequential awaits not needed (single op).
- On result: updates `ai_action_logs` with `execution_status`, `execution_duration_ms`, `validation_errors`, `result`.
- Uses existing `OperationSuccessToast`. Existing workflow query invalidations refresh the dashboard automatically.

## Validation rules (runtime, authoritative)

| Intent | Rule |
|---|---|
| `MOVE_LOT` / `ASSIGN_LOT_TO_CAGE` | destination cage `availableSpace ≥ moved qty`; cage status not `cleaning` |
| `REGISTER_MORTALITY` | `quantity ≤ lot.currentQuantity`; lot status active |
| `SUBDIVIDE_LOT` | Σ subdivisions ≤ `lot.currentQuantity`; sex split coherent |
| `CREATE_BREEDING_GROUP` | ≥1 male lot + ≥1 female lot; same species; lots active |
| `REGISTER_LITTER` | breeding group exists & active |
| `REGISTER_WEANING` | litter lot exists, not already weaned, has live births |
| `CREATE_LOT` | required fields per `CreateLotWorkflowInput`; cage capacity if assigned |

Hard validation errors → operation blocked in preview. Soft warnings → shown but executable.

## Preview UX (human-readable, never raw JSON)

- Header: intent label + confidence badge.
- Body lines like:
  - `Lot ASF-22 quantity: 40 → 35`
  - `Cage B12 occupancy: 8/20 → 13/20`
  - `Subdivision: ASF-22 (40) → ASF-22-M (22) + ASF-22-F (18)`
- Warnings list (amber) and validation errors (red, blocks confirm).
- Destructive ops (`REGISTER_MORTALITY`, `SUBDIVIDE_LOT`, `REGISTER_WEANING`) → second-step `confirm-dialog` ("type CONFIRM" or extra checkbox).
- `NEEDS_DISAMBIGUATION` → `DisambiguationPicker` with candidate cards; user picks → re-runs plan with explicit code, no Gemini round-trip needed.

## `ai_action_logs` enrichment

Plan JSONB shape:
```json
{
  "intent": "MOVE_LOT",
  "args": { ... },
  "confidence": "high",
  "warnings": [...],
  "validation_errors": [...],
  "preview_snapshot": { "lots": [...], "cages": [...], "deltas": [...] },
  "operational_context": { "workspaceId": "...", "instanceId": "..." },
  "execution_status": "executed | failed | cancelled | invalid",
  "execution_duration_ms": 412
}
```
No schema migration needed (existing JSONB columns).

## Migration / cleanup

- Replace `<AIAgentBar />` with `<OperationalAssistantBar />` in `src/components/AppLayout.tsx`.
- Delete `src/components/ai/AIAgentBar.tsx`, `AIPlanPreview.tsx`, `src/lib/ai/*`.
- Delete `supabase/functions/ai-execute/` and call `supabase--delete_edge_functions(["ai-execute"])`.
- Keep `ai_action_logs` table and its RLS unchanged.

## Why this is safe

- **Workflow-constrained**: Gemini's only output surface is the tool catalog mapping 1:1 to existing workflows → no invented operations, no DB freeform.
- **Client-side execution via existing workflows**: every AI op flows through the same `*Workflow` functions the UI calls, so events, projections, and dashboard invalidations behave identically — no parallel write paths to keep in sync.
- **Runtime validation is authoritative**: even a malformed Gemini output is rejected before reaching the executor; the AI cannot bypass occupancy/quantity/compatibility rules.
- **Single-op + no memory + low temperature stable model** dramatically shrink the hallucination surface and make behavior reproducible across sessions.
- **Disambiguation over guessing**: the assistant refuses to act on ambiguous references, eliminating the most common operational error class (wrong entity).
- **Audit trail**: every plan + result lives in `ai_action_logs` with confidence, warnings, and snapshots, ready for future predictive systems to consume safely.

## Open question

Confirm preference for the disambiguation flow: (a) edge fn returns candidates and the UI re-submits an explicit prompt, vs. (b) UI calls a thin `resolve` endpoint that bypasses Gemini once the user picks. I propose (a) for simplicity in MVP.
