## Goal

Constrain the AI Copilot to a **worker-level role** with strict module scope, and enforce a **plan-first, human-approved** execution model across the entire pipeline (parser → preview → execute).

The current architecture already has parse/execute separation and a preview dialog, but it does NOT enforce module scope at the schema/handler level, and the preview is not framed as an "Operational Plan". This plan closes both gaps.

---

## 1. Define & enforce the allowed module scope

**Allowed intents (worker scope):**
- `crear_linea_genetica`, `editar_linea_genetica`
- `crear_caja`, `editar_caja`
- `crear_lote`, `editar_lote`, `registrar_mortalidad`, `trasladar_animales`, `dividir_lote`
- `crear_cliente`, `editar_cliente` *(new — currently missing)*
- `crear_pedido`, `editar_pedido` *(new — currently missing)*
- `requires_clarification`

**Forbidden** (must never appear in any code path, prompt, or handler): organization settings, user roles, billing/plan, telemetry admin, alertas config, gastos, analytics, system controls.

**Where this is enforced:**
1. `supabase/functions/ai-command/schemas.ts` — `INTENT_NAMES` becomes the single source of truth; any intent outside the list is rejected by zod into `invalid[]`.
2. `supabase/functions/ai-command/index.ts` — handler dispatcher uses an explicit allow-list map; unknown intent → typed error, never executed.
3. `supabase/functions/ai-command/prompt.ts` — system prompt explicitly states the AI is a *worker*, lists allowed modules, and forbids admin/config/billing/analytics actions.
4. Frontend `INTENT_LABELS` + `DESTRUCTIVE_INTENTS` updated to match.

---

## 2. Add the two missing operational modules (Clients & Orders)

New zod schemas + edge handlers:
- `handlers/clientes.ts` — create/edit client (name, contact, type, notes; org-scoped via RLS).
- `handlers/pedidos.ts` — create/edit order header + line items (client ref, species, stage, quantity, unit price). Resolution layer matches client by name/alias.

Both go through the same parse → preview → confirm flow as existing handlers. No new tables — uses existing `clientes`, `pedidos`, `pedidos_detalles`.

---

## 3. Reframe the preview as an "Operational Plan"

Rename the preview UX language (no logic change to execution gating, which is already correct):

- `AIOperationBatchPreview.tsx` title: **"Plan Operacional Detectado"** instead of "Operaciones detectadas".
- Each `AIOperationCard` shows three labeled sections:
  - **✓ Lo que voy a hacer** (intent + payload summary)
  - **🔍 Lo que entendí / asumí** (`explanation.understood`, `assumptions_made`, `entities_resolved`)
  - **⚠ Información faltante** (only when `requires_clarification` or low confidence)
- Group header summarizing total ops by module ("3 cajas, 1 nacimiento, 1 cliente").
- Confirm button copy: **"Aprobar y ejecutar plan"**.
- Reinforce in the dialog footer: *"Nada se ejecuta sin tu aprobación explícita."*

---

## 4. Strengthen plan-first guarantees in the prompt

Update `prompt.ts` with explicit rules:
- "Eres un trabajador del bioterio, NO un administrador."
- "Solo puedes operar sobre: líneas genéticas, cajas, lotes, clientes, pedidos."
- "NUNCA ejecutas acciones — solo propones un plan que el humano debe aprobar."
- "Prefiere `requires_clarification` ante cualquier ambigüedad real, pero infiere contexto razonable cuando sea obvio (ej. especie del lote padre, caja vacía implícita)."
- Few-shot examples matching the user's samples ("Hoy nacieron 12 en la A1", "Abrimos las cajas B1 B2 y B3", "Movimos unos machos a la D4").

---

## 5. Defense-in-depth: handler allow-list

In `supabase/functions/ai-command/index.ts`, replace any dynamic dispatch with an explicit map:

```ts
const HANDLERS = {
  crear_linea_genetica: handleCrearLinea,
  editar_linea_genetica: handleEditarLinea,
  crear_caja: handleCrearCaja,
  // … only the worker-scoped intents
} as const;
```

If `intent` is not a key, the operation is rejected with `"intent_not_allowed"` and logged into `ai_journal_runs.results` as an error. This makes prompt-injection bypass impossible even if the LLM hallucinates an admin intent.

---

## 6. Out of scope (intentionally not changing)

- RLS policies (already org-scoped and correct).
- Telemetry admin UI (`AIAliasesManager`, analytics) — remains admin-only via `RoleRoute`.
- Voice / suggestions / macros (Phases 2–5 of prior plan) — not part of this request.
- The execute_batch endpoint's existing "selected ops only" logic — already correct.

---

## Files touched

**Edit:**
- `supabase/functions/ai-command/schemas.ts` (add clientes/pedidos intents, tighten allow-list)
- `supabase/functions/ai-command/prompt.ts` (worker role, plan-first language, few-shots)
- `supabase/functions/ai-command/index.ts` (explicit handler map, intent_not_allowed rejection)
- `supabase/functions/ai-command/resolve.ts` (resolve clientes by name/alias)
- `src/data/aiCommand.ts` (`INTENT_LABELS` for new intents)
- `src/components/ai/AIOperationBatchPreview.tsx` (Plan Operacional copy + grouped header)
- `src/components/ai/AIOperationCard.tsx` (three labeled sections)

**Create:**
- `supabase/functions/ai-command/handlers/clientes.ts`
- `supabase/functions/ai-command/handlers/pedidos.ts`

No DB migrations. No new tables. No RLS changes.

---

## Open question

Do you want **clientes** and **pedidos** included in this loop (recommended, since the brief lists them as allowed modules), or should I ship the role/scope hardening + plan-first UX first and add those two handlers in a second pass?
