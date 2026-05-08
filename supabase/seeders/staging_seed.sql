-- Staging Seed Data
-- Purpose: Populate staging environment with realistic test data
-- Usage: psql $STAGING_DB_URL -f supabase/seeders/staging_seed.sql

-- =====================================================
-- WARNING: This script is for STAGING only!
-- Do NOT run on production database!
-- =====================================================

-- Clear existing seed data (if re-running)
DELETE FROM ai_activity_log WHERE user_id LIKE 'user_staging_%';
DELETE FROM telemetry_events WHERE user_id LIKE 'user_staging_%';
DELETE FROM cajas WHERE id LIKE 'caja_staging_%';
DELETE FROM lotes WHERE id LIKE 'lote_staging_%';
DELETE FROM users WHERE id LIKE 'user_staging_%' OR email LIKE '%@staging.local';
DELETE FROM organizations WHERE id LIKE 'org_staging_%';

-- =====================================================
-- Organizations
-- =====================================================
INSERT INTO organizations (id, name, slug, created_at) VALUES
  ('org_staging_001', 'Test Organization Alpha', 'test-alpha', NOW()),
  ('org_staging_002', 'Test Organization Beta', 'test-beta', NOW()),
  ('org_staging_003', 'Test Organization Gamma', 'test-gamma', NOW());

-- =====================================================
-- Users (with staging-specific emails)
-- =====================================================
INSERT INTO users (id, email, organization_id, role, created_at) VALUES
  ('user_staging_001', 'admin.alpha@staging.local', 'org_staging_001', 'admin', NOW()),
  ('user_staging_002', 'user.alpha@staging.local', 'org_staging_001', 'user', NOW()),
  ('user_staging_003', 'admin.beta@staging.local', 'org_staging_002', 'admin', NOW()),
  ('user_staging_004', 'user.beta@staging.local', 'org_staging_002', 'user', NOW()),
  ('user_staging_005', 'admin.gamma@staging.local', 'org_staging_003', 'admin', NOW());

-- =====================================================
-- Lotes (Batches)
-- =====================================================
INSERT INTO lotes (id, nombre, organizacion_id, estado, created_at) VALUES
  ('lote_staging_001', 'Lote Test A - Productos Electrónicos', 'org_staging_001', 'activo', NOW()),
  ('lote_staging_002', 'Lote Test B - Ropa y Textiles', 'org_staging_001', 'activo', NOW()),
  ('lote_staging_003', 'Lote Test C - Alimentos', 'org_staging_002', 'activo', NOW()),
  ('lote_staging_004', 'Lote Test D - Herramientas', 'org_staging_002', 'completado', NOW()),
  ('lote_staging_005', 'Lote Test E - Muebles', 'org_staging_003', 'activo', NOW());

-- =====================================================
-- Cajas (Boxes)
-- =====================================================
INSERT INTO cajas (id, nombre, lote_id, peso_kg, estado, created_at) VALUES
  ('caja_staging_001', 'Caja A-001', 'lote_staging_001', 5.5, 'pendiente', NOW()),
  ('caja_staging_002', 'Caja A-002', 'lote_staging_001', 3.2, 'en_proceso', NOW()),
  ('caja_staging_003', 'Caja A-003', 'lote_staging_001', 7.8, 'completado', NOW()),
  ('caja_staging_004', 'Caja B-001', 'lote_staging_002', 2.1, 'pendiente', NOW()),
  ('caja_staging_005', 'Caja B-002', 'lote_staging_002', 4.5, 'pendiente', NOW()),
  ('caja_staging_006', 'Caja C-001', 'lote_staging_003', 10.0, 'en_proceso', NOW()),
  ('caja_staging_007', 'Caja C-002', 'lote_staging_003', 8.5, 'completado', NOW()),
  ('caja_staging_008', 'Caja D-001', 'lote_staging_004', 6.3, 'completado', NOW()),
  ('caja_staging_009', 'Caja E-001', 'lote_staging_005', 15.2, 'pendiente', NOW()),
  ('caja_staging_010', 'Caja E-002', 'lote_staging_005', 12.7, 'en_proceso', NOW());

-- =====================================================
-- Telemetry Events (simulating AI and voice usage)
-- =====================================================
INSERT INTO telemetry_events (id, event_type, user_id, metadata, created_at) VALUES
  (gen_random_uuid(), 'ai_copilot_invoked', 'user_staging_001', '{"query": "¿Cuántas cajas tiene el lote A?", "response_time_ms": 245}', NOW() - INTERVAL '1 hour'),
  (gen_random_uuid(), 'ai_copilot_invoked', 'user_staging_002', '{"query": "Mostrar cajas pendientes", "response_time_ms": 189}', NOW() - INTERVAL '2 hour'),
  (gen_random_uuid(), 'voice_workflow_started', 'user_staging_003', '{"duration_ms": 5200, "transcription_confidence": 0.95}', NOW() - INTERVAL '3 hour'),
  (gen_random_uuid(), 'voice_workflow_completed', 'user_staging_003', '{"duration_ms": 5200, "commands_executed": 2}', NOW() - INTERVAL '3 hour'),
  (gen_random_uuid(), 'proactive_suggestion_shown', 'user_staging_004', '{"suggestion_type": "batch_complete", "accepted": true}', NOW() - INTERVAL '4 hour'),
  (gen_random_uuid(), 'proactive_suggestion_shown', 'user_staging_005', '{"suggestion_type": "anomaly_detected", "accepted": false}', NOW() - INTERVAL '5 hour'),
  (gen_random_uuid(), 'macro_executed', 'user_staging_001', '{"macro_name": "generate_report", "execution_time_ms": 1250}', NOW() - INTERVAL '6 hour'),
  (gen_random_uuid(), 'clarification_requested', 'user_staging_002', '{"original_query": "buscar caja", "clarification": "¿Qué lote?"}', NOW() - INTERVAL '7 hour');

-- =====================================================
-- AI Activity Log
-- =====================================================
INSERT INTO ai_activity_log (id, user_id, action, tokens_used, model, created_at) VALUES
  (gen_random_uuid(), 'user_staging_001', 'clarification_request', 150, 'gpt-4o-mini', NOW() - INTERVAL '1 hour'),
  (gen_random_uuid(), 'user_staging_002', 'data_query', 320, 'gpt-4o-mini', NOW() - INTERVAL '2 hour'),
  (gen_random_uuid(), 'user_staging_003', 'voice_transcription', 500, 'whisper-1', NOW() - INTERVAL '3 hour'),
  (gen_random_uuid(), 'user_staging_004', 'proactive_suggestion', 75, 'gpt-4o-mini', NOW() - INTERVAL '4 hour'),
  (gen_random_uuid(), 'user_staging_005', 'data_analysis', 450, 'gpt-4o-mini', NOW() - INTERVAL '5 hour'),
  (gen_random_uuid(), 'user_staging_001', 'macro_generation', 280, 'gpt-4o-mini', NOW() - INTERVAL '6 hour'),
  (gen_random_uuid(), 'user_staging_002', 'clarification_response', 120, 'gpt-4o-mini', NOW() - INTERVAL '7 hour');

-- =====================================================
-- Verification Queries (run after seeding)
-- =====================================================
-- SELECT COUNT(*) FROM organizations WHERE id LIKE 'org_staging_%';
-- SELECT COUNT(*) FROM users WHERE id LIKE 'user_staging_%';
-- SELECT COUNT(*) FROM lotes WHERE id LIKE 'lote_staging_%';
-- SELECT COUNT(*) FROM cajas WHERE id LIKE 'caja_staging_%';
-- SELECT COUNT(*) FROM telemetry_events WHERE user_id LIKE 'user_staging_%';
-- SELECT COUNT(*) FROM ai_activity_log WHERE user_id LIKE 'user_staging_%';

-- Expected counts:
-- Organizations: 3
-- Users: 5
-- Lotes: 5
-- Cajas: 10
-- Telemetry Events: 8
-- AI Activity: 7
