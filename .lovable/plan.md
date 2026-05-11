
# Plan — Paso 4 Onboarding: especies precargadas

## Nota importante sobre la fuente de datos
En `src/lib/etapas.ts` el export real se llama **`ETAPAS`** (no `ETAPAS_POR_ESPECIE`), tipado como `Record<Especie, Etapa[]>` con `Especie = "ASF" | "Raton" | "Rata"`. Usaré ese export tal cual y mapearé los IDs internos del onboarding (`'asf' | 'raton' | 'rata'`) hacia esas claves.

Datos reales extraídos (etapa "Pinky" como precio base):
- ASF → 7 etapas, desde $15
- Ratón → 7 etapas, desde $16
- Rata → 13 etapas, desde $16

---

## 1. Nuevo archivo: `src/lib/species-config.ts`

- Importa `ETAPAS` y el tipo `Especie` desde `@/lib/etapas`.
- Exporta:
  - `PreloadedSpeciesId = 'asf' | 'raton' | 'rata'`
  - Mapa interno `PRELOADED_TO_ESPECIE: Record<PreloadedSpeciesId, Especie>` → `{ asf: 'ASF', raton: 'Raton', rata: 'Rata' }`
  - `PRELOADED_SPECIES: ReadonlyArray<{ id: PreloadedSpeciesId; displayName: string; fullName: string; etapas: number; precioBase: number }>` calculado dinámicamente desde `ETAPAS` (sin hardcodear cantidades ni precios).
  - Helpers: `isPreloadedSpeciesId(v): v is PreloadedSpeciesId` y `getPreloadedSpecies(id)`.

displayName / fullName:
- `asf` → "ASF" / "African Soft-furred Rat"
- `raton` → "Ratón" / "Ratón de laboratorio"
- `rata` → "Rata" / "Rata de laboratorio"

---

## 2. `src/features/onboarding/lib/types.ts`

- Importar `PreloadedSpeciesId`.
- `WorkspaceDraft.species: PreloadedSpeciesId | string | null` (string para texto custom).

---

## 3. `src/features/onboarding/hooks/useOnboardingState.tsx`

Estado local del paso 4:
- Reemplazar `species: string` por dos campos: `speciesChoice: PreloadedSpeciesId | 'custom' | null` y `customSpecies: string` (initial `null` y `""`).
- `setSpecies(value: PreloadedSpeciesId | 'custom', customText?: string)`:
  - Si `value !== 'custom'` → limpia `customSpecies` a `""` y guarda choice.
  - Si `value === 'custom'` → guarda choice y opcionalmente actualiza `customSpecies` con `customText`.
- Nuevo `setCustomSpeciesText(t: string)` para el input controlado.
- `buildDraft()`:
  ```
  species:
    speciesChoice === 'custom'
      ? (customSpecies.trim() || null)
      : speciesChoice ?? null
  ```
- Paso 4 sigue siendo opcional → `canAdvance` para step 4 permanece `true`.
- `reset()` limpia ambos campos.

---

## 4. `src/features/onboarding/steps/StepSpecies.tsx`

UI:
- 4 tarjetas seleccionables (grid responsive, mismo estilo `border-2`, hover, selected state que `StepPurpose` / `StepAnimalClass`):
  1. **ASF** — African Soft-furred Rat — `{etapas} etapas` · `Desde $XX`
  2. **Ratón** — Ratón de laboratorio — idem
  3. **Rata** — Rata de laboratorio — idem
  4. **📝 Otra especie personalizada**
- Datos vienen de `PRELOADED_SPECIES.map(...)`, sin hardcodeo.
- Si `speciesChoice === 'custom'`, renderizar debajo un `<Input>` controlado:
  - `placeholder` dinámico desde `SPECIES_PLACEHOLDER[animalClass]` (ya existente).
  - `value = customSpecies`, `onChange → setCustomSpeciesText`.
- Mantener mensaje de "Opcional" arriba.
- No tocar navegación Atrás/Continuar (ya gestionada por `OnboardingWizard`).

---

## Validación visual esperada
- 3 tarjetas con datos reales calculados desde `ETAPAS` + 1 tarjeta "Otra".
- Click en "Otra" muestra input con placeholder según clase animal.
- Click en una precargada oculta y limpia el input.
- Continuar funciona con o sin selección (opcional).
- `localStorage.biotrack_pending_workspace.species` es `'asf' | 'raton' | 'rata' | <texto custom> | null`.

## Fuera de alcance
- Conexión a DB (Prompt siguiente).
- Cambios en pasos 1–3 y resumen (el resumen ya muestra `species` como string, sigue funcionando).
