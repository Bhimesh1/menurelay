# MenuRelay (PartyOrderApp)

A self-serve party / catering ordering system. A host creates an event, loads a menu, and shares one public link. Every guest picks their own dishes, spice level and notes — and the host gets a single consolidated PDF order summary to hand to the restaurant.

- **App:** https://menurelay.onrender.com
- **Repo:** https://github.com/Bhimesh1/menurelay
- **Landing page:** https://github.com/Bhimesh1/menurelay-landing-page

---

## Features

**For the host (admin)**
- Email + password accounts (NextAuth credentials), all `/admin/*` routes protected by middleware.
- Create events with a unique public `slug`; status flow `DRAFT → PUBLISHED → LOCKED` (locked events stop accepting new guest orders).
- Menu management: categories and sub-categories (self-referencing hierarchy), items with codes, prices, descriptions, images, veg/vegan flags, tags and per-item options/variants.
- Bulk menu import from a JSON payload (validated with Zod, wipe-and-replace inside a transaction) plus text extraction from an uploaded PDF menu to speed up the first import.
- Visibility toggles — hide individual items or whole categories from guests without deleting them.
- Bundles / combos with their own lines and price.
- Event settings: restaurant name, price display on/off, spice scale (German or Indian), and custom PDF header/address/report titles.
- VIP mode: name a guest and set a message to trigger a celebration on the guest screen.
- Orders tab with every guest order, plus a generated **master order summary PDF** (`@react-pdf/renderer`).

**For guests**
- Open `/e/<slug>`, browse the menu, add items with quantity, option, spice level and a note.
- Orders are keyed by guest name per event, so a guest can come back and update their order.
- Prices are snapshotted at order time so later menu edits don't rewrite past orders.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) + React 19 |
| Language | TypeScript |
| Database | PostgreSQL 15 |
| ORM | Prisma 6 |
| Auth | NextAuth v5 (credentials, bcrypt hashes) |
| UI | Tailwind CSS 4, shadcn/ui, Radix primitives, lucide-react, framer-motion |
| Validation | Zod |
| PDF | `@react-pdf/renderer` (generate), `pdf-parse` (import) |

---

## Project structure

```
prisma/
  schema.prisma        # data model
  migrations/          # committed migration history
  seed.ts              # upserts the default admin user
src/
  app/
    actions/           # server actions (auth, events, menu, category, orders, pdf)
    admin/             # host dashboard + /admin/e/[slug] event workspace
    e/[slug]/          # public guest ordering page
    api/auth/          # NextAuth route handler
    login/  signup/
  components/
    admin/             # menu tab, orders tab, settings tab, PDF report
    guest/             # guest menu client
    ui/                # shadcn components
  lib/                 # prisma client, zod schemas, utils
  auth.ts auth.config.ts middleware.ts
landing-page/          # static marketing site (separate git repo)
docker-compose.yml     # local Postgres on port 5433
```

---

## Getting started (fresh clone)

**Prerequisites:** Node.js 20+ (developed on 24), Docker (or any local/remote PostgreSQL 15).

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This runs Postgres 15 on **port 5433** with user `partyuser`, password `partypassword`, database `partyorder`.

### 3. Create `.env`

`.env` is gitignored, so a fresh clone has none. Create it in the project root:

```bash
DATABASE_URL="postgresql://partyuser:partypassword@localhost:5433/partyorder"
NEXTAUTH_SECRET="replace-me-with-a-random-string"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secret with `openssl rand -base64 32` (or `npx auth secret`).

### 4. Set up the database

```bash
npx prisma migrate dev
```

See [Prisma commands](#prisma-commands) below for what to run in every other situation.

### 5. Seed the admin user

```bash
npx prisma db seed
```

Creates / updates `admin@example.com` with password `adminpassword` — change these in `prisma/seed.ts` before using anywhere real.

### 6. Run the app

```bash
npm run dev
```

- Host dashboard: http://localhost:3000/admin
- Guest page: http://localhost:3000/e/&lt;event-slug&gt;

---

## Prisma commands

### Fresh start — new machine or empty database

Run these in order after `npm install` and creating `.env`:

```bash
docker compose up -d
```

```bash
npx prisma migrate dev
```

```bash
npx prisma db seed
```

`migrate dev` on an empty database applies every migration in `prisma/migrations/` and runs `prisma generate` for you, so no separate generate step is needed.

If the Prisma Client types look stale after a clone or a dependency install, regenerate them explicitly:

```bash
npx prisma generate
```

### After changing `schema.prisma`

Create and apply a new migration (this also regenerates the client):

```bash
npx prisma migrate dev --name describe_your_change
```

### After pulling someone else's migrations

```bash
npx prisma migrate deploy
```

```bash
npx prisma generate
```

### Wipe and rebuild the local database

Drops the database, replays all migrations and re-runs the seed. **Deletes all local data.**

```bash
npx prisma migrate reset
```

### Check migration state

```bash
npx prisma migrate status
```

### Browse the data

```bash
npx prisma studio
```

### Production / deployed database

Never run `migrate dev` or `migrate reset` against production. With `DATABASE_URL` pointing at the production database:

```bash
npx prisma migrate deploy
```

### Quick reference

| Situation | Command |
|---|---|
| Fresh clone, empty DB | `npx prisma migrate dev` then `npx prisma db seed` |
| Edited `schema.prisma` | `npx prisma migrate dev --name <change>` |
| Pulled new migrations | `npx prisma migrate deploy` + `npx prisma generate` |
| Client types out of sync | `npx prisma generate` |
| Start local DB over | `npx prisma migrate reset` |
| Inspect data | `npx prisma studio` |
| Deploy to prod | `npx prisma migrate deploy` |

---

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server on :3000 |
| `npm run build` | Production build |
| `npm start` | Production server on `$PORT` (used by Render) |
| `npm run lint` | ESLint |

---

## Deployment

The app is deployed on Render against a hosted Postgres instance. Required environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (set to the public URL). Run `npx prisma migrate deploy` as part of the release step so the deployed schema matches `prisma/migrations/`.

The `landing-page/` folder is a static site (HTML/CSS/JS, no build step) tracked in its own repository — [menurelay-landing-page](https://github.com/Bhimesh1/menurelay-landing-page).

---

Built by Bhimesh.
