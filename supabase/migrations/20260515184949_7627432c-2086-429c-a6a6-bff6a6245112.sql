-- 1. Snapshots on lote_eventos for historical preservation
ALTER TABLE public.lote_eventos
  ADD COLUMN IF NOT EXISTS species_profile_id_snapshot uuid,
  ADD COLUMN IF NOT EXISTS species_code_snapshot text,
  ADD COLUMN IF NOT EXISTS species_display_name_snapshot text;

-- 2. Snapshots on pedidos_detalles; drop legacy `especie` text column
ALTER TABLE public.pedidos_detalles
  ADD COLUMN IF NOT EXISTS species_profile_id_snapshot uuid,
  ADD COLUMN IF NOT EXISTS species_display_name_snapshot text;

ALTER TABLE public.pedidos_detalles DROP COLUMN IF EXISTS especie;

-- 3. Drop deprecated legacy text species column on workspaces
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS species;

-- 4. Taxonomy key alias on workspace_species_profiles for cross-workspace taxonomy aggregation
-- `code` is the workspace-scoped operational identifier; `taxonomy_key` is the canonical taxonomy reference.
-- We expose a stable lower-cased generated column to support analytics aggregations.
ALTER TABLE public.workspace_species_profiles
  ADD COLUMN IF NOT EXISTS taxonomy_key text
  GENERATED ALWAYS AS (lower(code)) STORED;

CREATE INDEX IF NOT EXISTS idx_wsp_taxonomy_key
  ON public.workspace_species_profiles (taxonomy_key);

-- 5. Index lote_eventos.species_profile_id_snapshot for historical queries
CREATE INDEX IF NOT EXISTS idx_lote_eventos_species_profile_id_snapshot
  ON public.lote_eventos (species_profile_id_snapshot);

CREATE INDEX IF NOT EXISTS idx_pedidos_detalles_species_profile_id_snapshot
  ON public.pedidos_detalles (species_profile_id_snapshot);