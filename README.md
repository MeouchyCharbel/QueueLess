# QueueLess

QueueLess lets customers book appointments online and gives small businesses
(barbershops, salons, clinics, trainers, consultants) one place to manage them.
Its core is an availability engine that only shows valid time slots and blocks
conflicting bookings on the server.

**Team:** Elie Antoine Mehanna Gaagea (240405), Charbel Meouchy (242309)

## Live app

| | URL |
|---|---|
| Website | https://queue-less-sand-two.vercel.app |
| API | https://queueless-api-nawz.onrender.com/api/health |

The API runs on Render's free plan, which sleeps after 15 minutes without
traffic: the first request after that can take up to a minute.

## Features

**Customers**
- Sign up and log in; see and change only their own appointments
- Search businesses by category and location
- Book by service, staff member, date and a free time (only valid times are shown)
- Dashboard of upcoming and past appointments; cancel or reschedule

**Business owners**
- Business setup: profile, weekly working hours and breaks, services (price,
  duration) and staff (who performs which service, own hours); solo businesses
  are a business with one staff member
- Dashboard with day and week views to confirm, cancel, reschedule and
  complete appointments

**Platform**
- Availability engine: free times respect working hours, breaks, service
  length and existing bookings, in Beirut time
- No double bookings, even when two customers book at the same moment
  (checked by the server and enforced by a PostgreSQL exclusion constraint)
- Email notifications (Resend) for bookings, cancellations and reschedules
- Responsive design for mobile and desktop

## Tech stack

| Part | Technology |
|---|---|
| Front end | React 19, TypeScript, React Router, Tailwind CSS, Vite — deployed on Vercel |
| Back end | Node.js, Express 5, REST API — deployed on Render |
| Database | PostgreSQL on Neon, Prisma ORM |
| Auth & security | HttpOnly SameSite JWT cookies (bearer API compatibility), bcrypt, zod, server-side roles, helmet, CORS, rate limiting |
| Third-party API | Resend (email) |
| Tests | Vitest + Testing Library (front end), Vitest + Supertest (back end) |

## Architecture

```
Browser (React app on Vercel)
   │  fetch /api + HttpOnly session cookie
   ▼
Vercel same-origin API rewrite
   │
   ▼
Express API on Render
   helmet → cors (only the website) → JSON body limit → rate limits
   → routes → requireAuth (who are you?) → requireRole (are you allowed?)
   → zod validation → Prisma
   │                                   │
   ▼                                   ▼
PostgreSQL on Neon                Resend (emails)
```

- **Separation of concerns:** `client/` and `server/` are separate programs
  with their own `package.json`, `.env` and tests. The client only talks to the
  server through `client/src/api/client.ts`.
- **Server layout:** `src/routes/` (one file per resource), `src/middleware/`
  (auth, roles, validation, rate limits), `src/lib/` (availability engine,
  time zone math, ownership checks, emails), `prisma/` (schema, migrations, seed).
- **Client layout:** `src/pages/` (one per screen), `src/components/`
  (reusable UI and feature components), `src/auth/` (login state shared through
  context), `src/hooks/useApi.ts` (loading / error / data for every request).
- **Security:** passwords are hashed with bcrypt and never returned; every
  query is scoped to the logged-in user (another user's data answers 404);
  inputs are validated and trimmed with zod and unknown fields are dropped;
  secrets live only in `.env` files and the hosts' settings, never in git.

## Repository layout

```
QueueLess/
├── client/   # React front end (Vite, TypeScript, Tailwind CSS)
├── server/   # Express REST API (Prisma, PostgreSQL)
└── docs/     # Wireframes and database schema
```

## Running the API locally

Requires Node.js 20+ and a PostgreSQL database (we use a free Neon project).

```bash
cd server
npm install
cp .env.example .env        # then fill in the real values
npm run db:migrate          # creates the tables
npm run db:seed             # adds the business categories
npm run dev                 # http://localhost:3000/api/health
```

### Back-end tests

```bash
cd server
npm test          # Vitest + Supertest
```

`server/tests/appointments.test.js` checks booking conflicts, account isolation,
authorization and cookie protection. It creates/deletes temporary test records,
so it refuses to run unless `DATABASE_URL` names an isolated `queueless_test`
database and `QUEUELESS_ALLOW_TEST_WRITES=yes` is explicitly set. **Never run
integration tests against production**. The GitHub Actions CI workflow creates
an ephemeral PostgreSQL 16 test database, applies migrations and runs these
checks automatically without any production credentials.

## Running the front end locally

Start the API first (see above), then in a second terminal:

```bash
cd client
npm install
cp .env.example .env        # Vite proxies /api to localhost:3000
npm run dev                 # http://localhost:5173
```

### Front-end tests

```bash
cd client
npm test          # Vitest + Testing Library, no server needed
```

`client/src/components/BookingForm.test.tsx` checks that the booking form only
offers staff who perform the chosen service, keeps "Confirm booking" disabled
until a free time is picked, sends the right booking to the API, and shows the
error when the time was just taken (409). The API is replaced by a fake.

The design ("Forest Green & Sand") is defined once, as role-named tokens, in
`client/src/index.css`: forest green `#203D30` (buttons, links), warm ivory
`#F7F4EF` (background), sand gold `#B79A6B` and copper `#A47A3D` (icons and
accents only, too light for body text), text `#202824` / `#626A66`, borders
`#E7E2DA`. Headings use Georgia, everything else Inter (bundled with the site).
Businesses show a generic photo for their category (`client/public/images/`).

Design documents: [wireframes](docs/wireframes.md) and [database schema](docs/schema.md).

## API routes

All bodies are JSON. 🔒 = requires HttpOnly session cookie (browser) or `Authorization: Bearer <token>` (API);
**owner** = 🔒 and the account role must be `OWNER`.

| Method | Path | Access | Success | Errors |
|---|---|---|---|---|
| GET | `/api/health` | public | 200 | — |
| POST | `/api/auth/signup` | public | 201 `{ token, user }` | 400, 409, 429 |
| POST | `/api/auth/login` | public | 200 `{ token, user }` | 400, 401, 429 |
| GET | `/api/auth/me` | 🔒 | 200 user | 401 |
| POST | `/api/auth/logout` | public | 204, clears browser session cookie | 403 |
| GET | `/api/categories` | public | 200 list | — |
| GET | `/api/businesses?categoryId=&location=` | public | 200 list (bookable businesses only; location matches city or address) | 400 |
| GET | `/api/businesses/:id` | public | 200 business + active services and staff | 404 |
| GET | `/api/businesses/:id/availability?serviceId=&staffId=&date=YYYY-MM-DD` | public | 200 `{ date, timezone, slots }` | 400, 404 |
| POST | `/api/appointments` | customer | 201 appointment (PENDING) | 400, 403, 404, 409 |
| GET | `/api/appointments?from=&to=` | 🔒 | 200 own list (customer) or business list (owner) | 400 |
| PATCH | `/api/appointments/:id` | 🔒 | 200 appointment | 400, 403, 404, 409 |
| POST | `/api/businesses` | owner | 201 business | 400, 403, 409 |
| GET | `/api/businesses/mine` | owner | 200 business + services, staff, hours | 404 |
| PATCH | `/api/businesses/:id` | owner | 200 business | 400, 404 |
| PUT | `/api/businesses/:id/hours` | owner | 200 `{ hours, breaks }` | 400, 404 |
| POST | `/api/businesses/:id/services` | owner | 201 service | 400, 404 |
| PATCH | `/api/services/:id` | owner | 200 service | 400, 404 |
| POST | `/api/businesses/:id/staff` | owner | 201 staff | 400, 404 |
| PATCH | `/api/staff/:id` | owner | 200 staff | 400, 404 |
| PUT | `/api/staff/:id/hours` | owner | 200 `{ hours, breaks }` | 400, 404 |

Example bodies:

```jsonc
// POST /api/auth/signup
{ "name": "Sara", "email": "sara@example.com", "password": "at-least-8", "role": "CUSTOMER" }
// POST /api/businesses
{ "name": "Fade Studio", "categoryId": 1, "location": "Beirut", "address": "Hamra St",
  "phone": "+961 1 234 567", "email": "hello@fade.example" }
// PUT /api/businesses/:id/hours   (weekday: 0 = Sunday ... 6 = Saturday)
{ "hours":  [{ "weekday": 1, "startTime": "09:00", "endTime": "18:00" }],
  "breaks": [{ "weekday": 1, "startTime": "13:00", "endTime": "14:00" }] }
// POST /api/businesses/:id/services
{ "name": "Haircut", "price": 15, "durationMinutes": 30 }
// POST /api/businesses/:id/staff
{ "name": "Rami", "serviceIds": [1, 2] }
// POST /api/appointments   (startAt must be one of the free slots)
{ "businessId": 1, "serviceId": 1, "staffId": 1, "startAt": "2026-11-20T07:00:00.000Z" }
// PATCH /api/appointments/:id   (one change per request)
{ "status": "CANCELLED" }          // customer or owner
{ "status": "CONFIRMED" }          // owner: PENDING -> CONFIRMED
{ "status": "COMPLETED" }          // owner: CONFIRMED -> COMPLETED
{ "startAt": "2026-11-21T08:00:00.000Z" }   // reschedule
```

### Email notifications (Resend)

Booking, cancelling and rescheduling an appointment sends a plain-text email
to the customer and to the business's contact email, through the
[Resend](https://resend.com) API (`server/src/lib/notifications.js`). Emails
are sent after the response, and a failed email is logged without failing
the booking. Without `RESEND_API_KEY` the server prints the emails to the
terminal instead. With the default sender `onboarding@resend.dev`, Resend
only delivers to the address that owns the Resend account; a verified domain
removes that limit.

Appointment status flow: a booking starts as `PENDING`; the owner confirms it
(`CONFIRMED`) and later marks it `COMPLETED`; either side can cancel an active
appointment (customers only before it starts). When a customer reschedules,
the appointment goes back to `PENDING` for the owner to confirm.

Another owner's business, service or staff member is answered with 404,
exactly like one that does not exist.

### Availability engine

`server/src/lib/availability.js` offers a start time (every 15 minutes) only
when the whole appointment fits inside that weekday's working hours, misses
every break, does not overlap another active appointment of the same staff
member, and starts in the future. Business hours are read in Beirut time
(`APP_TIMEZONE`), including the summer/winter clock change. Booking uses the
same check, and a PostgreSQL exclusion constraint blocks double bookings even
when two customers book at the same moment.

## Build steps

Each step is one commit. Milestones are marked with git tags.

1. Repository setup
2. Express server scaffold
3. Database schema, migration and seed — **milestone-1**
4. Authentication: signup, login, JWT, role checks
5. Business setup API: profile, working hours, services, staff
6. Business search API: category and location filters
7. Availability engine: free time slots
8. Appointments API: book, list, confirm, cancel, complete, reschedule
9. Email notifications with Resend
10. Back-end test: overlapping bookings are rejected — **milestone-2**
11. Front-end scaffold: Vite, React, TypeScript, Tailwind, routing
12. Front-end auth: API client, login and signup pages, protected pages
13. Search page and business page
14. Booking flow: service, staff member, date, free time
15. Customer dashboard: view, cancel, reschedule
16. Owner business setup: profile, hours and breaks, services, staff
17. Owner dashboard: day and week views, confirm, cancel, reschedule, complete
18. Front-end test: the booking form — **milestone-3**
19. Deployment: API on Render, website on Vercel — **milestone-4**
20. Final README and fresh-clone check — **final**

## Deployment

| | Render (API) | Vercel (website) |
|---|---|---|
| Root directory | `server` | `client` |
| Build | `npm install && npm run build` (runs `prisma migrate deploy` and the seed) | Vite preset (`npm run build`) |
| Start | `npm start` | static files; `vercel.json` sends every path to `index.html` |
| Settings | `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `CLIENT_ORIGIN` (the website URL, no trailing slash) | `/api` proxied through `client/vercel.json`; no browser API URL secret required |

Every push to `main` redeploys both. Health check: `/api/health`.

### Browser authentication (Fix #3)

The updated React client uses same-origin `/api` requests and **does not store JWTs
in localStorage**. Express sets a one-hour, HttpOnly, SameSite=Lax session cookie
restricted to `/api`. Production cookies are Secure (HTTPS only). Browser requests
are forwarded from Vercel to Render by the **first rewrite** in
`client/vercel.json`. Local Vite proxies `/api` to `http://localhost:3000`.
An origin check protects authenticated state-changing requests using cookies.

For safe rollout, the Express API temporarily continues returning a bearer token
on login/signup so the older frontend remains compatible while deployments
are updated. The new browser frontend ignores that token. Rotate any compromised
JWT or database secrets before production deployment. Validate login, refresh,
logout, and booking on a preview deployment before merging to `main`.
