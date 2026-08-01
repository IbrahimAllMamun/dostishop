# CLAUDE.md — Frontend Website Rules

## Always Do First
- **Invoke the `ui-ux-pro-max-skill` and `frontend-ui-animator`skill** before writing any frontend code, every session, no exceptions.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so. **Use the headless harness below — the browser-pane screenshot tool times out on this machine.**

## Output Defaults
- Mobile-first responsive

## Brand Assets
- Always check the `brand_assets/` folder before designing. It may contain logos, color guides, style guides, or images.
- If assets exist there, use them. Do not use placeholders where real assets are available.
- If a logo is present, use it. If a color palette is defined, use those exact values — do not invent brand colors.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color


# Dosti Shop — working notes

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
- **PowerShell is not always an available tool.** When it isn't, use Bash (Git Bash).
  `node` is on PATH there; `head`/`cat` sometimes are not.

---

## Screenshots & visual verification

The **browser-pane screenshot tool times out on this machine** (the accessibility
tree, `read_page` and `javascript_tool` all work fine — only pixel capture hangs).
Do not read that timeout as "the page is broken".

Take screenshots with the headless harness instead:

```bash
export CHROME_PATH="C:/Users/User/AppData/Local/Google/Chrome/Application/chrome.exe"
node ~/.claude/skills/scroll-film-studio/scripts/shot.js <url> <out.png> [w] [h] [scroll]
```

**`CHROME_PATH` is mandatory here.** Chrome is a *per-user* install
(`%LOCALAPPDATA%\Google\Chrome\...`), and `shot.js` only probes the two
`Program Files` locations — neither of which exists on this machine, so it exits
with "no Chrome/Chromium found" unless the variable is set. It is set for you in
`.claude/settings.json` → `env`; export it manually if you are outside that.
(Don't patch `shot.js` — it is third-party and a skill update would overwrite it.)

It prints JSON on success (`ready`, `innerWidth`, `scrollY`, `docHeight`, `canvas`)
and warns loudly when a requested scroll position was not reached or the viewport
was zero-width — that is how you tell "page didn't mount" from "the design is dark".

Pixels are for *comparison*; for **assertions** prefer `javascript_tool` to read
computed styles and `getBoundingClientRect()` geometry. Several bugs this session —
the drawer trapped inside the 66px header, the card button escaping its image box —
were found by measuring, not by looking.

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
