# Boutique BD / Dosti Shop — working notes

Multi-vendor marketplace for Bangladesh (bags, jewelry, cosmetics, clothing, footwear).
npm workspaces monorepo. `README.md` covers setup; this file covers the things that
are **not** obvious from the code and have already cost time.

| Workspace | Stack | Dev port |
|---|---|---|
| `api/` | Express + Prisma + TypeScript | 4000 |
| `store-frontend/` | Next.js 15 App Router (customer storefront) | 3000 |
| `dashboard/` | React 19 + Vite (admin + vendor panels) | 5174 |
| Postgres (Docker) | `docker compose up -d db` | host **15432** → container 5432 |

Start with `npm run dev:api` / `dev:store` / `dev:dashboard` (also declared in
`.claude/launch.json`).

---

## ⚠️ Environment: local dev currently writes to production

`api/.env` has `DATABASE_URL` pointing at the **Render (production) Postgres**. The
local Docker URL is commented out on the line above it. So running the app locally —
or running the seed — mutates live data. Swap the two lines to work against Docker.

Treat that credential as live: it is gitignored, and `.claude/settings.json` denies
reading `.env` files.

---

## Dev-loop traps (all hit at least once)

- **Stop the API before any Prisma migration.** The running server holds
  `query_engine-windows.dll.node`, so `prisma generate` fails with `EPERM`.
- **`prisma migrate dev` refuses to run non-interactively.** When it does, hand-write
  the SQL into `api/prisma/migrations/<timestamp>_<name>/migration.sql`, then
  `npx prisma migrate deploy && npx prisma generate`.
- **Never run `npm run build:store` while `dev:store` is running.** They share
  `store-frontend/.next`; the prod build corrupts it and the dev server starts
  throwing `Cannot find module './<id>.js'`. Fix: stop dev, delete `.next`, restart.
  For a quick check use `npx tsc --noEmit` instead of a build.
- **PowerShell 5.1 mangles UTF-8.** `Get-Content -Raw` reads as ANSI, so `·` → `Â·`
  and `└` → `â””` when written back. For any bulk edit use
  `[System.IO.File]::ReadAllText($p,[System.Text.Encoding]::UTF8)` and
  `WriteAllText` with `UTF8Encoding($false)`.
- **Git commit messages with quotes break PS arg-passing.** Write the message to a
  file and use `git commit -F <file>`.
- **`python3` is the Microsoft Store stub on this machine** — use `python`.
- Browser-pane screenshots time out here; verify with `read_page` /
  `javascript_tool` (measuring computed styles and geometry is more rigorous anyway).

---

## Frontend constraints

- **Both frontends are on Tailwind v3.4.** Do not upgrade casually.
- **Pin `shadcn@2.10.0` when adding components.** The current (v4) CLI emits
  v4-only utilities (`ring-3`, `in-data-*`, `has-data-*`, `color-mix`) that Tailwind
  3.4 *silently drops* — components look subtly broken with no error. The v4 `init`
  also rewrites `index.css` with v4 imports and a neutral palette.
- **shadcn lives in `dashboard/` only.** The storefront's hand-built look is a brand
  asset; keep it out of there.
- In the dashboard, shadcn semantics won: **`muted` is a surface, `muted-foreground`
  is secondary text.** Tokens are mapped to the brand in `dashboard/src/index.css`
  (`--primary` = clay rose `#A24B5F`, `--accent` = sand, not gold).
- `dashboard/vite.config.ts` sets `envPrefix` to expose **both** `VITE_*` and
  `NEXT_PUBLIC_*`, because the Vercel setup uses the latter.
- **`MenuDrawer` must not use `useSearchParams`** — it pushed the header into a
  permanent Suspense fallback. It also **must portal to `document.body`**: the
  header's `backdrop-blur` makes it the containing block for `position: fixed`, which
  previously trapped the drawer inside the 66px header. Same rule applies to
  `QuickView` and any future overlay.
- i18n is **hand-rolled and cookie-based** (`src/i18n/`), not next-intl. Server
  components use `getT()`, client components `useT()`. Add every new string to both
  `en` and `bn`.

---

## Domain rules

- **Customers never authenticate.** Cart and wishlist are localStorage; checkout is
  guest; orders are tracked by order number + phone. Only `SUPER_ADMIN` and `VENDOR`
  log in.
- **One checkout → one `Order` → N `SubOrder`s, one per shop.** Commission is
  computed and stored on the sub-order at sale time; payouts settle delivered,
  unsettled sub-orders via `SubOrder.payoutId`.
- **`OrderItem` snapshots product name and unit price.** Never render historical
  orders through current product records.
- **Checkout is idempotent** (`Order.idempotencyKey`) and stock decrement is
  conditional (`updateMany … stockQty >= qty`) so concurrent checkouts cannot
  oversell. Preserve both if you touch `checkout`.
- **Categories are capped at two levels.** Vendors may *create* categories and
  subcategories; only admins rename/move/delete. Filtering by a parent category is
  child-inclusive.
- **A product's `categoryId` can be null** — deleting a category nulls it. Any
  category-based logic needs a fallback (see `getRelatedProducts`).
- Vendor API routes must always be scoped by the caller's `shopId`; that isolation is
  a security boundary, not a UI nicety.

---

## Expectations when working here

- **Verify against something real**, not just a typecheck: hit the API, or drive the
  page and read computed values. Several bugs in this codebase passed typecheck and
  build while being visibly broken.
- Keep the seed (`api/prisma/seed.ts`) idempotent — it is safe to re-run and
  reproduces 11 shops / 100+ products deterministically.
- Seeded logins: `admin@boutique.test` / `Admin@123`, vendors `*@boutique.test` /
  `Vendor@123` or `Store@123`. Change these before going live.
- Deployment notes and the production checklist live in `DEPLOY.md`. `CORS_ORIGIN`
  supports `*` wildcards so one entry covers Vercel's per-deployment URLs.
