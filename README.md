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
├── client/   # React front end (added in step 11)
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
```

Another owner's business, service or staff member is answered with 404,
exactly like one that does not exist.

## Build steps

Each step is one commit. Milestones are marked with git tags.

1. Repository setup
2. Express server scaffold
3. Database schema, migration and seed — **milestone-1**
4. Authentication: signup, login, JWT, role checks
5. Business setup API: profile, working hours, services, staff
