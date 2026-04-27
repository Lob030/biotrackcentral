## Rediseñar página de Stock por tamaño

Combinar la tabla detallada de las imágenes (etapas con días y peso por especie) con el estilo actual (% y conteo de lotes, glass-card, gradiente primario).

### 1. Ampliar el catálogo de etapas en `src/lib/etapas.ts`

Reemplazar las etapas actuales por las que aparecen en las imágenes, añadiendo `pesoMin` y `pesoMax` (en gramos):

**ASF** (7 etapas): Pinky 0–6d / 1–3g · Fuzzy 7–14d / 3–7g · Hopper 15–21d / 7–15g · Destetada 22–35d / 15–25g · Chico 36–50d / 25–40g · Mediano 51–70d / 40–60g · Grande 71+d / 60+g

**Ratón** (7 etapas): Pinky 0–6d / 1–3g · Fuzzy 7–14d / 3–8g · Hopper 15–21d / 8–16g · Destetada 22–35d / 16–22g · Chico 35–50d / 22–30g · Mediano 51–70d / 30–45g · Grande 71+d / 45+g

**Rata** (11 etapas): Pinky 0–6d / 0–16g · Fuzzy 6–10d / 16–30g · Hopper 10–19d / 31–50g · Destetada 19–27d / 51–70g · Chico 27–31d / 71–90g · Mediano 31–37d / 91–120g · Grande 37–43d / 121–150g · Extra Grande 43–49d / 151–200g · Jumbo 49–55d / 201–250g · Extra Jumbo 55–65d / 251–300g · Mega 65–75d / 301–349g · Extra Mega 75–100d / 350–400g · Ratota 100+d / 401+g

Marcar la fila Destetada con flag `etiqueta: "Destete"` para mostrar el sub-label visto en las imágenes.

`etapaActual()` se mantiene igual, ya que sigue funcionando con el rango días.

### 2. Rediseñar `src/pages/Stock.tsx`

Layout en **3 columnas** (responsive: 1 col móvil, 2 col tablet, 3 col desktop), una tarjeta `glass-card` por especie con tabla interna:

```text
┌─────────────────────────────┐
│ 🧪 ASF                      │
│    38 individuos en total   │
├─────────────────────────────┤
│ Etapa     Días    Peso  Stock│
│ • Pinky   0–6d    1–3   [12]│
│ • Fuzzy   7–14d   3–7    —  │
│ • Destetada 22–35d 15–25 [12]│
│   Destete (sub-label cyan)  │
│ ...                         │
└─────────────────────────────┘
```

Detalles de estilo (mantenidos del diseño actual):
- Stock con valor: badge redondeado bg-primary/10 text-primary (mismo color que el % actual)
- Stock vacío: guion `—` muted
- Punto de color a la izquierda de cada etapa (cyan tenue si vacío, brillante si tiene stock)
- Fila Destetada destacada con sub-label "Destete" en color accent

Header de la página:
- Título "Stock de individuos"
- Subtítulo: "Calculado automáticamente · {totalGlobal} individuos en inventario · Actualizado {hora}"
- **Botón "Actualizar"** arriba derecha (ícono RefreshCw) que llama `queryClient.invalidateQueries(['lotes-stock'])` y refresca la marca de tiempo
- **Banner informativo** (estilo glass con borde primary): "ℹ Stock calculado en tiempo real basado en lotes activos de tipo Nacimiento y Engorda. La etapa/tamaño se asigna automáticamente según la edad de cada lote desde su fecha de nacimiento."

### 3. Filtro por tipo de lote (aplicar la fórmula real)

Filtrar la query a lotes con `estado='activo'` y `tipo IN ('nacimiento','engorda')` para que coincida con lo que dice el banner. El cálculo de etapa sigue usando `etapaActual(especie, fecha_nacimiento)`.

Estado vacío por especie: mensaje "Sin lotes activos de nacimiento o engorda para {especie}" centrado dentro de la tarjeta (como en la imagen de Ratón).

### Archivos a modificar
- `src/lib/etapas.ts` — nuevas etapas con peso
- `src/pages/Stock.tsx` — rediseño completo con tabla, botón Actualizar y banner

### Fuera de alcance
- Tabs Todas / ASF / Ratón / Rata y Todas / Engorda / Reproductores que aparecen en la imagen (se pueden añadir después si los pides)
- Edición de pesos por usuario
