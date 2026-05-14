-- Migration: Inventory Reservations Table
--
-- Reservations claim inventory WITHOUT mutating source lots.
-- Availability = derived stock - SUM(active reservations).
--
-- CRITICAL:
-- - Reservations do NOT change lot.cantidad_actual
-- - Historical lot quantities remain immutable
-- - Only status transitions are allowed (active → fulfilled/cancelled/expired)

-- ============================================================================
-- 1. INVENTORY RESERVATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- What is reserved
  species_profile_id UUID NOT NULL REFERENCES public.workspace_species_profiles(id) ON DELETE CASCADE,
  size_class_id      UUID NOT NULL REFERENCES public.species_size_classes(id) ON DELETE RESTRICT,
  quantity           INTEGER NOT NULL CHECK (quantity > 0),

  -- Who reserved it
  customer_id        UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  customer_name      VARCHAR(255),
  order_id           UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,

  -- Lifecycle
  status             VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
  
  -- Partial fulfillment tracking (immutable once set — tracked by append)
  fulfilled_quantity INTEGER NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0),
  remaining_quantity INTEGER NOT NULL CHECK (remaining_quantity >= 0),

  -- Temporal
  expires_at         TIMESTAMPTZ,
  fulfilled_at       TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,

  -- Metadata
  notes              TEXT,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_workspace 
  ON public.inventory_reservations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_species_size 
  ON public.inventory_reservations(workspace_id, species_profile_id, size_class_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status 
  ON public.inventory_reservations(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order 
  ON public.inventory_reservations(order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_customer
  ON public.inventory_reservations(customer_id)
  WHERE customer_id IS NOT NULL;

-- updated_at auto-update trigger
CREATE OR REPLACE FUNCTION public.update_inventory_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_reservations_updated_at ON public.inventory_reservations;
CREATE TRIGGER trg_inventory_reservations_updated_at
  BEFORE UPDATE ON public.inventory_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_reservations_updated_at();

-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

-- Users can only see reservations within their workspace
CREATE POLICY "inventory_reservations_workspace_isolation"
  ON public.inventory_reservations
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 3. INVENTORY MOVEMENT HISTORY TABLE
-- ============================================================================

-- Immutable audit log. NEVER delete or update rows.
CREATE TABLE IF NOT EXISTS public.inventory_movement_history (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL,

  movement_type        VARCHAR(50) NOT NULL,
  occurred_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- References
  species_profile_id   UUID,
  size_class_id        UUID,
  lot_id               UUID,
  reservation_id       UUID,

  -- Quantities
  quantity_before      INTEGER,
  quantity_after       INTEGER,
  quantity_delta       INTEGER GENERATED ALWAYS AS (
    CASE WHEN quantity_before IS NOT NULL AND quantity_after IS NOT NULL
         THEN quantity_after - quantity_before
         ELSE NULL
    END
  ) STORED,

  -- Human-readable summary (denormalized for query performance)
  summary              TEXT NOT NULL,
  species_name         VARCHAR(100),
  size_class_name      VARCHAR(100),

  -- Actor
  actor_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Prevent any modifications after insertion
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No UPDATE or DELETE allowed — history is immutable
CREATE POLICY "inventory_movement_history_read_only_after_insert"
  ON public.inventory_movement_history
  FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "inventory_movement_history_insert_only"
  ON public.inventory_movement_history
  FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
  ));

ALTER TABLE public.inventory_movement_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_inventory_movement_workspace 
  ON public.inventory_movement_history(workspace_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movement_lot 
  ON public.inventory_movement_history(lot_id)
  WHERE lot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movement_reservation 
  ON public.inventory_movement_history(reservation_id)
  WHERE reservation_id IS NOT NULL;
