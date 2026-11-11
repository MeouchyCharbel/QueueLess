# QueueLess — Database schema (final)

PostgreSQL on Neon, managed with Prisma. Source of truth:
[`server/prisma/schema.prisma`](../server/prisma/schema.prisma) and its migration.
`→` marks a reference (foreign key); "1 → many" reads "one record has many".

```
User 1 → many Business        (ownerId)
User 1 → many Appointment     (customerId, "books")
Category 1 → many Business    (categoryId)
Business 1 → many Service, Staff, WorkingHours, Break, Appointment
Staff many ↔ many Service     (through StaffService)
Staff 1 → many WorkingHours, Break, Appointment
Service 1 → many Appointment
```

| Table | Fields (type) | References |
|---|---|---|
| **User** | id (int), name (text), email (text, unique), passwordHash (text), role (CUSTOMER \| OWNER), createdAt (timestamp) | — |
| **Category** | id (int), name (text, unique) | — |
| **Business** | id, ownerId, categoryId, name, location, address, phone, email, createdAt | ownerId → User, categoryId → Category |
| **Service** | id, businessId, name, price (decimal 10,2), durationMinutes (int), active (bool) | businessId → Business |
| **Staff** | id, businessId, name, active (bool) | businessId → Business |
| **StaffService** | staffId, serviceId (together the primary key) | staffId → Staff, serviceId → Service |
| **WorkingHours** | id, businessId?, staffId?, weekday (0 = Sun … 6 = Sat), startTime, endTime ("HH:MM") | businessId → Business **or** staffId → Staff |
| **Break** | same fields as WorkingHours | same as WorkingHours |
| **Appointment** | id, customerId, businessId, serviceId, staffId, status (PENDING \| CONFIRMED \| CANCELLED \| COMPLETED), startAt, endAt (timestamptz), createdAt, updatedAt | customerId → User, businessId → Business, serviceId → Service, staffId → Staff |

## Rules enforced by the database

- **No double bookings:** exclusion constraint `Appointment_no_overlap`. Two
  appointments for the same `staffId` whose `[startAt, endAt)` ranges overlap
  cannot both exist unless one is `CANCELLED`. The database checks it, so it
  holds even when two customers book at the same moment. Back-to-back
  appointments (one ends at 10:30, the next starts at 10:30) are allowed.
- `endAt` must be after `startAt`.
- Each WorkingHours / Break row belongs to exactly one of: the business, or one staff member.
- `email` is unique per user; category names are unique.

## Design choices

- Each owner manages one business (the API answers 409 to a second one).
- Each weekday has at most one opening period; lunch and similar gaps are breaks,
  and every break must sit inside that day's hours.
- Staff hours override business hours for that weekday; breaks from both apply.
  A staff member with no hours of their own works the business hours.
- Services and staff are deactivated (`active = false`) instead of deleted, so
  past appointments keep their history.
- A solo business is a business with one staff member.
