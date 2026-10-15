# Filipino Fill

A map of Filipino food, shops and services across Calgary. Guests can search and browse; registered members (email + one-time code) can comment; admins manage establishments and see platform stats.

```
apps/web   Next.js 16 (App Router) · Tailwind 4 · shadcn/ui (Base UI) · Framer Motion · MapLibre GL
apps/api   NestJS 12 · Kysely + pg · class-validator · Supabase Auth token verification
supabase/  Local Supabase (CLI + Docker): migrations, seed, OTP email template
scripts/   generate-seed.mjs — deterministic generator for the 100 mock establishments
```

## Quick start

Requires Node 24+ and a running container engine (Docker Desktop, OrbStack, Colima…).

```bash
npm install
npm run db:start            # boots local Supabase, applies migrations + seed
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run dev                 # API on :4100, web on :3100
```

Open http://localhost:3100.

> **Ports.** This project uses **3100** (web), **4100** (API) and **55421–55429** (Supabase), so it can run alongside another local Supabase project on the default 5432x ports.
> If `npx supabase status` shows a different publishable key, update both env files.

### First run: create the super admin

With no super admin in the database, the first visitor gets a **Set up Filipino Fill** dialog:

1. Enter your email → a 6-digit code is sent.
2. Locally, emails go to **Mailpit**: http://127.0.0.1:55424 (the dialog links to it).
3. Enter the code → you become the super admin and the prompt never appears again.

Only one super admin can ever exist. Concurrent claims are serialized with an advisory lock, and a partial unique index (`profiles_single_super_admin`) is the hard guarantee. Visitors who aren't the admin can dismiss the prompt for their session.

## Features

| | |
|---|---|
| **Map** | MapLibre + CARTO Positron basemap. All establishments show as subtle dots; search results become **pulsing, bouncing red pins** (CSS transform/opacity only, respects `prefers-reduced-motion`). |
| **City limits** | The official City of Calgary boundary is drawn as a cased line, with the area outside the city softly dimmed. It's built from the [City Boundary open dataset](https://data.calgary.ca/d/erra-cqp9) by `node scripts/build-city-boundary.mjs` (3,901 vertices simplified to 400, about 9 KB) and served as a static file. The data is licensed under the Open Government Licence – City of Calgary and credited in the map attribution. |
| **Light / dark mode** | A toggle next to the account menu offers Light, Dark or System, saved per browser (`next-themes`). The basemap switches between CARTO Positron and Dark Matter, and the boundary, dots and pins use colours tuned for each. All colours come from theme tokens in `globals.css`. |
| **Search** | Top-left panel: debounced as-you-type search, category chips, keyboard nav (`/` to focus, ↑/↓, Enter, Esc), skeleton, empty and error states. The backend runs prefix full-text search (`tsvector`, weighted name > tags > area > description). If that finds nothing, it falls back to trigram matching for typos (`adbo` → Adobo Republic). |
| **Details dialog** | Centered dialog with photo carousel, open-now status (Calgary time), hours, contact info, specialties, and comments. |
| **Mock photos** | `/mock-photos/{exterior,interior,signature,festive}?c=&n=&s=` renders a deterministic SVG per establishment: storefront with name signage and parols, interior with a specials board, a category-specific hero shot (plated food on banig, pandesal basket, halo-halo, balikbayan boxes, stained glass…), and a fiesta night with banderitas and a jeepney. Every image carries a "MOCK PHOTO" label. |
| **Accounts** | Email is the user ID. Users register through Supabase email OTP; a user counts as *registered* only after verifying (`profiles.email_verified_at`). Commenting requires a verified account. Other users' emails are never exposed; comment authors show a display name or a masked handle. |
| **Admin** (`/admin`) | Registered users, pending verifications, establishments, comments, admins, category and neighbourhood breakdowns. Add, edit and soft-delete establishments; new ones get mock photos automatically. |

## API (`/api`, responses wrapped as `{ data }`; errors as `{ error: { code, message, details? }, statusCode, … }`)

| Method | Path | Auth |
|---|---|---|
| GET | `/establishments?q=&category=&limit=` | public |
| GET | `/establishments/:id` | public |
| GET | `/establishments/:id/comments` | public |
| POST | `/establishments/:id/comments` | verified user |
| DELETE | `/comments/:id` | author or admin |
| GET / PATCH | `/me` | signed in |
| GET | `/setup/status` | public |
| POST | `/setup/super-admin` | verified user, only while none exists |
| GET | `/admin/stats` | admin |
| POST / PATCH / DELETE | `/admin/establishments[/:id]` | admin |
| GET | `/health` | public |

Bearer tokens are validated against Supabase Auth through a swappable `TokenVerifier` port. Roles come from `public.profiles`.

## Data model

`supabase/migrations/20261015000000_init_schema.sql`

- `profiles`: mirrors `auth.users` via trigger; `role ∈ {user, admin, super_admin}`; `email_verified_at`.
- `establishments`: field-level CHECK constraints (Calgary lat/lng bounds, postal-code format, etc.), trigger-maintained `search_vector` (GIN), trigram index on `name`, audit timestamps, soft delete via `deleted_at`.
- `establishment_photos`, `comments`: soft delete, indexed by `(establishment_id, …)`.
- RLS enabled everywhere: anonymous and authenticated clients can only *read* live rows. All writes go through the API.

Regenerate the seed after editing the generator:

```bash
npm run db:seed:generate && npm run db:reset
```

## Accessibility (WCAG 2.1 AA)

`npm run check:contrast -w apps/web` checks both themes. It reads the real tokens from `globals.css` and Tailwind's palette, composites translucent layers, and verifies:

- every text pair is at least 4.5:1;
- input borders, focus rings and map graphics (boundary, dots, pins against each basemap) are at least 3:1.

It exits non-zero on failure, so it can run in CI. Several shadcn defaults failed this check (input borders 1.26:1, focus rings 2.59:1), so `--muted-foreground`, `--destructive`, `--input` and `--ring` are tuned. Map legend entries are text-labelled, so colour never carries meaning alone, and the pin animations respect `prefers-reduced-motion`.

## Useful commands

```bash
npm run db:reset                  # wipe + re-migrate + re-seed (also resets the super admin)
npm test -w apps/api              # unit tests
npm run lint -w apps/web
npm run build -w apps/web
npx supabase status               # local URLs & keys; Studio at http://127.0.0.1:55423
node scripts/build-city-boundary.mjs  # refresh the city boundary from Calgary Open Data
```

> **Dev tip:** if edits to `apps/web/src/app/globals.css` don't show up, restart `npm run dev`. Turbopack's custom Tailwind CSS loader rule (in `next.config.ts`) occasionally serves a stale stylesheet.

## Deploying to Supabase Cloud

1. `npx supabase link --project-ref <ref>` then `npx supabase db push`. Seed with `psql "$DATABASE_URL" -f supabase/seed.sql` if you want the mock data.
2. In the dashboard, set the **Magic Link** and **Confirm signup** email templates to the contents of `supabase/templates/otp.html` (it renders `{{ .Token }}`), and configure SMTP.
3. API env: the project's pooled `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `CORS_ORIGINS` set to your web origin.
4. Web env: the `NEXT_PUBLIC_*` values from `.env.example`. Leave `NEXT_PUBLIC_DEV_MAILBOX_URL` unset.
