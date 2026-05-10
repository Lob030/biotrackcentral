# Plan: Onboarding Wizard (UI + Estado Local)

Flujo de 3-4 pasos para configurar un "workspace" antes de entrar al dashboard. Solo UI, estado en memoria y persistencia en `localStorage`. Sin conexión a base de datos en este prompt.

Por defecto se preserva el flujo actual existente: `business → Granja/Bioterio → Mamíferos (roedores)` queda como path principal y validado.

## Alcance

- Ruta nueva `/onboarding` con wizard navegable adelante/atrás.
- Estado centralizado por entorno seleccionado.
- Posibilidad de añadir múltiples entornos desde el Paso 1.
- Resumen final antes de confirmar.
- Tras confirmar: guardar `biotrack_pending_workspace` en `localStorage` y redirigir a `/dashboard` (mock, sin escritura en DB).

## Reglas de negocio

- **Paso 1 — Propósito** (`pet` | `business` | `vet`): selección múltiple vía botón "+ Añadir otro entorno".
- **Paso 2 — Subtipo** (condicional):
  - `pet` → se omite por completo.
  - `business` → 4 opciones: Granja/Bioterio, PIMVS, UMA, Comercializadora.
  - `vet` → las 4 anteriores + Clínica Veterinaria.
- **Paso 3 — Clase animal**: Mamíferos, Peces, Reptiles, Anfibios, Aves, Artrópodos, Anélidos.
- **Paso 4 — Especie/raza** (opcional): input libre, placeholder dinámico según Paso 3 (ej. Mamíferos → "Ratón C57BL/6, conejo NZW…").

Validación: no avanzar sin selección válida en pasos requeridos. Paso 4 se puede saltar.

## Estructura de archivos

```text
src/
  features/
    onboarding/
      OnboardingWizard.tsx          // contenedor + navegación condicional
      steps/
        StepPurpose.tsx             // Paso 1
        StepSubtype.tsx             // Paso 2 (condicional)
        StepAnimalClass.tsx         // Paso 3
        StepSpecies.tsx             // Paso 4 (opcional)
        WorkspaceSummary.tsx        // Resumen + Confirmar
      hooks/
        useOnboardingState.ts       // estado, validación, persistencia
      lib/
        onboardingOptions.ts        // listas de opciones + placeholders
        types.ts                    // Purpose, Subtype, AnimalClass, WorkspaceDraft
  pages/
    Onboarding.tsx                  // wrapper de ruta
```

Nueva ruta en `src/App.tsx`: `/onboarding` (protegida por `ProtectedRoute`, lazy-loaded). No se modifica el resto del routing.

## Estado y persistencia

`useOnboardingState()` (Context + reducer, sin Zustand para no añadir dependencias):

- `currentStep: 1 | 2 | 3 | 4 | 'summary'`
- `purpose: Purpose[]` (array, soporta múltiples entornos en Paso 1)
- `subtype: Subtype | null` (null si solo `pet`)
- `animalClass: AnimalClass | null`
- `species: string` (opcional)
- Acciones: `setPurpose`, `addPurpose`, `setSubtype`, `setAnimalClass`, `setSpecies`, `next()`, `back()`, `reset()`.
- `next()` aplica el salto: si `purpose` contiene solo `pet`, brinca de Paso 1 a Paso 3.
- `back()` aplica el mismo salto inverso para no perder datos.
- Validación derivada: `canAdvance(step)` booleano.
- Persistencia ligera del progreso en `sessionStorage` (`biotrack_onboarding_progress`) para no perder selecciones al recargar.

Al confirmar en `WorkspaceSummary`:

```ts
const workspaceDraft = {
  purpose,           // Purpose[]
  subtype,           // Subtype | null
  animalClass,
  species: species || null,
  name: `Entorno ${new Date().toISOString()}`,
};
localStorage.setItem('biotrack_pending_workspace', JSON.stringify(workspaceDraft));
navigate('/dashboard');
```

## UI

- Tailwind + componentes existentes de `@/components/ui` (Button, Card, RadioGroup, Input, Label, Progress).
- Header con barra de progreso (`Progress`) calculada sobre los pasos efectivos (3 si solo `pet`, 4 en otros casos).
- Cada paso: título, subtítulo, grid de opciones como tarjetas seleccionables, botones "Atrás" / "Continuar".
- Paso 1 muestra siempre botón secundario "+ Añadir otro entorno" que agrega una entrada al array `purpose` sin avanzar.
- `WorkspaceSummary` lista propósito(s), subtipo, clase animal, especie y `name` generado, con botones "Editar" (vuelve al paso correspondiente) y "Confirmar y entrar al Dashboard".

## Restricciones respetadas

- Sin llamadas a Supabase, sin SQL, sin edge functions.
- Sin lógica de IA, planes ni facturación.
- Solo UI, estado local y `localStorage` / `sessionStorage`.

## Fuera de alcance (Prompt 2)

- Persistir `workspaceDraft` en la base de datos.
- Multi-tenancy real (`workspace_id` en queries, RLS).
- Migración de datos existentes al nuevo modelo de workspaces.
