# Organization Onboarding Tour Design

**Date:** 2026-08-30  
**Scope:** Web client org dashboard (`apps/client`) + NestJS user/auth (`apps/server`) + shared user types.  
**Out of scope:** Mobile app, non–SuperAdmin tours, forcing create-form completion, changing `onboardingComplete`.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Flag | `User.organizationOnboarded` (not `onboarded`) |
| Completion | Finish, skip, or auto if ≥1 instructor and ≥1 course |
| Migration | All existing SuperAdmins → `true` |
| Tour UX | Hybrid: navigate list pages; spotlight Create; do not open forms |
| Architecture | Shared engine + Joyride (active) + Shepherd (built, inactive) |

## Data / API

- New SuperAdmins: `organizationOnboarded: false` on register and OAuth `completeOnboarding` when creating org
- NATS: `users.completeOrganizationOnboarding` (SuperAdmin only, idempotent)
- Migration: `pnpm --filter server migrate:org-onboarding`

## Client

- Organ: `components/organs/organization-onboarding/`
- Mount: org dashboard layout via `OrganizationDashboardOnboardingHost`
- Targets: `data-onboarding` on nav users/courses and create buttons
- `ACTIVE_ONBOARDING_PROVIDER = 'joyride'`

See also plan (if present): `docs/superpowers/plans/2026-08-30-organization-onboarding-tour.md`
