# Rangao Release, Deployment, and Rollback Guide

This document outlines the standard operating procedures for deploying releases safely, validating preview environments, applying database migrations, and executing instant rollbacks for the **Rangao** e-commerce platform.

---

## 1. Release Quality Gates (Pre-Flight Checklist)

Before merging any code to `main` or deploying to production, execute the automated release check:

```bash
npm run validate:release
```

This single command runs all mandatory release gates in sequence:
1. **Environment Validation (`npm run validate:env`)**: Verifies required Supabase keys, URLs, and integration secrets with strict PII/token redaction.
2. **ESLint (`npm run lint`)**: Ensures code follows project style and avoids illegal React hook calls or runtime syntax issues.
3. **Type Safety (`npm run typecheck`)**: Compiles TypeScript without emitting to catch any prop, model, or database schema mismatches.
4. **Automated Unit & Integration Tests (`npm test`)**: Runs all 21+ test suites covering checkout security, RBAC, customer isolation, variations, and tracking.
5. **End-to-End Smoke Test (`npm run test:smoke`)**: Validates live HTTP status, SEO metadata, cart math, and checkout safety dry-runs.

All 5 gates must pass with **Exit Code 0**.

---

## 2. Preview Deployment Validation

When creating a Pull Request or pushing a release branch:

1. **Vercel Preview URL**: Vercel automatically generates an isolated preview URL (e.g., `https://rangao-git-branch.vercel.app`).
2. **Execute Remote Smoke Test**:
   ```bash
   node scripts/smoke-test.js https://rangao-git-branch.vercel.app
   ```
3. **Manual Sanity Check**:
   - Open homepage and check brand logo, announcement bar, and hero banner.
   - Open a product page and switch variations (check price, image, and stock updates).
   - Add item to cart and verify cart badge count.
   - Go to checkout and ensure dry-run / Cash on Delivery validation prevents invalid submissions without real SMS charges.
   - Navigate to `/admin` and confirm Super Admin (`bdinfosky@gmail.com`) can log in and view the sidebar.

---

## 3. Database Migration Deployment Checklist

Database migrations must be strictly backward-compatible to allow zero-downtime deployments.

### Before Applying Migrations:
- [ ] **Backup**: Export or verify current Supabase database backup from the Supabase dashboard.
- [ ] **Additive First**: Never drop or rename columns in the same release that updates frontend/backend code.
  - *Phase 1*: Add new column (allow `NULL` or provide default value).
  - *Phase 2*: Deploy application code that reads/writes the new column.
  - *Phase 3*: (Follow-up release) Remove deprecated column after old code is completely inactive.
- [ ] **RLS Policy Verification**: Ensure all new tables have RLS enabled (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`).
- [ ] **Staff Privilege Audit**: Restrict sensitive columns (e.g., notes, internal fraud signals) from public customer select policies.
- [ ] **RPC Functions**: When replacing an RPC function with `CREATE OR REPLACE FUNCTION`, ensure parameter signatures match active frontend calls.

---

## 4. Production Rollback Procedure

If a critical incident occurs in production (e.g. checkout outage, unhandled frontend exceptions, or payment gateway issues), follow these steps:

### Option A: Vercel Instant Rollback (Fastest — < 30 seconds)
1. Navigate to the **Vercel Dashboard** -> **Rangao Project** -> **Deployments**.
2. Locate the previous stable production deployment (marked with green status before the incident).
3. Click the three dots menu (`...`) on the stable deployment.
4. Select **"Instant Rollback"** (or **"Promote to Production"**).
5. Confirm. Vercel will immediately redirect production traffic to the previous build without rebuilding.

### Option B: Git Revert Rollback
If the deployment was triggered by a Git push to `main`:
1. Revert the offending commit locally:
   ```bash
   git log -n 5 --oneline
   git revert <commit-hash> -m 1
   ```
2. Run pre-flight checks:
   ```bash
   npm run validate:release
   ```
3. Push to `main` to trigger the automated CI/CD pipeline:
   ```bash
   git push origin main
   ```

### Option C: Database Rollback
1. If a migration broke production, apply the reverse SQL script prepared in the migration plan.
2. In Supabase Dashboard -> **SQL Editor**, execute the rollback script.
3. If an RLS policy inadvertently locked out staff, verify Super Admin bypass for `bdinfosky@gmail.com`.

---

## 5. Post-Incident Review
1. Open Admin Panel -> **Operational Health** (`/admin/operational-health`) to inspect captured error telemetry.
2. Run operational queries (`docs/operational-queries.sql`) to detect any orders stuck in `pending` or failed payment state.
3. Notify affected customers if any payments were captured but orders require confirmation.
