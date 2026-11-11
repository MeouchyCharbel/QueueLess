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

## Build steps

Each step is one commit. Milestones are marked with git tags.

1. Repository setup
2. Express server scaffold
3. Database schema, migration and seed — **milestone-1**
4. Authentication: signup, login, JWT, role checks
