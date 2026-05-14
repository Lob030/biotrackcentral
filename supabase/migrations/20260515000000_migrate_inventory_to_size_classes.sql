-- Migration: Add size_class_id to Lots and migrate from hardcoded Etapas
-- 
-- CRITICAL PRINCIPLES:
-- - Inventory systems must use sizeClassId references instead of hardcoded strings
-- - No cross-domain contamination

-- ============================================================================
-- 1. ADD COLUMN TO LOTS
-- ============================================================================

-- Add size_class_id to public.lots
ALTER TABLE public.lots
  ADD COLUMN size_class_id UUID REFERENCES public.species_size_classes(id) ON DELETE SET NULL;

CREATE INDEX idx_lots_size_class ON public.lots(size_class_id);

-- Add size_class_id to public.current_lot_state
ALTER TABLE public.current_lot_state
  ADD COLUMN size_class_id UUID REFERENCES public.species_size_classes(id) ON DELETE SET NULL,
  ADD COLUMN size_class_name VARCHAR(100);

CREATE INDEX idx_current_lot_state_size_class ON public.current_lot_state(size_class_id);

-- ============================================================================
-- 2. CREATE DEFAULT WORKSPACE SPECIES PROFILES
-- ============================================================================
-- This script safely injects the standard ASF/Rat/Mouse blueprints for existing
-- workspaces so that legacy inventory data has something to link to.

DO $$
DECLARE
  ws RECORD;
  profile_asf UUID;
  profile_mouse UUID;
  profile_rat UUID;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces WHERE is_active = true
  LOOP
    -- 1. Create ASF Profile if missing
    IF NOT EXISTS (SELECT 1 FROM public.workspace_species_profiles WHERE workspace_id = ws.id AND species_id = 'asf') THEN
      INSERT INTO public.workspace_species_profiles (workspace_id, species_id, species_name, operational_name, is_starter_blueprint, is_custom)
      VALUES (ws.id, 'asf', 'ASF', 'ASF', true, false) RETURNING id INTO profile_asf;

      -- Add size classes for ASF
      INSERT INTO public.species_size_classes (workspace_id, species_profile_id, name, min_weight_grams, max_weight_grams, min_age_days, max_age_days, sale_price, display_order, is_active, is_default, is_custom)
      VALUES 
        (ws.id, profile_asf, 'Pinky', 1, 3, 0, 6, 15.0, 1, true, false, false),
        (ws.id, profile_asf, 'Fuzzy', 3, 7, 7, 14, 18.0, 2, true, false, false),
        (ws.id, profile_asf, 'Hopper', 7, 15, 15, 21, 23.0, 3, true, false, false),
        (ws.id, profile_asf, 'Destetada', 15, 25, 22, 35, 30.0, 4, true, false, false),
        (ws.id, profile_asf, 'Chico', 25, 40, 36, 50, 33.0, 5, true, false, false),
        (ws.id, profile_asf, 'Mediano', 40, 60, 51, 70, 37.0, 6, true, false, false),
        (ws.id, profile_asf, 'Grande', 60, NULL, 71, NULL, 42.0, 7, true, true, false);
        
      -- Add operational settings
      INSERT INTO public.species_operational_settings (workspace_id, species_profile_id, breeding_cycle_days, expected_weaning_age_days, expected_gestation_days, maturity_age_days)
      VALUES (ws.id, profile_asf, 4, 21, 23, 42);
    END IF;

    -- 2. Create Mouse Profile if missing
    IF NOT EXISTS (SELECT 1 FROM public.workspace_species_profiles WHERE workspace_id = ws.id AND species_id = 'mouse') THEN
      INSERT INTO public.workspace_species_profiles (workspace_id, species_id, species_name, operational_name, is_starter_blueprint, is_custom)
      VALUES (ws.id, 'mouse', 'Ratón', 'Ratón', true, false) RETURNING id INTO profile_mouse;

      -- Add size classes for Mouse
      INSERT INTO public.species_size_classes (workspace_id, species_profile_id, name, min_weight_grams, max_weight_grams, min_age_days, max_age_days, sale_price, display_order, is_active, is_default, is_custom)
      VALUES 
        (ws.id, profile_mouse, 'Pinky', 1, 3, 0, 6, 16.0, 1, true, false, false),
        (ws.id, profile_mouse, 'Fuzzy', 3, 8, 7, 14, 19.0, 2, true, false, false),
        (ws.id, profile_mouse, 'Hopper', 8, 16, 15, 21, 26.0, 3, true, false, false),
        (ws.id, profile_mouse, 'Destetada', 16, 22, 22, 34, 30.0, 4, true, false, false),
        (ws.id, profile_mouse, 'Chico', 22, 30, 35, 50, 33.0, 5, true, false, false),
        (ws.id, profile_mouse, 'Mediano', 30, 45, 51, 70, 38.0, 6, true, false, false),
        (ws.id, profile_mouse, 'Grande', 45, NULL, 71, NULL, 43.0, 7, true, true, false);
        
      INSERT INTO public.species_operational_settings (workspace_id, species_profile_id, breeding_cycle_days, expected_weaning_age_days, expected_gestation_days, maturity_age_days)
      VALUES (ws.id, profile_mouse, 4, 21, 21, 42);
    END IF;

    -- 3. Create Rat Profile if missing
    IF NOT EXISTS (SELECT 1 FROM public.workspace_species_profiles WHERE workspace_id = ws.id AND species_id = 'rat') THEN
      INSERT INTO public.workspace_species_profiles (workspace_id, species_id, species_name, operational_name, is_starter_blueprint, is_custom)
      VALUES (ws.id, 'rat', 'Rata', 'Rata', true, false) RETURNING id INTO profile_rat;

      -- Add size classes for Rat
      INSERT INTO public.species_size_classes (workspace_id, species_profile_id, name, min_weight_grams, max_weight_grams, min_age_days, max_age_days, sale_price, display_order, is_active, is_default, is_custom)
      VALUES 
        (ws.id, profile_rat, 'Pinky', 0, 16, 0, 5, 16.0, 1, true, false, false),
        (ws.id, profile_rat, 'Fuzzy', 16, 30, 6, 9, 18.0, 2, true, false, false),
        (ws.id, profile_rat, 'Hopper', 31, 50, 10, 18, 23.0, 3, true, false, false),
        (ws.id, profile_rat, 'Destetada', 51, 70, 19, 26, 30.0, 4, true, false, false),
        (ws.id, profile_rat, 'Chico', 71, 90, 27, 30, 33.0, 5, true, false, false),
        (ws.id, profile_rat, 'Mediano', 91, 120, 31, 36, 37.0, 6, true, false, false),
        (ws.id, profile_rat, 'Grande', 121, 150, 37, 42, 40.0, 7, true, true, false),
        (ws.id, profile_rat, 'Extra Grande', 151, 200, 43, 48, 50.0, 8, true, false, false),
        (ws.id, profile_rat, 'Jumbo', 201, 250, 49, 54, 55.0, 9, true, false, false),
        (ws.id, profile_rat, 'Extra Jumbo', 251, 300, 55, 64, 60.0, 10, true, false, false),
        (ws.id, profile_rat, 'Mega', 301, 349, 65, 74, 65.0, 11, true, false, false),
        (ws.id, profile_rat, 'Extra Mega', 350, 400, 75, 99, 75.0, 12, true, false, false),
        (ws.id, profile_rat, 'Ratota', 401, NULL, 100, NULL, 80.0, 13, true, false, false);
        
      INSERT INTO public.species_operational_settings (workspace_id, species_profile_id, breeding_cycle_days, expected_weaning_age_days, expected_gestation_days, maturity_age_days)
      VALUES (ws.id, profile_rat, 4, 21, 23, 50);
    END IF;

  END LOOP;
END $$;

-- ============================================================================
-- 3. LINK EXISTING LOTS TO NEW SIZE CLASSES
-- ============================================================================

DO $$
DECLARE
  lot_row RECORD;
  resolved_species_id TEXT;
  profile_id UUID;
  sc_id UUID;
  sc_name VARCHAR(100);
  age_days INTEGER;
BEGIN
  FOR lot_row IN SELECT * FROM public.lots WHERE is_archived = false
  LOOP
    -- Normalize species ID from legacy 'Raton' / 'Rata' to 'mouse' / 'rat'
    IF lower(lot_row.species_id) = 'raton' OR lower(lot_row.species_id) = 'ratón' OR lower(lot_row.species_id) = 'mouse' THEN
      resolved_species_id := 'mouse';
    ELSIF lower(lot_row.species_id) = 'rata' OR lower(lot_row.species_id) = 'rat' THEN
      resolved_species_id := 'rat';
    ELSIF lower(lot_row.species_id) = 'asf' THEN
      resolved_species_id := 'asf';
    ELSE
      -- Fallback
      resolved_species_id := lower(lot_row.species_id);
    END IF;

    -- Find matching species profile
    SELECT id INTO profile_id 
    FROM public.workspace_species_profiles 
    WHERE workspace_id = lot_row.workspace_id AND species_id = resolved_species_id
    LIMIT 1;

    IF profile_id IS NOT NULL THEN
      -- Calculate age
      IF lot_row.birth_date IS NOT NULL THEN
        age_days := extract(day from now() - lot_row.birth_date)::INTEGER;
      ELSE
        age_days := 999; -- Adult default if unknown
      END IF;

      -- Find matching size class by age
      SELECT id, name INTO sc_id, sc_name 
      FROM public.species_size_classes 
      WHERE workspace_id = lot_row.workspace_id 
        AND species_profile_id = profile_id
        AND age_days >= min_age_days 
        AND (age_days <= max_age_days OR max_age_days IS NULL)
      ORDER BY min_age_days DESC
      LIMIT 1;

      -- Fallback to default
      IF sc_id IS NULL THEN
        SELECT id, name INTO sc_id, sc_name 
        FROM public.species_size_classes 
        WHERE workspace_id = lot_row.workspace_id 
          AND species_profile_id = profile_id
          AND is_default = true
        LIMIT 1;
      END IF;

      -- Update the tables
      IF sc_id IS NOT NULL THEN
        UPDATE public.lots SET size_class_id = sc_id WHERE id = lot_row.id;
        UPDATE public.current_lot_state SET size_class_id = sc_id, size_class_name = sc_name WHERE lot_id = lot_row.id;
      END IF;
    END IF;
  END LOOP;
END $$;
