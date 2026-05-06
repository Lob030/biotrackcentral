## Objetivo

Permitir a los administradores de cada organización subir un logo personalizado de su bioterio, que se muestre en el sidebar (reemplazando el ícono `FlaskConical` por defecto).

## Cambios propuestos

### 1. Backend (migración SQL)

- **Agregar columna** `logo_url TEXT` a `public.organizations` (nullable).
- **Crear bucket público** `org-logos` en Storage.
- **Políticas RLS** sobre `storage.objects` para el bucket `org-logos`:
  - SELECT público (cualquiera puede ver logos).
  - INSERT/UPDATE/DELETE solo por `admin` o `super_admin` de la organización dueña, validando que el `name` del archivo empiece con el `organization_id` del usuario (carpeta = org id).

Estructura de archivos: `org-logos/{organization_id}/logo.{ext}`.

### 2. Hook `useAuth`

- Añadir `logo_url` al tipo `OrganizationInfo` y a los dos `select` de `organizations`.

### 3. Sidebar (`AppSidebar.tsx`)

- Si `organization.logo_url` existe, mostrar `<img>` (objeto cubriendo el cuadro 40x40 redondeado) en lugar de `FlaskConical`.
- Mantener el ícono por defecto cuando no haya logo.

### 4. Página de Administración (`Admin.tsx`)

- Nueva sección "Identidad del bioterio" con:
  - Vista previa del logo actual (o placeholder).
  - Input file (acepta `image/png, image/jpeg, image/webp, image/svg+xml`, máx ~2MB).
  - Botón "Subir logo": sube a `org-logos/{org_id}/logo.{ext}` (con `upsert: true`), obtiene URL pública y guarda en `organizations.logo_url`.
  - Botón "Quitar logo": elimina el archivo del bucket y pone `logo_url = null`.
  - Tras cambios, llamar `refreshOrganization()` para refrescar el sidebar al instante.

Solo visible para `admin` (la página ya está restringida).

### 5. UX

- Validación de tamaño y tipo de archivo en cliente antes de subir.
- Toasts de éxito/error con `friendlyError`.
- Estado de carga en el botón mientras se sube.

## Notas técnicas

- Bucket público para que `<img src=...>` funcione sin firmar URLs.
- Se usa `cache-busting` añadiendo `?v={timestamp}` a la URL guardada para evitar caché tras reemplazo.
- No se modifica `LandingPage` ni `Auth` (logo es interno por ahora; si más adelante se quiere mostrar en login, basta con consultar la org por subdominio o similar).