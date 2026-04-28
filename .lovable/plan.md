## Mejoras: Clientes, Pedidos y precios por etapa

Voy a integrar el módulo que enviaste, **adaptado** a la arquitectura actual del proyecto (Lovable Cloud, multi-org con `organization_id` ligado a `organizations`, RLS por `get_user_org`, mismo estilo glass-card y `display-font`). No copio los archivos tal cual: corrijo cosas que romperían el sistema.

---

### 1. Base de datos (migración nueva)

Tres tablas nuevas con el mismo patrón de RLS que el resto del proyecto:

**`clientes`**
- `id`, `organization_id` (referencia a `organizations.id`, **no** a `auth.users` como traía el SQL subido — eso era un bug)
- `nombre`, `contacto_principal`, `email`, `telefono`
- `direccion`, `ciudad`, `estado`, `codigo_postal`, `pais` (default `'Mexico'`)
- `rfc`, `tipo_cliente` (general / laboratorio / centro_investigacion / veterinario)
- `estado_cliente` (activo / inactivo / bloqueado)
- `notas`, `created_at`, `updated_at`
- Único: `(organization_id, nombre)`

**`pedidos`**
- `id`, `organization_id`, `cliente_id` (FK con `ON DELETE CASCADE`)
- `numero_pedido`, `fecha_pedido`, `fecha_entrega_solicitada`, `fecha_entrega_realizada`
- `subtotal`, `porcentaje_descuento`, `monto_descuento`, `total` (numeric 10,2)
- `estado` (pendiente / confirmado / en_preparacion / listo / entregado / cancelado)
- `notas`, timestamps
- Único: `(organization_id, numero_pedido)`

**`pedidos_detalles`**
- `id`, `pedido_id` (FK CASCADE)
- `especie`, `etapa`, `cantidad`, `precio_unitario`
- `subtotal` columna **generada** `(cantidad * precio_unitario) STORED`
- timestamps

**RLS** en las 3 tablas: políticas SELECT/INSERT/UPDATE/DELETE por `organization_id = get_user_org(auth.uid())` (igual que `lotes`, `cajas`, etc.). Para `pedidos_detalles` el filtro va por subquery al pedido padre.

**Trigger** `touch_updated_at` reutilizado (ya existe en BD) en lugar de crear 3 funciones nuevas como traía el SQL del zip.

Índices en `organization_id`, `cliente_id`, `estado`, `fecha_pedido`, `pedido_id`.

---

### 2. `src/lib/etapas.ts` — añadir precios y descuentos

Extiendo el archivo actual **sin perder** lo que ya tiene:
- Añadir campo `precio: number` a cada etapa (con los valores que mandaste).
- Añadir helpers nuevos: `obtenerPrecio(especie, etapa)`, `calcularDescuento(subtotal)`, `calcularTotales(subtotal)`.

Tabla de descuentos por volumen (la que ya viene en tu archivo):
- ≥ $10,000 → 20%
- ≥ $5,000 → 15%
- ≥ $2,500 → 10%
- ≥ $600 → 5%

Esto NO toca `etapaActual`, `rangoDias`, `rangoPeso`, ni `ETAPAS` ya existentes — solo se añade la propiedad `precio` a cada entrada y las funciones nuevas.

---

### 3. Páginas nuevas

**`src/pages/Clientes.tsx`** — CRUD adaptado al estilo del proyecto:
- Header `display-font text-4xl`, botón `bg-gradient-primary shadow-glow`.
- Filtros: búsqueda + tipo + estado.
- Grid de tarjetas `glass-card` con badges de tipo/estado, contacto, email, teléfono, ciudad.
- Diálogo crear/editar con todos los campos.

**`src/pages/Pedidos.tsx`** — Pedidos con líneas de detalle y descuentos automáticos:
- Listado de pedidos con número, cliente, fecha, subtotal, descuento (si aplica) y total.
- Diálogo crear/editar:
  - Encabezado: número, cliente (select), fecha, estado, notas.
  - Sección "Productos": elegir especie → etapa (carga `precio` automáticamente desde `ETAPAS`) → cantidad → agregar línea.
  - Resumen en tiempo real con subtotal, descuento aplicado y total (usando `calcularTotales`).
- Diálogo de vista (solo lectura) con resumen.
- Auto-precio: al añadir una línea, el precio se toma de `obtenerPrecio()` (no se pide al usuario, se puede sobreescribir solo si lo necesitas — confirma si quieres permitirlo).

Ambas páginas usan `useAuth().profile.organization_id` para el insert.

---

### 4. Navegación

**`src/App.tsx`**: añadir rutas `/clientes` y `/pedidos` dentro del bloque protegido.

**`src/components/AppSidebar.tsx`**: añadir 2 entradas a `baseItems` con iconos `Users` (Clientes) y `ShoppingCart` (Pedidos), entre Lotes y Stock.

---

### Detalles técnicos / correcciones al material subido

- El SQL del zip referenciaba `auth.users(id)` para `organization_id` — **incorrecto** en este proyecto (rompería RLS multi-org). Usaré `organizations(id)`.
- El zip definía 3 funciones `update_timestamp_*` — uso la `touch_updated_at` que ya existe.
- El SQL del zip **no incluía RLS** — añado políticas `Org select/insert/update/delete` en las 3 tablas.
- El componente `Pedidos.tsx` usa `Especie` importado de `@/lib/etapas`, lo cual ya queda compatible al ampliar ese archivo.
- Los tipos generados de Supabase (`src/integrations/supabase/types.ts`) se regeneran solos tras la migración.

### Fuera de alcance (preguntar después)
- Descontar stock automáticamente al marcar un pedido como `entregado` (requiere lógica de qué lote consumir).
- Generar PDF/factura del pedido.
- Reportes de ventas por cliente o por etapa.

¿Procedo con todo o quieres ajustar algo (por ejemplo, permitir editar el precio unitario manualmente al crear una línea)?