# Auditoría arquitectónica — BioTrack

Auditoría completa de la app sin modificar código. Foco en mantenibilidad, escalabilidad y readiness para producción.

---

## 1. Visión general

- **Stack**: React 18 + Vite + TS + Tailwind + shadcn/ui + React Query + Supabase (Lovable Cloud).
- **Tamaño**: ~8.7K LOC en `src/`, 17 páginas, 11 componentes propios + librería `ui/`, 4 hooks, 7 módulos `lib/`, 11 migraciones.
- **Modelo de datos**: 14 tablas con RLS multi-tenant vía `get_user_org(auth.uid())`. Bien aislado por organización.
- **Auth**: Single `AuthProvider` con `onAuthStateChange` + carga de profile/roles/org. Patrón correcto.

Veredicto general: **base sólida, pero con deuda técnica acumulada** típica de un MVP que creció rápido. Hay 3-4 focos críticos que conviene atacar antes de seguir agregando features.

---

## 2. Hallazgos por área

### 2.1 Estructura de carpetas
- Plana y razonable para el tamaño actual, pero empieza a quedarse corta.
- `components/` mezcla layout (`AppLayout`, `AppSidebar`), guards (`ProtectedRoute`, `PublicRoute`), tabs de feature (`GastosTab`, `MejoresClientesTab`), modales pesados (`AdministrarAlertasModal` 885 líneas) y primitivas `ui/`.
- No hay agrupación por dominio (lotes, alertas, ventas, gastos…).
- **Riesgo**: a medida que se sumen features la carpeta se vuelve ingobernable.

### 2.2 Routing
- Todo en `App.tsx` plano. Funciona, pero:
  - No hay **lazy loading** (`React.lazy` / `Suspense`). Cada página entra al bundle inicial → `Ventas.tsx` (624), `GastosTab` (699), `AdministrarAlertasModal` (885), `MasterPanel` (556), `LandingPage` (410), `Lotes` (436), `Pedidos` (501), `ClientePerfil` (486) cargan aunque el usuario nunca los visite.
  - No hay **error boundary** global ni a nivel ruta. Un throw rompe toda la app.
  - `ProtectedRoute` no chequea rol — `Admin` y `MasterPanel` se protegen con un `Navigate` interno (mejor centralizar en una `RoleRoute`).

### 2.3 Integración Supabase
- Cliente correcto (no se modifica `client.ts`).
- **Problema más serio**: 21 archivos importan `supabase` directamente y arman queries inline. No hay capa de acceso a datos.
  - Mismas queries duplicadas (lotes, cajas, clientes…) en 6+ archivos.
  - Tipos inferidos como `any` en muchos `.map((l: any) => …)` (ver §2.10).
  - Cambiar un `select` o agregar un filtro obliga a auditar todo el repo.
- **Query keys sin convención**: strings sueltos (`"lotes"`, `"lotes-dash"`, `"lotes-stock"`, `"lotes-min"`, `"lotes-options"`, `"lotes-proyeccion"`). Las invalidaciones son frágiles — `EventoDialog` invalida 5 keys a mano.
- No hay `staleTime` / `gcTime` configurados → refetch constante, costo de red alto.
- Sin manejo de paginación. Supabase corta a 1000 filas; en producción `lotes`, `pedidos`, `gastos` van a chocar contra ese límite silenciosamente.

### 2.4 Auth flow
- `useAuth` hace el trabajo correctamente (sesión, profile, roles, org).
- **Bug latente**: `loadProfile` setea `loading=false` solo en algunos paths (en el listener no). En el primer login post-redirect funciona por `getSession`, pero hay un edge case donde `loading` puede quedar `true`.
- No hay **refresh** de roles tras cambios admin (si te promueven, hay que recargar).
- `signOut` no invalida React Query cache → datos del usuario anterior pueden quedar visibles brevemente.
- No hay **sesión expirada** UX (el `friendlyError` lo cubre tarde).

### 2.5 Componentes reutilizables / duplicación
Patrones que aparecen 3+ veces y no están extraídos:
- **CRUD de modal con form + mutation + toast** (Lotes, Cajas, Líneas, Clientes, Pedidos, Gastos, Alertas custom). Misma estructura ~40-80 líneas cada vez.
- **Card de estadística** (`StatCard` está copiado en `Dashboard` como `function any` y en otras páginas inline).
- **Header de página** (título + descripción + acción derecha) duplicado en cada `pages/*`.
- **Filtros con `Select`** (estado, especie, tipo) — patrón repetido 5+ veces.
- **Confirm de borrado** — cada página llama `confirm()` nativo o re-arma `AlertDialog`.
- **Cálculos de etapa/edad** en `lib/etapas.ts` ✅ bien centralizados — es la excepción positiva.

### 2.6 Componentes grandes (deuda)
| Archivo | LOC | Problema |
|---|---|---|
| `AdministrarAlertasModal.tsx` | **885** | Mezcla 3 sub-features (sistema, custom CRUD, formulario condicional). Debería partirse en 4-5 archivos. |
| `GastosTab.tsx` | **699** | Lista + form + 3 charts + comparativa + recurrentes. Mezcla data + UI. |
| `Ventas.tsx` | **624** | Reportes financieros monolíticos. |
| `MasterPanel.tsx` | **556** | Panel super-admin sin separar acciones. |
| `Pedidos.tsx` | **501** | CRUD + detalle inline + cálculos. |
| `ClientePerfil.tsx` | **486** | Tabs + queries + render. |
| `Lotes.tsx` | **436** | CRUD + split + eventos. |
| `LandingPage.tsx` | **410** | Marketing en página única (aceptable). |

Regla: cualquier componente >300 LOC debería partirse.

### 2.7 State management
- Sólo React Query + `useState` local. **Bien**: no hay Redux/Zustand innecesario.
- **Mal**: estado de UI complejo (modales, formularios, filtros) vive en `useState` esparcidos. Algunos componentes tienen 8-10 `useState`.
- No hay `useReducer` ni custom hooks por feature (`useLotes`, `useGastos`…). Toda la lógica de fetching vive en el componente.

### 2.8 Loading & error handling
- **Casi inexistente**:
  - Sólo 13 archivos referencian `isLoading/isPending/isError`.
  - La mayoría usa `data: lotes = []` como fallback silencioso → la UI queda “vacía” en vez de mostrar skeleton.
  - No hay `ErrorBoundary` en ninguna parte.
  - Los `error` de queries se ignoran (sólo se muestran en mutations).
- `friendlyError` es una buena pieza, pero se aplica inconsistentemente.
- `ProtectedRoute` y `PublicRoute` tienen un splash bonito — buen patrón, no replicado en páginas internas.

### 2.9 Escalabilidad
- **Sin paginación** en listas de tablas con potencial alto volumen (`lotes`, `pedidos`, `gastos`, `lote_eventos`, `pedidos_detalles`).
- **Cálculos en cliente**: `Dashboard`, `Ventas`, `Stock`, `MejoresClientesTab` traen TODO y agregan en JS. Con un bioterio mediano (10K eventos/año) esto se rompe.
  - Solución: vistas materializadas o RPC (`create function get_dashboard_stats`).
- **Bundle inicial pesado** por falta de code-splitting.
- **Realtime** no usado — algunos flujos (alertas, pedidos colaborativos) lo agradecerían.
- **Edge functions**: ninguna creada todavía → toda la lógica de negocio está en cliente (incluyendo evaluación de alertas, cálculos de stock). Riesgo de inconsistencias entre clientes y de exponer lógica.

### 2.10 Calidad de tipado TS
- `tsconfig` tiene `strictNullChecks: false`, `noImplicitAny: false`, `noUnusedLocals: false`. **Esencialmente TS en modo laxo.**
- Conteo de `any`: 14 en `AdministrarAlertasModal`, 12 en `Lotes`, 11 en `GastosTab`, 10 en `Dashboard`, 10 en `alertasPersonalizadas`, etc. Total ~140+ `any` en código de producto.
- Interfaces de entidades **redefinidas a mano en cada página** (`interface Lote {…}` en `Lotes.tsx`, `Dashboard` usa `any`). Existe `integrations/supabase/types.ts` autogenerado pero no se usa.
- `StatCard({…}: any)` en Dashboard — pierde toda la ayuda del IDE.
- `as any` para filtrar enums (`q.eq("estado", filterEstado as any)`).

### 2.11 Seguridad / RLS
- RLS bien planteada (multi-tenant por `organization_id`, roles vía `has_role`).
- `org-logos` bucket público con write restringido a admin de la org — correcto.
- Falta validación server-side de límites de plan (un cliente malicioso podría insertar más lotes que su plan permite). Hoy se chequea sólo en UI con `usePlan`.

### 2.12 Otros detalles
- `App.tsx` instancia `QueryClient` sin opciones (no `defaultOptions.queries.staleTime`).
- `tailwind.config.lov.json` huérfano en `src/` — revisar si es residuo.
- `src/test/` con un solo `example.test.ts` — no hay tests reales.
- `console.log` casi limpio (1 en `NotFound`) — bien.
- No hay analytics ni monitoreo de errores (Sentry/PostHog).
- `index.html` sin meta SEO ni OG tags más allá del default Lovable.

---

## 3. Riesgos por severidad

**Alta** (bloquean producción seria)
1. Falta de paginación + agregaciones en cliente → la app se cae con datos reales.
2. Sin `ErrorBoundary` + manejo inconsistente de loading/error → un fallo de red rompe la pantalla.
3. Tipado laxo + `any` masivo → bugs silenciosos al refactorizar.
4. Lógica de negocio sólo en cliente (alertas, límites de plan) → bypasseable y duplicable.

**Media** (frenan velocidad de desarrollo)
5. Componentes >500 LOC y duplicación de patrones CRUD.
6. Sin capa de acceso a datos (queries inline esparcidas).
7. Query keys sin convención → invalidaciones frágiles.
8. Sin lazy loading → bundle inicial grande.

**Baja** (pulido)
9. `signOut` no limpia React Query cache.
10. `tailwind.config.lov.json` posible residuo.
11. Falta SEO/OG y monitoreo.

---

## 4. Roadmap recomendado (priorizado)

### Fase 1 — Fundación (1-2 sesiones, alto ROI, bajo riesgo)
1. **Activar TS estricto progresivo**: `strictNullChecks: true`, `noImplicitAny: true`. Arreglar fallos por archivo.
2. **Reemplazar interfaces locales** por tipos de `Database["public"]["Tables"]["lotes"]["Row"]` desde `supabase/types.ts`.
3. **`ErrorBoundary` global** en `App.tsx` + uno por ruta principal.
4. **Configurar `QueryClient` defaults** (`staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: false`).
5. **Lazy load** de todas las páginas no-críticas con `React.lazy` + `Suspense`.

### Fase 2 — Capa de datos (2-3 sesiones)
6. Crear `src/data/` con módulos por entidad: `lotes.ts`, `cajas.ts`, `gastos.ts`, etc. Exponer funciones tipadas (`getLotes`, `createLote`) y **query key factories** (`lotesKeys.list(filters)`).
7. Reemplazar imports directos de `supabase` en páginas por estos módulos.
8. Crear hooks por feature: `useLotes`, `useGastos`, `useAlertas` que envuelvan React Query con keys consistentes.

### Fase 3 — Componentes y dominio (3-4 sesiones)
9. Reorganizar `components/` por dominio: `components/lotes/`, `components/alertas/`, `components/gastos/`, `components/common/`, `components/layout/`.
10. Extraer primitivas reutilizables: `<PageHeader>`, `<StatCard>`, `<DataTableToolbar>`, `<ConfirmDialog>`, `<EntityFormDialog>`.
11. Partir los monstruos: `AdministrarAlertasModal` → 4 archivos, `GastosTab` → lista + form + analytics, `Ventas` → tabs.

### Fase 4 — Backend & escalabilidad (2-3 sesiones)
12. Crear **edge functions** para: evaluación de alertas (cron), enforcement de límites de plan, agregaciones de Dashboard/Ventas (RPCs).
13. Agregar **paginación** server-side en listas grandes.
14. **Validación server-side de plan** vía trigger o RPC.
15. Considerar **Realtime** en alertas y pedidos.

### Fase 5 — Producción (1-2 sesiones)
16. Sentry o equivalente para errores.
17. Skeleton loaders consistentes.
18. Tests críticos (auth, RLS, cálculos de stock) con Vitest.
19. SEO/OG en `index.html`.
20. `signOut` que limpie `queryClient.clear()`.

---

## 5. Qué atacar primero

Si tuvieras tiempo para **una sola sesión**, mi recomendación:

> **Fase 1 completa + arrancar query key factories de Fase 2**.
>
> Razón: desbloquea todas las refactorizaciones siguientes con el menor riesgo, da type-safety inmediata y mejora UX (errores + bundle) sin tocar features.

Si quieres que continúe con propuesta concreta de implementación de cualquiera de las fases, dímelo y armo plan de ejecución detallado para esa fase.
