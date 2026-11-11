# QueueLess

QueueLess lets customers book appointments online and gives small businesses
(barbershops, salons, clinics, trainers, consultants) one place to manage them.
Its core is an availability engine that only shows valid time slots and blocks
conflicting bookings on the server.

**Team:** Elie Antoine Mehanna Gaagea (240405), Charbel Meouchy (242309)

> This README grows with the project. Setup, features, tech stack and
> architecture sections are completed as each part is built.

## Repository layout

```
QueueLess/
├── client/   # React front end (Vite, TypeScript, Tailwind CSS)
├── server/   # Express REST API
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

`server/tests/appointments.test.js` checks that the API rejects overlapping
bookings for the same staff member, allows back-to-back bookings, and lets only
one of two simultaneous bookings win. It runs against the database in
`DATABASE_URL`, creates its own test data, deletes it afterwards, and never
sends real emails.

## Running the front end locally

Start the API first (see above), then in a second terminal:

```bash
cd client
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:3000
npm run dev                 # http://localhost:5173
```

Colors come from the brand palette and are defined once, as role-named
tokens, in `client/src/index.css`: Charcoal Black `#21232E` (text, header),
Royal Blue `#105BFF` (links, buttons) and Tangerine Orange `#FE8900`
(accents only, since it is too light for text on white).

Design documents: [wireframes](docs/wireframes.md) and [database schema](docs/schema.md).

## API routes

All bodies are JSON. 🔒 = needs `Authorization: Bearer <token>`;
**owner** = 🔒 and the account role must be `OWNER`.

| Method | Path | Access | Success | Errors |
|---|---|---|---|---|
| GET | `/api/health` | public | 200 | — |
| POST | `/api/auth/signup` | public | 201 `{ token, user }` | 400, 409, 429 |
| POST | `/api/auth/login` | public | 200 `{ token, user }` | 400, 401, 429 |
| GET | `/api/auth/me` | 🔒 | 200 user | 401 |
| GET | `/api/categories` | public | 200 list | — |
| GET | `/api/businesses?categoryId=&location=` | public | 200 list (bookable businesses only) | 400 |
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
