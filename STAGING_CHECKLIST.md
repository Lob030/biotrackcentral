# Staging Sign-off Checklist

**Release Version**: v_______  
**Date**: YYYY-MM-DD  
**Reviewer**: @___________  

---

## 1. Pre-deployment Verification

### Code Quality
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Linting errors resolved
- [ ] TypeScript compilation successful

### Build Verification
- [ ] `npm run build:staging` completes without errors
- [ ] Bundle size within acceptable limits
- [ ] Source maps generated correctly

---

## 2. Migration Status

### Database Migrations
- [ ] All migrations tested locally first
- [ ] Migrations applied to staging successfully
- [ ] No migration errors in logs
- [ ] Rollback SQL prepared and tested
- [ ] Data integrity verified post-migration

### Migration Count Verification
```sql
SELECT COUNT(*) FROM supabase_migrations.schema_migrations;
-- Expected: ___ migrations
```

---

## 3. Feature Validation

### AI Copilot Features
- [ ] AI parsing returns valid, accurate results
- [ ] Clarification flows trigger when query is ambiguous
- [ ] Response latency < 3 seconds (p95)
- [ ] Error handling graceful (no crashes on API failures)
- [ ] Token usage tracked in telemetry
- [ ] Rate limiting functional

**Test Queries**:
```
- "¿Cuántas cajas tiene el lote A?"
- "Mostrar cajas pendientes"
- "Buscar organización test-alpha"
```

### Voice Workflows
- [ ] Voice input recognized accurately (>90% confidence)
- [ ] Transcription displayed correctly in UI
- [ ] Voice commands execute properly
- [ ] Microphone permissions handled gracefully
- [ ] Audio playback works (if applicable)
- [ ] Voice workflow events logged in telemetry

**Test Commands**:
```
- "Abrir lote A"
- "Mostrar cajas completadas"
- "Crear nueva organización"
```

### Proactive Suggestions
- [ ] Suggestions appear at correct triggers
- [ ] Suggestion relevance validated by QA
- [ ] Dismissal works correctly
- [ ] No duplicate suggestions shown
- [ ] Acceptance tracking functional

**Test Scenarios**:
```
- Complete all cajas in a lote → batch complete suggestion
- Anomaly detected → alert suggestion
- Idle time > 5 min → productivity suggestion
```

### Telemetry
- [ ] Events sent to staging endpoint successfully
- [ ] Event schema validated (no malformed events)
- [ ] No PII leaked in telemetry payloads
- [ ] Rate limiting functional
- [ ] Dashboard shows real-time events

**Verify Events**:
```
- ai_copilot_invoked
- voice_workflow_started
- proactive_suggestion_shown
- macro_executed
```

### Operational Macros
- [ ] Macro execution successful
- [ ] Macro results logged correctly
- [ ] Error recovery works (failed macros don't crash app)
- [ ] Permissions enforced (users can only run allowed macros)

**Test Macros**:
```
- generate_report
- export_data
- cleanup_completed
```

### Multi-Tenant Isolation
- [ ] User from Org A cannot access Org B's data
- [ ] Organization filtering works in all queries
- [ ] RLS (Row Level Security) policies enforced
- [ ] Cross-tenant queries blocked with proper error
- [ ] Auth tokens scoped to correct organization

**Test Isolation**:
```
Login as user_staging_001 (org_staging_001)
→ Should NOT see org_staging_002 data
→ Should ONLY see org_staging_001 data
```

---

## 4. Performance Benchmarks

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Initial Load Time | < 3s | _____s | ☐ |
| AI Response Time | < 3s | _____s | ☐ |
| Voice Recognition | < 2s | _____s | ☐ |
| Page Transition | < 500ms | _____ms | ☐ |
| API Error Rate | < 1% | _____% | ☐ |

---

## 5. Security Checks

- [ ] No hardcoded secrets in code
- [ ] Environment variables properly scoped
- [ ] HTTPS enforced (if applicable)
- [ ] CORS configured correctly
- [ ] Authentication flows secure
- [ ] Session management working
- [ ] Logout clears all tokens

---

## 6. Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ☐ Pass / ☐ Fail |
| Firefox | Latest | ☐ Pass / ☐ Fail |
| Safari | Latest | ☐ Pass / ☐ Fail |
| Edge | Latest | ☐ Pass / ☐ Fail |

---

## 7. Error Monitoring

- [ ] Error tracking service connected (e.g., Sentry)
- [ ] Errors properly categorized
- [ ] Stack traces captured
- [ ] User context attached to errors
- [ ] Alert thresholds configured

---

## 8. Rollback Readiness

- [ ] Previous stable version tagged
- [ ] Database backup taken pre-deployment
- [ ] Rollback procedure documented
- [ ] Rollback tested on staging
- [ ] Team notified of deployment window

---

## 9. Sign-off Decision

### Approval Status

- [ ] **APPROVED** - Ready for production deployment
- [ ] **CONDITIONALLY APPROVED** - Minor issues noted, can proceed with fixes
- [ ] **REJECTED** - Critical issues found, must be resolved before production

### Issues Found

| Severity | Description | Status |
|----------|-------------|--------|
| Critical | | ☐ Open ☐ Resolved |
| High | | ☐ Open ☐ Resolved |
| Medium | | ☐ Open ☐ Resolved |
| Low | | ☐ Open ☐ Resolved |

### Notes

```
Add any additional notes, concerns, or recommendations here:




```

---

## 10. Approvals

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Tech Lead | | | |
| Product Owner | | | |
| DevOps | | | |

---

**Next Steps**:
1. If APPROVED: Schedule production deployment
2. If CONDITIONALLY APPROVED: Document fixes and re-verify
3. If REJECTED: Create tickets for issues, schedule re-test
