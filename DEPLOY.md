# Deploy guide (free tier)

Three apps + one database:

| Piece | Host | Notes |
|---|---|---|
| PostgreSQL | **Neon** | Free serverless Postgres |
| API (Express) | **Render** | Docker web service (free) |
| Storefront (Next.js) | **Vercel** | Root dir `store-frontend` |
| Dashboard (Vite SPA) | **Vercel** | Root dir `dashboard` |
| Product images | **Cloudinary** | Required in prod (Render disk is ephemeral) |

> ⚠️ On Render free, the local-disk upload fallback does **not** persist across restarts. Configure **Cloudinary** before going live so uploads survive.

Deploy in this order so each piece has the URL it depends on.

---

## 1. Database — Neon

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`).
3. Keep it — it's the API's `DATABASE_URL`.

## 2. Cloudinary (images)

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. From the dashboard, note **Cloud name**, **API Key**, **API Secret**.

## 3. API — Render

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, point it at the repo. It reads `render.yaml` and creates the `boutique-api` Docker service (root `api/`).
3. Set these environment variables (Render dashboard → the service → Environment):
   - `DATABASE_URL` — the Neon string from step 1
   - `JWT_SECRET` — a long random string
   - `CORS_ORIGIN` — your Vercel storefront + dashboard URLs, comma-separated (fill in after step 4, then redeploy). Entries support `*` wildcards for one hostname segment, which you need because Vercel also serves per-deployment URLs (`<project>-<hash>-<scope>.vercel.app`). Example:
     `https://store-front-<scope>.vercel.app,https://store-front-*-<scope>.vercel.app,https://dashboard-<scope>.vercel.app,https://dashboard-*-<scope>.vercel.app`
   - `API_PUBLIC_URL` — the Render URL, e.g. `https://boutique-api.onrender.com`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — from step 2
4. First deploy runs `prisma migrate deploy` automatically (see `api/Dockerfile`), creating all tables.
5. **Seed** the admin + categories once: from Render's **Shell** tab run `npm run seed`, or run `npx prisma db seed` locally with `DATABASE_URL` pointed at Neon.
6. Health check: `https://<your-api>.onrender.com/health`.

> Render free services sleep after ~15 min idle (≈50s cold start). Keep it warm with a free cron at [cron-job.org](https://cron-job.org) hitting `/health` every 10 minutes.

## 4. Storefront — Vercel

1. **New Project** → import the repo.
2. **Root Directory**: `store-frontend`. Framework preset: **Next.js** (auto-detected).
3. Environment variables:
   - `NEXT_PUBLIC_API_URL` = `https://<your-api>.onrender.com/api/v1`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` = your number in international format (e.g. `8801XXXXXXXXX`)
4. Deploy. Note the URL (e.g. `https://boutique-store.vercel.app`).

## 5. Dashboard — Vercel

1. **New Project** → same repo, **Root Directory**: `dashboard`. Framework preset: **Vite**.
2. `vercel.json` (already in the repo) handles SPA routing.
3. Environment variable:
   - `VITE_API_URL` = `https://<your-api>.onrender.com/api/v1`
4. Deploy. Note the URL.

## 6. Wire it together

1. Go back to Render → API → `CORS_ORIGIN` and set it to the two Vercel URLs (comma-separated). Redeploy.
2. Test: open the storefront, place a COD order; open the dashboard, log in as admin (`admin@boutique.test` / `Admin@123` from the seed — **change this password**), approve a shop, and confirm an upload works.

---

## Production checklist

- [ ] Change the seeded admin password (and remove demo vendor/stores).
- [ ] `JWT_SECRET` is long and random (not the dev value).
- [ ] Cloudinary configured (uploads persist).
- [ ] `CORS_ORIGIN` lists only your real front-end URLs.
- [ ] Custom domain(s) added in Vercel; update `CORS_ORIGIN` + `NEXT_PUBLIC_API_URL` if the API gets a custom domain.
- [ ] Neon automated backups reviewed.
- [ ] (Later) Add Meta Pixel + GA4, courier + payment integrations, email notifications — these need your own accounts/keys.
