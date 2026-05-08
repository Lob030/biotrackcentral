# Environment Configuration Guide

## Overview

This application supports three distinct environments:
- **Local** - Developer workstation
- **Staging** - Pre-production testing
- **Production** - Live user-facing environment

## Environment Files

| File | Purpose | Committed to Git |
|------|---------|------------------|
| `.env` | Active environment (local by default) | ❌ No |
| `.env.local` | Local development template | ✅ Yes |
| `.env.staging` | Staging configuration template | ✅ Yes |
| `.env.production` | Production configuration template | ✅ Yes |
| `.env.example` | Reference for all variables | ✅ Yes |

## Setup Instructions

### Local Development

1. Copy the local template:
   ```bash
   cp .env.local .env
   ```

2. Update with your local Supabase credentials:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PROJECT_ID
   - VITE_SUPABASE_PUBLISHABLE_KEY

3. Run development server:
   ```bash
   npm run dev
   ```

### Staging Deployment

1. Configure CI/CD with staging secrets or create `.env.staging` locally

2. Build for staging:
   ```bash
   npm run build:staging
   ```

3. Deploy migrations to staging first:
   ```bash
   npm run migrate:staging
   ```

4. Test thoroughly before production

### Production Deployment

1. NEVER deploy directly to production

2. Follow the migration workflow:
   ```
   feature branch → staging → testing → production
   ```

3. Build for production:
   ```bash
   npm run build:production
   ```

4. Deploy migrations to production:
   ```bash
   npm run migrate:production
   ```

## Feature Flags

| Flag | Description | Default (Prod) |
|------|-------------|----------------|
| `VITE_ENABLE_AI_COPILOT` | Enable AI Copilot features | true |
| `VITE_ENABLE_VOICE_WORKFLOW` | Enable voice workflows | true |
| `VITE_ENABLE_TELEMETRY` | Enable telemetry collection | true |
| `VITE_ENABLE_PROACTIVE_SUGGESTIONS` | Enable proactive suggestions | true |
| `VITE_ENABLE_OPERATIONAL_MACROS` | Enable operational macros | true |

## Security Notes

- ⚠️ **NEVER** commit actual secrets to Git
- Use CI/CD secrets management for staging and production
- The `.env`, `.env.*` files in the repo contain placeholder values only
- Rotate keys immediately if accidentally committed

## Supabase Projects

You need THREE separate Supabase projects:

1. **Local** - For individual development
2. **Staging** - Shared testing environment
3. **Production** - Live user data

Each project must have:
- Isolated database
- Separate auth configuration
- Independent storage buckets
- Dedicated API keys
