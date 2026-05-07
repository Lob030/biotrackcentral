
# AI Operational Copilot — Architecture & Implementation Plan

A structured copilot that turns natural language into validated **operational intents**. The LLM is sandboxed: it never touches the database, never writes SQL, never executes anything. It produces JSON. The backend validates and routes to typed handlers that use the existing Supabase client (with RLS intact).

---

## 1. Architecture Overview

```text
 ┌────────────────────┐    natural language    ┌────────────────────────────┐
 │  AICommandBar (⌘K) │ ─────────────────────► │ edge fn: ai-command/parse  │
 └────────────────────┘                        │  • auth user (getClaims)   │
          ▲                                    │  • load org context        │
          │ structured intent JSON             │  • call Lovable AI         │
          │                                    │  • validate JSON (zod)     │
          │                                    │  • resolve refs (lote/caja)│
          │                                    │  • return preview          │
          ▼                                    └─────────────┬──────────────┘
 ┌────────────────────┐                                      │
 │  AIResultPreview   │ ◄────────────────────────────────────┘
 │  AIConfirmDialog   │
 └─────────┬──────────┘ user confirms
           │
           ▼
 ┌────────────────────────────┐
 │ edge fn: ai-command/execute│
 │  • re-auth                 │
 │  • re-validate intent      │
 │  • dispatch typed handler  │
 │  • write via Supabase RLS  │
 │  • emit lote_eventos audit │
 └────────────────────────────┘
```

**Two endpoints, one function** (`ai-command` with `?action=parse|execute`). Parse and execute are split so the LLM is never on the write path — the preview the user sees is exactly what executes.

---

## 2. Security Boundaries

1. **LLM output is data, not code.** It returns one JSON object matching a strict zod schema. Anything else is rejected.
2. **No SQL ever leaves the LLM.** Handlers use the typed Supabase client with parameterized values.
3. **RLS is preserved.** The edge function creates a Supabase client with the user's JWT (`Authorization` header forwarded). Every write goes through RLS — the LLM cannot bypass tenant isolation.
4. **Re-validation on execute.** The execute endpoint re-parses the intent server-side; the client cannot tamper with the payload between preview and execute.
5. **Reference resolution server-side.** "Lote C57-22" is resolved to a UUID via a scoped query in the user's org. If multiple matches → ambiguity error returned to UI for disambiguation.
6. **Quantity / sex / enum validation** done in zod + handler-level checks (e.g. `cantidad > 0`, `cantidad <= lote.cantidad_actual`).
7. **Audit trail.** Mortality, transfers, and splits emit `lote_eventos` rows (existing `aplicar_evento_lote` trigger handles stock side-effects). `created_by = auth.uid()` is enforced by existing RLS + immutability trigger.
8. **Rate limit & error pass-through** for 402/429 from Lovable AI Gateway.

---

## 3. Intent Catalog (zod schemas)

All intents share an envelope:
```ts
{ intent: IntentName, confidence: number, payload: <intent-specific> }
```

| Intent | Payload (validated) |
|---|---|
| `crear_linea_genetica` | `{ nombre, especie, origen?, color_etiqueta? }` |
| `editar_linea_genetica` | `{ ref: string \| id, cambios: { nombre?, origen?, color_etiqueta? } }` |
| `crear_caja` | `{ codigos: string[], ubicacion?, capacidad?, uso }` (batch via array) |
| `editar_caja` | `{ ref, cambios: { ubicacion?, capacidad?, estado? } }` |
| `crear_lote` | `{ codigo, especie, fecha_nacimiento, linea_genetica?, cantidad_inicial?, machos?, hembras?, caja? }` |
| `editar_lote` | `{ ref, cambios: { codigo?, estado?, notas?, caja? } }` |
| `registrar_mortalidad` | `{ lote?: string, caja?: string, cantidad, sexo?: 'macho'\|'hembra'\|'mixto', fecha?, notas? }` |
| `trasladar_animales` | `{ lote_origen, caja_destino, cantidad, sexo?, fecha?, notas? }` |
| `dividir_lote` | `{ lote_origen, movimientos: [{ sexo?, cantidad, caja, codigo_nuevo? }] }` |

---

## 4. Backend — `supabase/functions/ai-command/`

Single file `index.ts` exporting two handlers behind `?action=`.

### 4.1 `parse`
1. `getClaims(token)` → user id.
2. Load org id via `profiles`.
3. Build a compact context string for the LLM:
   ```
   Lotes activos: [C57-22, BALB-03, ...]
   Cajas: [A1, A2, B1, ...]
   Líneas: [C57BL/6, CD1, ...]
   Especies válidas: ASF, Raton, Rata
   ```
   (Top N most-recent of each, ~50 names each, keeps prompt small.)
4. Call Lovable AI (`google/gemini-3-flash-preview`) with **tool calling** to force structured output (`response_intent` tool with the union schema). System prompt: "You are BioTrack Copilot. Return exactly one tool call. Never invent IDs. If unclear, set confidence < 0.6."
5. Validate the tool-call args with zod. Reject anything else.
6. Resolve textual refs ("C57-22", "A1") → DB rows in the user's org. Build a `preview` object with human-readable labels + resolved IDs + warnings (e.g. "lote tiene 12 animales, traslado pide 20").
7. Return `{ intent, payload, resolved, warnings, requires_confirmation: true }`.

### 4.2 `execute`
1. Re-auth, re-load org.
2. Re-validate the **resolved payload** sent by the client (zod).
3. Re-resolve refs by ID (defense-in-depth — no name lookup at this stage).
4. Dispatch:

```ts
const handlers = {
  crear_linea_genetica: handleCrearLinea,
  editar_linea_genetica: handleEditarLinea,
  crear_caja: handleCrearCaja,
  editar_caja: handleEditarCaja,
  crear_lote: handleCrearLote,
  editar_lote: handleEditarLote,
  registrar_mortalidad: handleMortalidad,   // inserts lote_eventos type='mortalidad'
  trasladar_animales: handleTraslado,        // lote_eventos type='traslado_caja'
  dividir_lote: handleDividirLote,           // creates child lotes + traslado events
};
```

Each handler:
- accepts `(supabase, orgId, userId, payload)`,
- runs entity-specific safety checks,
- returns `{ ok: true, summary: string, affected: {...} }`,
- throws typed errors mapped to HTTP 400/403/404/409.

### 4.3 File layout
```
supabase/functions/ai-command/
  index.ts              // routing + auth
  prompt.ts             // system prompt + context builder
  schemas.ts            // zod intent schemas (shared)
  resolve.ts            // textual ref → DB row
  handlers/
    lineas.ts
    cajas.ts
    lotes.ts
    mortalidad.ts
    traslados.ts
    division.ts
```

---

## 5. Frontend

### 5.1 Components (in `src/components/ai/`)
- **`AICommandBar.tsx`** — floating button + ⌘K dialog with input. Submits to `parse`. Shows loading shimmer.
- **`AIResultPreview.tsx`** — renders the structured preview: intent label, resolved entities (with badges), affected counts, warnings. Uses existing semantic tokens (`glass-card`, `page-title`, etc.).
- **`AIConfirmationDialog.tsx`** — wraps preview, "Cancelar" / "Ejecutar" buttons. Dangerous intents (mortalidad, dividir_lote, editar with destructive changes) require an explicit second click. Hooks into existing `ConfirmDialogProvider` style.

### 5.2 Wiring
- Mount `AICommandBar` in `AppLayout.tsx` (only inside protected layout, so it's auth-only).
- Global `Cmd/Ctrl + K` keyboard shortcut.
- After successful execute → invalidate relevant React Query keys via existing `invalidations.ts` helpers (`invalidateLotes`, `invalidateCajas`, etc.) + sonner toast with the handler's `summary`.

### 5.3 Data layer
- `src/data/aiCommand.ts` — two thin functions `parseCommand(text)` and `executeCommand(intent)` calling `supabase.functions.invoke('ai-command', { body: ... })`.

---

## 6. Validation Rules (handler-level)

- `crear_lote`: `cantidad_inicial = machos + hembras` if both given; require `fecha_nacimiento <= today`.
- `registrar_mortalidad`: `cantidad <= lote.cantidad_actual`; if `caja` given, infer lote (error if multiple).
- `trasladar_animales`: caja_destino must exist + belong to org; cantidad ≤ lote.cantidad_actual; emits `traslado_caja` event (existing trigger updates `caja_id`).
- `dividir_lote`: sum of movimientos ≤ lote.cantidad_actual; creates new child lotes with `lote_padre_id`, then emits ajuste/traslado events.
- All handlers: scope every query with `organization_id = orgId`. Even though RLS protects this, defense-in-depth.

---

## 7. Extensibility Strategy

Adding a new intent = 3 steps, no architectural change:
1. Add schema entry in `schemas.ts`.
2. Add handler file in `handlers/`.
3. Register in dispatch map + add 1-2 examples to system prompt.

The LLM call, validation pipeline, preview UI, and confirmation flow stay identical. New domains (ventas, gastos, alertas) plug in the same way.

---

## 8. What's intentionally NOT in this version

- ❌ No LangChain, no agents, no tool loops.
- ❌ No vector DB / RAG (context is small enumerated lists).
- ❌ No streaming (parse + execute are short request/response).
- ❌ No autonomous execution — every mutation requires explicit user click.
- ❌ No schema migrations.

---

## 9. Safest Next AI Capability (post-MVP)

**Read-only "explain" intents**: `resumen_lote`, `proyeccion_stock`, `estado_caja`. Same pipeline, same schema validator, but handlers only `select` — zero write risk, immediate user value, and exercises the same intent infrastructure. After that, batch operations (`registrar_mortalidad_masiva`) become natural since the architecture already supports arrays.

---

## 10. Files to be Created / Edited

**Created**
- `supabase/functions/ai-command/index.ts`
- `supabase/functions/ai-command/prompt.ts`
- `supabase/functions/ai-command/schemas.ts`
- `supabase/functions/ai-command/resolve.ts`
- `supabase/functions/ai-command/handlers/{lineas,cajas,lotes,mortalidad,traslados,division}.ts`
- `src/data/aiCommand.ts`
- `src/components/ai/AICommandBar.tsx`
- `src/components/ai/AIResultPreview.tsx`
- `src/components/ai/AIConfirmationDialog.tsx`

**Edited**
- `src/components/AppLayout.tsx` — mount command bar + keyboard shortcut.

No DB migrations. No schema changes. Existing RLS + triggers do the heavy lifting.
