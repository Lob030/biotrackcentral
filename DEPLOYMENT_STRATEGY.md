# DEPLOYMENT_STRATEGY.md

## Deployment Strategy & Operational Readiness

### 1. Environment Separation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Local   │───▶│ Staging  │───▶│Production│              │
│  │ (dev)    │    │ (test)   │    │ (live)   │              │
│  └──────────┘    └──────────┘    └──────────┘              │
│       │               │               │                     │
│       ▼               ▼               ▼                     │
│  Supabase        Supabase        Supabase                  │
│  Local           Staging         Production                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Supabase Project Isolation

Each environment requires a **completely separate** Supabase project:

| Environment | Project ID | Purpose | Access |
|-------------|-----------|---------|--------|
| Local | `your-local-project` | Individual dev | Developer only |
| Staging | `your-staging-project` | Integration testing | Team + QA |
| Production | `your-production-project` | Live users | Restricted |

**Critical**: Each project must have:
- Separate database instance
- Independent authentication providers
- Isolated storage buckets
- Unique API keys (anon + service role)
- Dedicated webhook endpoints

### 3. Migration Workflow

#### Standard Migration Flow

```
1. Create migration on feature branch
   └─> npx supabase migration new <name>

2. Test migration locally
   └─> npm run migrate:check

3. Merge to main → Auto-deploy to staging
   └─> npm run migrate:staging

4. Validate on staging (see checklist below)
   └─> Run operational tests

5. Deploy to production (manual approval required)
   └─> npm run migrate:production
```

#### Migration Safety Rules

⚠️ **NEVER** run untested migrations directly on production

✅ **ALWAYS**:
- Test migrations on local first
- Deploy to staging before production
- Verify migration success on staging
- Have rollback SQL ready
- Schedule production migrations during low-traffic periods

### 4. Seed Testing Data Strategy

Create realistic test data for staging environment:

```sql
-- Example seed script structure
-- File: supabase/seeders/staging_seed.sql

-- Fake Organizations
INSERT INTO organizations (id, name, slug) VALUES
  ('org_staging_001', 'Test Org Alpha', 'test-alpha'),
  ('org_staging_002', 'Test Org Beta', 'test-beta');

-- Fake Users
INSERT INTO users (id, email, organization_id) VALUES
  ('user_staging_001', 'test.user1@staging.local', 'org_staging_001'),
  ('user_staging_002', 'test.user2@staging.local', 'org_staging_002');

-- Fake Lotes
INSERT INTO lotes (id, nombre, organizacion_id) VALUES
  ('lote_staging_001', 'Lote Test A', 'org_staging_001');

-- Fake Cajas
INSERT INTO cajas (id, nombre, lote_id) VALUES
  ('caja_staging_001', 'Caja Test 1', 'lote_staging_001');

-- Fake Telemetry Events
INSERT INTO telemetry_events (event_type, user_id, metadata) VALUES
  ('ai_copilot_invoked', 'user_staging_001', '{"query": "test"}'),
  ('voice_workflow_started', 'user_staging_002', '{"duration_ms": 5000}');

-- Fake AI Activity
INSERT INTO ai_activity_log (user_id, action, tokens_used) VALUES
  ('user_staging_001', 'clarification_request', 150),
  ('user_staging_002', 'proactive_suggestion', 75);
```

**Seed Script Execution**:
```bash
# After deploying migrations to staging
psql $STAGING_DB_URL -f supabase/seeders/staging_seed.sql
```

### 5. Operational Testing Checklist

Before promoting from staging to production:

#### AI Copilot Features
- [ ] AI parsing returns valid results
- [ ] Clarification flows trigger correctly
- [ ] Response latency < 3 seconds
- [ ] Error handling graceful (no crashes)
- [ ] Token usage tracked in telemetry

#### Voice Workflows
- [ ] Voice input recognized accurately
- [ ] Transcription displayed correctly
- [ ] Voice commands execute properly
- [ ] Audio playback works (if applicable)
- [ ] Microphone permissions handled

#### Proactive Suggestions
- [ ] Suggestions appear at correct triggers
- [ ] Suggestion relevance validated
- [ ] Dismissal works correctly
- [ ] No duplicate suggestions shown

#### Telemetry
- [ ] Events sent to staging endpoint
- [ ] Event schema validated
- [ ] No PII leaked in telemetry
- [ ] Rate limiting functional

#### Operational Macros
- [ ] Macro execution successful
- [ ] Macro results logged
- [ ] Error recovery works
- [ ] Permissions enforced

#### Multi-Tenant Isolation
- [ ] User A cannot access User B's data
- [ ] Organization filtering works
- [ ] RLS policies enforced
- [ ] Cross-tenant queries blocked

### 6. Production Protection Recommendations

#### Backup Strategy

```yaml
Automated Backups:
  - Daily full backup (retained 30 days)
  - Hourly incremental (retained 7 days)
  - Pre-migration snapshot (always)

Manual Backup Before Deploy:
  - npx supabase db dump --db-url $PROD_DB_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Rollback Strategy

```bash
# Quick rollback procedure
1. Stop deployment pipeline
2. Restore database from pre-migration backup
3. Redeploy previous stable version
4. Notify stakeholders

# Database rollback command
psql $PROD_DB_URL < backup_YYYYMMDD_HHMMSS.sql
```

#### Emergency Feature Disable

Implement feature flags for emergency shutdown:

```typescript
// Example: Emergency disable pattern
if (!process.env.VITE_ENABLE_AI_COPILOT === 'true') {
  // Disable AI features gracefully
  return <FallbackUI />;
}
```

**Emergency contacts should be able to**:
- Disable AI features via environment variable
- Turn off voice workflows
- Pause telemetry collection
- Enable maintenance mode

#### Migration Rollback Precautions

⚠️ **CRITICAL**: Some migrations cannot be rolled back safely:
- Data deletions
- Column drops
- Irreversible transformations

**Always**:
1. Test rollback SQL on staging first
2. Have point-in-time recovery available
3. Document irreversible migrations
4. Schedule complex migrations with DBA support

### 7. Deployment Recommendations

#### Branch Strategy

```
main (protected)
  ├── develop (integration)
  ├── feature/* (feature branches)
  ├── hotfix/* (urgent fixes)
  └── release/* (release candidates)
```

#### Merge Flow

```
1. Feature development
   feature/my-feature → develop

2. Integration testing
   develop → staging deployment

3. Release preparation
   develop → release/v1.2.0

4. Production release
   release/v1.2.0 → main → production
   release/v1.2.0 → develop (merge back)
```

#### Release Flow

```yaml
Pre-release Checks:
  - All tests passing
  - Staging validation complete
  - Migration scripts reviewed
  - Rollback plan documented

Release Steps:
  1. Create release branch
  2. Deploy to staging (final verification)
  3. Tag release candidate
  4. Manual approval gate
  5. Deploy to production
  6. Monitor for 30 minutes
  7. Tag stable release
  8. Merge to main and develop

Post-release:
  - Monitor error rates
  - Check performance metrics
  - Verify user feedback
  - Update documentation
```

#### Staging Verification Process

```markdown
## Staging Sign-off Template

**Release**: v1.2.0
**Date**: YYYY-MM-DD
**Reviewer**: @username

### Tests Completed
- [ ] Unit tests: PASS
- [ ] Integration tests: PASS
- [ ] E2E tests: PASS
- [ ] Performance tests: PASS

### Feature Validation
- [ ] AI Copilot: ✅
- [ ] Voice Workflows: ✅
- [ ] Proactive Suggestions: ✅
- [ ] Telemetry: ✅
- [ ] Macros: ✅
- [ ] Multi-tenant Isolation: ✅

### Migration Status
- [ ] Migrations applied successfully
- [ ] Rollback tested
- [ ] Data integrity verified

### Approval
[ ] APPROVED for production deployment
[ ] REJECTED - Issues found (see comments)
```

### 8. Current Staging Readiness Assessment

| Component | Status | Notes |
|-----------|--------|-------|
| Environment files | ✅ Ready | Templates created |
| NPM scripts | ✅ Ready | Build/dev scripts added |
| Migration workflow | ⚠️ Needs setup | Supabase CLI configured |
| Seed data | ⚠️ Needs creation | Scripts pending |
| Feature flags | ⚠️ Partial | Variables defined, implementation needed |
| CI/CD integration | ❌ Not configured | Pipeline setup required |

### 9. Remaining Production Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| No automated CI/CD | High | Set up GitHub Actions/GitLab CI |
| Untested rollback procedures | Medium | Document and test rollback |
| No monitoring dashboard | Medium | Implement error tracking |
| Missing load testing | Medium | Add performance tests |
| Single-region deployment | Low | Consider multi-region for HA |

### 10. Recommended Rollout Strategy

**Phase 1: Foundation (Week 1)**
- [ ] Set up staging Supabase project
- [ ] Configure CI/CD pipeline
- [ ] Create seed data scripts
- [ ] Test migration workflow end-to-end

**Phase 2: Validation (Week 2)**
- [ ] Run full operational checklist on staging
- [ ] Perform load testing
- [ ] Test rollback procedures
- [ ] Train team on deployment process

**Phase 3: Soft Launch (Week 3)**
- [ ] Deploy to production with feature flags OFF
- [ ] Enable for internal users only
- [ ] Monitor for 48 hours
- [ ] Gather feedback

**Phase 4: Full Launch (Week 4)**
- [ ] Enable features for all users
- [ ] Monitor closely for first week
- [ ] Iterate based on feedback
- [ ] Document lessons learned

### 11. Safest Deployment Sequence

```
1. Friday afternoon (low traffic)
   └─> Deploy infrastructure changes only

2. Monday morning (team available)
   └─> Deploy application code with features OFF

3. Tuesday-Wednesday (monitoring period)
   └─> Gradually enable features (10% → 50% → 100%)

4. Thursday-Friday (stabilization)
   └─> Monitor, fix issues, document

NEVER deploy on:
- Fridays after 2 PM
- Weekends
- Holidays
- During known high-traffic events
```

---

## Summary

This deployment strategy ensures:
- ✅ Safe separation between environments
- ✅ Tested migrations before production
- ✅ Rollback capabilities
- ✅ Feature flag controls
- ✅ Operational validation
- ✅ Gradual rollout approach

**Next Steps**: Implement Phase 1 foundation items before any production deployment.
