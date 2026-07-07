# RentNest Backend API

Rental property marketplace backend — Node.js + Express + TypeScript + PostgreSQL (Prisma) + JWT + Stripe.

## Tech Stack
- Node.js + Express
- TypeScript
- PostgreSQL + Prisma ORM
- JWT authentication
- Stripe (Checkout Sessions + Webhooks)
- Zod (validation)

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Setup environment variables
Copy `.env.example` to `.env` and fill in real values:
```bash
cp .env.example .env
```

Free PostgreSQL options: [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app).

Get Stripe test keys from https://dashboard.stripe.com/test/apikeys.

### 3. Setup database
```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```
This creates the admin, a demo landlord, and a demo tenant (see credentials below).

### 4. Run locally
```bash
npm run dev
```
Server runs at `http://localhost:5000`.

### 5. Build for production
```bash
npm run build
npm start
```

## Seeded Credentials
| Role     | Email                  | Password    |
|----------|-------------------------|-------------|
| Admin    | admin@rentnest.com      | admin123    |
| Landlord | landlord@rentnest.com   | landlord123 |
| Tenant   | tenant@rentnest.com     | tenant123   |

(Change `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env` before seeding if you want different admin credentials.)

## API Overview

All responses follow this shape:
```json
{ "success": true, "message": "...", "errorDetails": null, "data": {} }
```
Errors:
```json
{ "success": false, "message": "...", "errorDetails": [...] }
```

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (auth required)

### Public
- `GET /api/properties?city=&minPrice=&maxPrice=&categoryId=&bedrooms=&page=&limit=`
- `GET /api/properties/:id`
- `GET /api/categories`

### Landlord (auth + LANDLORD role)
- `POST /api/landlord/properties`
- `PUT /api/landlord/properties/:id`
- `DELETE /api/landlord/properties/:id`
- `GET /api/landlord/requests`
- `PATCH /api/landlord/requests/:id` (body: `{ "status": "APPROVED" | "REJECTED" }`)

### Tenant - Rentals (auth + TENANT role)
- `POST /api/rentals`
- `GET /api/rentals`
- `GET /api/rentals/:id`

### Payments (auth + TENANT role)
- `POST /api/payments/create` (body: `{ "rentalRequestId": "..." }`) → returns Stripe Checkout URL
- `POST /api/payments/confirm` (body: `{ "sessionId": "..." }`)
- `GET /api/payments`
- `GET /api/payments/:id`
- `POST /api/payments/webhook` (Stripe webhook, raw body — configure in Stripe dashboard)

### Reviews (auth + TENANT role)
- `POST /api/reviews` (only after a COMPLETED rental)

### Admin (auth + ADMIN role)
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id` (body: `{ "status": "ACTIVE" | "BANNED" }`)
- `GET /api/admin/properties`
- `GET /api/admin/rentals`
- `POST /api/admin/categories`

## Deployment
- **Render** (recommended for a real Postgres + long-running Node server): connect GitHub repo, set env vars, build command `npm run build`, start command `npm start`. Run `npx prisma migrate deploy && npx prisma db seed` once via Render's shell.
- **Vercel**: works too but needs serverless adaptation; Render is simpler for this stack.

## Notes for Grading
- Structured error responses: see `src/middleware/errorHandler.ts`
- Input validation: Zod schemas in `src/validations/`, applied via `src/middleware/validate.ts`
- Role-based access: `src/middleware/auth.ts` (`authenticate`, `authorize`)
- Payment: Stripe Checkout Sessions, status tracked in `Payment` model (`PENDING` → `COMPLETED`/`FAILED`)
