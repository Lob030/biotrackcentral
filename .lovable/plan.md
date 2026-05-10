## Corrección arquitectónica: Onboarding = 1 workspace, 1 propósito

Refactor del wizard para que cada ejecución cree exactamente un workspace con un único `purpose`. La selección múltiple de propósitos se elimina; crear varios entornos será responsabilidad del Dashboard (fuera del alcance de este prompt).

### Cambios por archivo

**1. `src/features/onboarding/lib/types.ts`**
- `WorkspaceDraft.purpose: Purpose[]` → `purpose: Purpose`
- Añadir tipo interno del estado: `purpose: Purpose | null`

**2. `src/features/onboarding/lib/onboardingOptions.ts`**
- `requiresSubtype(p: Purpose | null): boolean` → `p === "business" || p === "vet"`
- `getSubtypesFor(p: Purpose | null): Subtype[]` con la misma tabla actual (4 para business, 5 para vet)

**3. `src/features/onboarding/hooks/useOnboardingState.tsx`**
- Estado: `purpose: Purpose | null` (inicial `null`)
- Eliminar `togglePurpose`; añadir `setPurpose(p: Purpose)`. Al cambiar a `pet`, limpiar `subtype`.
- `canAdvance` paso 1: `purpose !== null`
- `stepOrder` / `next` / `back`: si `purpose === 'pet'` → orden `[1, 3, 4, "summary"]`; en otro caso `[1, 2, 3, 4, "summary"]`
- `buildDraft`: `purpose` como string único, `subtype: requiresSubtype(purpose) ? subtype : null`, `name: "Entorno " + new Date().toISOString()`
- Persistencia: eliminar `sessionStorage` y la clave `biotrack_onboarding_progress`. Mantener solo `localStorage` con `biotrack_pending_workspace` escrito en `confirm()`. (No se persiste el progreso intermedio para simplificar.)
- `reset()` limpia `localStorage[biotrack_pending_workspace]`.

**4. `src/features/onboarding/steps/StepPurpose.tsx`**
- Selección única: clic en una card asigna `setPurpose(value)`; visualmente solo una queda marcada.
- Eliminar botón "+ Añadir otro entorno" y el import de `Plus`.
- Mantener estilo de tarjetas y accesibilidad por teclado.

**5. `src/features/onboarding/steps/WorkspaceSummary.tsx`**
- Adaptar a `purpose: Purpose` (sin `.map().join()`): mostrar el `label` del único propósito.
- `requiresSubtype(purpose)` recibe ahora un único valor.

**6. `src/features/onboarding/steps/StepSubtype.tsx`** (verificar en exploración)
- Asegurar que `getSubtypesFor(purpose)` usa el valor único.

**7. `OnboardingWizard.tsx`**
- Sin cambios funcionales; el `totalSteps` y `progressIndex` ya derivan del hook.

### Validación manual post-cambio
- `pet` → wizard salta paso 2.
- `business` → paso 2 muestra 4 opciones.
- `vet` → paso 2 muestra 5 opciones.
- Tras confirmar: `JSON.parse(localStorage.biotrack_pending_workspace).purpose` es string.

### Fuera de alcance
- Botón "+ Nuevo Entorno" en Dashboard.
- Persistencia en DB (Prompt 2).
- Lista/colección de workspaces.
