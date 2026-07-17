# Boutique Marketplace

A multi-vendor e-commerce marketplace for Bangladesh (backpacks, purses, imitation
jewelry, cosmetics, clothing, footwear). Vendors run their own shops; customers
shop across all shops with a single guest checkout.

## Stack

| Layer | Tech |
|---|---|
| Storefront | Next.js (App Router) + TypeScript *(coming next)* |
| Admin + Vendor dashboard | React + Vite + TypeScript *(coming next)* |
| API | Express + TypeScript |
| ORM / DB | Prisma + PostgreSQL |
| Auth | JWT (httpOnly cookie) + bcrypt, role-based (super_admin / vendor) |
| Dev infra | Docker Compose (Postgres + Adminer) |

Customers are **not** authenticated — cart lives in the browser, checkout is guest,
and orders are tracked by order number + phone. The only logins are **super admin**
and **vendor**.

## Prerequisites

- Node.js >= 20
- Docker Desktop

## Quick start

```bash
# 1. Install dependencies (all workspaces)
npm install

# 2. Start Postgres (+ Adminer DB UI on http://localhost:8080)
npm run db:up

# 3. Generate Prisma client, run migrations, seed demo data
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Run the API (http://localhost:4000)
npm run dev:api
```

Health check: http://localhost:4000/health

### Seeded logins

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@boutique.test | Admin@123 |
| Vendor | vendor@boutique.test | Vendor@123 |

## Project layout

```
/api            Express + Prisma API
/packages/*     Shared code (added as needed)
/store-frontend Next.js storefront (coming next)
/dashboard      React admin + vendor panel (coming next)
docker-compose.yml
```

## API overview (v1, prefix `/api/v1`)

- `POST /auth/register` — vendor sign-up (creates a pending shop)
- `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`
- `GET /categories` · admin CRUD
- `GET /shops` · `GET /shops/:slug` · vendor `GET/PATCH /shops/me` · admin `GET /shops/admin`, `PATCH /shops/admin/:id/status`
- `GET /products` (filters) · `GET /products/slug/:slug` · vendor `GET /products/mine`, `POST/PATCH/DELETE`
- `POST /orders/checkout` (splits into per-shop sub-orders) · `GET /orders/track`
- vendor `GET /orders/vendor/mine`, `PATCH /orders/vendor/suborders/:id` · admin `GET /orders/admin/all`
