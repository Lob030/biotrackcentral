## Siguientes pasos del plan inicial

Ya están listos: Cloud + auth (email + Google), Líneas Genéticas, Cajas, Lotes (con división), Stock por tamaño y Alertas. Lo que sigue del alcance original son tres bloques: **administración de la organización/usuarios**, **eventos de lote** (registrar bajas, ventas, traslados) y un **historial/timeline** por lote.

---

### 1. Administración de organización y usuarios

Nueva página `/admin` (visible solo para `role = 'admin'`):

- **Datos de la organización**: editar `organizations.nombre`.
- **Miembros**: listar perfiles del org con su rol (`admin` / `user`), permitir cambiar rol y enviar invitaciones por correo (signup link).
- Enlace en el sidebar visible solo para admin.

Sin cambios de schema, ya existen `organizations`, `profiles`, `user_roles` con sus RLS.

### 2. Eventos de lote (movimientos)

Nueva tabla `lote_eventos` para registrar lo que le pasa a un lote sin perder trazabilidad:

```text
lote_eventos
  id, organization_id, lote_id,
  tipo: 'mortalidad' | 'venta' | 'traslado_caja' | 'ajuste' | 'separacion_sexo' | 'nota'
  fecha, cantidad (int, puede ser 0 para nota/traslado),
  caja_destino_id (nullable, solo para traslado),
  precio_unitario (nullable, solo para venta),
  notas, created_by, created_at
```

- Trigger en BD que actualiza `lotes.cantidad_actual` automáticamente al insertar evento (resta en mortalidad/venta, suma en ajuste positivo).
- RLS por `organization_id`.

En la página `Lotes`, añadir en cada fila botones rápidos: **Mortalidad**, **Venta**, **Trasladar caja**. Cada uno abre un diálogo pequeño que crea el evento.

### 3. Historial / timeline del lote

Vista de detalle por lote (`/lotes/:id`) con:

- Datos del lote (especie, línea, caja, etapa actual, días).
- Línea de tiempo vertical con todos los eventos ordenados por fecha (íconos diferenciados por tipo).
- Resumen acumulado: bajas totales, ventas (cantidad y monto si hay precio), traslados.

Acceso desde la lista de lotes haciendo clic en el código.

---

### Archivos a crear/modificar

- `supabase/migrations/...sql` — tabla `lote_eventos`, enum `lote_evento_tipo`, trigger de actualización de `cantidad_actual`, RLS.
- `src/pages/Admin.tsx` — gestión de org y miembros.
- `src/pages/LoteDetalle.tsx` — vista detalle + timeline.
- `src/components/EventoDialog.tsx` — diálogo reutilizable para registrar mortalidad/venta/traslado.
- `src/pages/Lotes.tsx` — botones de evento en cada fila + link al detalle.
- `src/components/AppSidebar.tsx` — entrada "Administración" condicionada a admin.
- `src/App.tsx` — rutas nuevas.

### Fuera de alcance (para después)

- Reportes/exportar PDF o Excel.
- Gráficas históricas (mortalidad por mes, ventas).
- Notificaciones por correo de alertas.

¿Procedo con los tres bloques o prefieres empezar solo por uno (por ejemplo, eventos de lote primero)?