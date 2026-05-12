# Reemplazo del Copiloto IA por Agente Gemini con Human-in-the-Loop

## Resumen
Eliminamos por completo el copiloto antiguo (`AICommandBar`, edge function `ai-command`, tablas `ai_aliases`, `ai_journal_runs`, `ai_telemetry_events`, página `CopilotAnalytics`, `AIAliasesManager` en Admin) y lo reemplazamos por un nuevo flujo seguro **plan → preview → execute → audit** usando Gemini 2.5 Flash vía Lovable AI Gateway. Mantenemos el mismo alcance de operaciones (líneas, cajas, lotes, mortalidad, traslados, división, clientes, pedidos).

> Nota técnica: el proyecto es Vite/React, no Next.js. Las "rutas API" se implementan como **Supabase Edge Functions** (`ai-plan` y `ai-execute`), no como `src/app/api/.../route.ts`.

## Fase 1 — Eliminación

### Archivos borrados
- `src/components/ai/AICommandBar.tsx`
- `src/components/ai/AIOperationBatchPreview.tsx`
- `src/components/ai/AIOperationCard.tsx`
- `src/components/ai/AIConfirmationDialog.tsx`
- `src/components/ai/AIResultPreview.tsx`
- `src/components/ai/AIValidationWarnings.tsx`
- `src/components/ai/AIAliasesManager.tsx`
- `src/data/aiCommand.ts`
- `src/pages/CopilotAnalytics.tsx`
- `supabase/functions/ai-command/` (carpeta completa, incluye handlers)

### Edits
- `src/components/AppLayout.tsx`: quitar import y render de `<AICommandBar/>`, montar nuevo `<AIAgentBar/>`.
- `src/App.tsx`: eliminar lazy `CopilotAnalytics` y la ruta `/admin/ai-analytics`.
- `src/pages/Admin.tsx`: quitar import y render de `AIAliasesManager`.

### Migración SQL (drop + create)
- `DROP TABLE` de `ai_aliases`, `ai_journal_runs`, `ai_telemetry_events`.
- `DELETE` deploy de la edge function `ai-command` mediante `supabase--delete_edge_functions`.

## Fase 2 — Nuevo Agente

### Tabla nueva `ai_action_logs`
Campos de dominio: `user_id`, `workspace_id`, `prompt`, `plan` (jsonb), `status` (`planned`/`executed`/`failed`/`rejected`), `result` (jsonb), `error` (text). RLS: el usuario solo ve/inserta sus propias filas; `workspace_id` debe pertenecer al usuario (subquery a `workspaces`).

### Edge Function `ai-plan`
1. Verifica JWT con `getClaims`.
2. Recibe `{ prompt, workspace_id }`. Valida que `workspace_id` pertenece al usuario (`workspaces.user_id = auth.uid()`).
3. Llama Gemini 2.5 Flash vía gateway con tool-calling forzado a un schema Zod estricto (mismo set que el copiloto anterior: `crear_linea_genetica`, `crear_caja`, `crear_lote`, `editar_*`, `registrar_mortalidad`, `trasladar_animales`, `dividir_lote`, `crear_cliente`, `crear_pedido`, etc.).
4. Valida la salida con Zod (rechazo total si no encaja).
5. **Dry-run**: para cada operación, simula contra la DB con cliente RLS del usuario (resolver refs, verificar existencia de caja/lote/línea, stock suficiente para mortalidad, capacidad de caja, etc.) y arma un `plan_id` (uuid) + lista de `operations` con `preview` (qué cambia exactamente) y `warnings`.
6. Persiste el plan en `ai_action_logs` con `status='planned'`.
7. Devuelve `{ plan_id, operations, warnings, invalid }` al cliente. **Nunca ejecuta.**

### Edge Function `ai-execute`
1. Verifica JWT.
2. Recibe `{ plan_id, approved_operation_ids }`.
3. Carga el plan desde `ai_action_logs` (debe pertenecer al usuario, `status='planned'`).
4. Ejecuta solo las operaciones aprobadas, una por una, cada una a través del cliente Supabase con el JWT del usuario (RLS hace cumplir aislamiento). Cada operación llama un handler tipado (puerto del antiguo `handlers/`).
5. Actualiza `ai_action_logs` con `status='executed'|'failed'`, `result` y `error`.
6. Responde `{ results: [{ id, status, summary, error? }] }`.

**Restricciones**:
- IA no genera SQL. Solo emite payloads con un schema Zod cerrado.
- Toda escritura usa el cliente Supabase del usuario (RLS), nunca service role.
- `workspace_id` es inyectado server-side y validado en plan + execute.

### Frontend nuevo
- `src/lib/ai/schemas.ts` — schemas Zod compartidos (intent + payload por intent).
- `src/lib/ai/types.ts` — tipos TS de plan y operación.
- `src/lib/ai/client.ts` — `planAction(prompt)` / `executePlan(planId, opIds)` usando `supabase.functions.invoke`.
- `src/components/ai/AIAgentBar.tsx` — botón flotante + dialog con textarea para el comando (reemplaza visualmente al copiloto anterior).
- `src/components/ai/AIPlanPreview.tsx` — modal con tarjetas por operación, checkboxes, warnings, botón "Ejecutar seleccionadas" con confirmación.
- Cuando `execute` termina, invalida queries (`lotes`, `cajas`, `lineas_geneticas`, `clientes`, `pedidos`) y muestra toast.

### Orden de ejecución
1. **Migración SQL** (drop tablas viejas + crear `ai_action_logs` con RLS) — requiere aprobación.
2. Borrar archivos del copiloto antiguo + ajustar `AppLayout`, `App.tsx`, `Admin.tsx`.
3. Crear edge functions `ai-plan` y `ai-execute` (con handlers portados).
4. Eliminar deploy de `ai-command`.
5. Crear archivos frontend del nuevo agente y montar en `AppLayout`.

## Detalles técnicos clave
- **Modelo IA**: `google/gemini-2.5-flash` via `https://ai.gateway.lovable.dev/v1/chat/completions` con `tools`/`tool_choice` para forzar JSON estructurado. Sin streaming (respuesta corta). `LOVABLE_API_KEY` ya disponible.
- **Resolver refs**: las refs por nombre (caja "A1", línea "C57BL/6") se resuelven en el dry-run consultando con el cliente RLS; si una ref no existe, la operación se marca como `invalid` y no se incluye en el plan ejecutable.
- **Workspace activo**: `useActiveWorkspace()` ya existe; `AIAgentBar` lo lee y lo envía en el body.
- **Auditoría**: cada llamada a `ai-plan` y `ai-execute` deja una fila en `ai_action_logs` con prompt, plan completo, resultado y errores.

## Validación post-implementación
- Dashboard ya no muestra el botón "Copiloto" anterior; aparece el nuevo "Agente IA".
- `/admin/ai-analytics` ya no existe; `Admin` no renderiza `AIAliasesManager`.
- Build sin imports rotos.
- Probar: "Crea cajas A1, A2 en zona A, uso engorda" → preview con 2 ops → aprobar → 2 cajas creadas → fila en `ai_action_logs`.
- Probar: comando inválido ("borra la base de datos") → operación rechazada por schema, fila `status='planned'` con `invalid` poblado.
