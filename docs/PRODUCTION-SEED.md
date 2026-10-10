# Production Seed

`pnpm seed:prod` bootstraps a **live** deployment with the reference data the platform cannot
function without. It is a different command from the development seed and the two must not be
confused.

| | `pnpm seed` (dev) | `pnpm seed:prod` | `pnpm seed:prod:fresh` |
|---|---|---|---|
| Wipes every collection first | **Yes** | Never | **Yes** |
| Roles, grades, school types, plans, AI plans | Yes | Yes | Yes |
| Platform admin | faker-generated, password `password123` | from environment, created once | from environment (always created after wipe) |
| Organizations, users, courses, enrollments, reviews, chat… | Yes (faker) | **No** | wiped, then not re-seeded |
| Safe to re-run against live data | No | Yes — every write is an idempotent upsert | No — destroys all data first |

## What it seeds

1. **Roles** — all 8 (`platform-admin`, `super-admin`, `admin`, `instructor`, `student`, `parent`, `secretary`, `guest`) with their CASL permission rules. Upserted by `name`.
2. **Grades** — the 6 Egyptian grades (1st Preparatory → 3rd Secondary). Upserted by `nameEn`.
3. **School types** — Public, Private, Language, International, Azhar. Upserted by `nameEn`.
4. **Subscription plans** — Free, Basic, Pro, Enterprise. Upserted by `tier`.
5. **AI plans** — AI Free (20 messages/day) and AI Pro (unlimited). Upserted by `tier`.
6. **Platform admin** — a single account, created only if absent (see below). After `:fresh`, the DB is empty so the admin is always created.

It deliberately seeds no organizations, users, courses or any other tenant data.

## Running it

```bash
# Recommended: target explicitly via --env flag (works cross-platform on Windows/Linux/macOS)
pnpm --filter server seed:prod --env prod
pnpm --filter server seed:prod --env dev
pnpm --filter server seed:prod:fresh --env prod

# Or via NODE_ENV
NODE_ENV=production pnpm --filter server seed:prod
NODE_ENV=production pnpm --filter server seed:prod:fresh
```

Passing `--env prod` (or `--env dev`) determines whether `getMongoUri()` resolves `MONGODB_URI_PROD` or `MONGODB_URI_DEV`. If omitted, `NODE_ENV=production` makes `getMongoUri()` resolve `MONGODB_URI_PROD` (defaulting to `MONGODB_URI_DEV` otherwise). The resolved URI (password redacted) and target database are logged at the start of the run.

`seed:prod:fresh` deletes every document in every non-system collection on that database, then
runs the same seeders as `seed:prod`. Indexes are left in place.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI_PROD` | yes (when `NODE_ENV=production`) | Must include the database name in the path |
| `MONGODB_URI_DEV` | yes (otherwise) | Must include the database name in the path |
| `PLATFORM_ADMIN_EMAIL` | yes | Lowercased before lookup and insert |
| `PLATFORM_ADMIN_USERNAME` | yes | Lowercased before lookup and insert |
| `PLATFORM_ADMIN_PASSWORD` | yes | Minimum 12 characters; stored as a bcrypt hash |
| `PLATFORM_ADMIN_PHONE` | yes | Required by User schema for local (non-Google) accounts |
| `PLATFORM_ADMIN_FIRST_NAME` | no | Defaults to `Platform` |
| `PLATFORM_ADMIN_LAST_NAME` | no | Defaults to `Admin` |
| `PADDLE_PRICE_<TIER>_MONTHLY` / `_YEARLY` | no | Read by `PlanSeeder` for Basic/Pro/Enterprise |
| `BASIC_LEMON_SQUEEZY_PLAN_ID_MONTHLY` / `_YEARLY` | no | Read by `PlanSeeder` for the Basic plan |
| `EXCHANGE_RATES_URL` | no | Defaults to `https://open.er-api.com/v6/latest/USD` |

## Preflight checks

All of these abort the run with a non-zero exit code (see `prod-preflight.ts`):

- **Mongo URI database name** — the URI must include a database path so the seed cannot write to
  the cluster default. The URI is echoed with the password redacted.
- **Admin credentials** — every missing variable is reported at once, and a password under 12
  characters is rejected. Runs before connecting.
- **Exchange rates** — plan prices are authored in EGP and converted to USD at seed time.
  `CurrencyService` swallows fetch failures and falls back to a rate of `1`, which would store
  "500 EGP" as "$500". The seed verifies a plausible USD→EGP rate (≥ 2; the real rate is ~48)
  before writing any plan.

The rate check runs after roles, grades and school types are seeded, so a rate-API outage can
leave those three written and the plans not. They are static reference data upserted by a natural
key, so simply re-running once the network is healthy is safe and completes the job. After a
failed `:fresh` run the wipe has already happened — re-run `seed:prod` (or `:fresh` again) to
finish.

## The platform admin is never overwritten

`PlatformAdminSeeder` looks for an existing user matching **either** the configured email or the
configured username, and if it finds one it returns without writing anything at all. A re-run of
`seed:prod` can therefore never reset a password that was rotated in production, and never crashes
on a duplicate key when only one of the two fields collides.

This means `seed:prod` cannot be used to reset a forgotten admin password — do that through the
application's own password flow, delete the account first, or use `seed:prod:fresh` (which wipes
everything).

## Tests

- `apps/server/src/database/seeds/prod-preflight.spec.ts`
- `apps/server/src/user/seeds/platform-admin.seeder.spec.ts`

```bash
pnpm --filter server exec jest src/database/seeds/prod-preflight.spec.ts src/user/seeds/platform-admin.seeder.spec.ts
```
