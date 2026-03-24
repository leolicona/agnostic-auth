# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Wrangler local dev server
npm run deploy       # Deploy to Cloudflare Workers (minified)
npm run cf-typegen   # Regenerate Cloudflare binding types (bindings.d.ts)

# Testing
npm test             # Run tests in watch mode
npm run test:run     # Run tests once

# Database migrations (Drizzle + D1)
npx drizzle-kit generate   # Generate migration files from schema changes
npx drizzle-kit migrate    # Apply migrations to local D1
```

No lint script is configured.

## Architecture

This is a **Cloudflare Workers** edge service implementing OTPless (magic-link) authentication with WhatsApp integration. It runs on Hono.js and uses Cloudflare-native storage (D1, KV, Durable Objects).

### Key Cloudflare Bindings (defined in `src/bindings.d.ts`)
- **DB** — D1 SQLite database via Drizzle ORM; schema lives in the `core-lib` workspace package (`packages/core-lib/src/db/schema.ts`)
- **AUTH_KV** — KV namespace for sessions and rate-limit counters
- **WEBHOOK_PROCESSOR** — Durable Object for async WhatsApp webhook processing

### Auth Flow
1. `POST /auth/login` — validates phone, creates user if new, generates a SHA-256-hashed verification token, returns a magic link `{redirectUrl}/verify?token={raw}`
2. `POST /auth/verify` — validates raw token against stored hash, marks token used, issues JWT access token (15 min) + refresh token (7 days)
3. `POST /auth/check-user` — lookup only, no token issuance

### WhatsApp Webhook Flow
1. `POST /api/webhook` — responds 200 immediately to WhatsApp, hands payload to `WebhookProcessor` Durable Object
2. Durable Object (`src/routes/webhook/webhook.processorDO.ts`) processes async: detects signup keywords ("unirme"/"chatya"), upserts user, generates token, sends CTA button via WhatsApp Cloud API

### File Conventions (from `.trae/rules/project_rules.md`)
Each resource under `src/routes/{resource}/` has three files:
- `index.ts` — route definitions and HTTP method bindings
- `handler.ts` — business logic
- `schema.ts` — Zod validation schemas

Reusable auth logic lives in `src/core/auth/auth.ts`. JWT utilities are in `src/utils/jwt.ts`.

### Middleware Pipeline (applied globally in `src/index.ts`)
1. Global error handler — normalizes HTTPException, ZodError, JWT errors
2. Security headers — CSP, HSTS, X-Frame-Options
3. CORS — currently in development mode (empty origins); update for production
4. Rate limiting — preset configurations available in `src/middleware/rate.limit.ts` (currently commented out)

### Monorepo Context
This service is part of a monorepo (`agnostic-auth/`). The `core-lib` package provides shared DB schemas (`users`, `verificationTokens` tables). The workspace is configured in the root `package.json`.

### Testing
Tests run via `@cloudflare/vitest-pool-workers`, which spins up a real Workers environment using `wrangler.jsonc` bindings. Test files are in `tests/`.
