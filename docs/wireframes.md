# QueueLess — Wireframes (low-fi)

Every main screen of the must-have features, and how users move between them.

## Screen flow

```
                         ┌──────────────┐
                         │  Search (/)  │◄──────────── public start page
                         └──────┬───────┘
                                │ pick a business
                                ▼
┌──────────┐   not logged in  ┌──────────────────────────┐
│  Login   │◄─────────────────│ Business page + booking  │
│  Signup  │─────────────────►│ /businesses/:id          │
└────┬─────┘   back to page   └──────────┬───────────────┘
     │                                   │ booking confirmed
     │ role = CUSTOMER                   ▼
     ├──────────────────────►┌──────────────────────────┐
     │                       │ My appointments          │
     │                       │ /appointments            │
     │                       └──────────────────────────┘
     │ role = OWNER
     └──────────────────────►┌──────────────────────────┐   ┌──────────────────────┐
                             │ Owner dashboard          │◄─►│ Business setup       │
                             │ /owner  (day | week)     │   │ /owner/setup         │
                             └──────────────────────────┘   └──────────────────────┘
```

Protected routes: `/appointments` (customers), `/owner` and `/owner/setup` (owners).
Logged-out users are sent to Login; the wrong role is sent to their own home page.

---

## 1. Search — `/`

```
┌───────────────────────────────────────────────────────────┐
│ QueueLess                         [Log in]  [Sign up]      │
├───────────────────────────────────────────────────────────┤
│  Book your next appointment                               │
│  [ Category ▼ ]  [ Location ________ ]  [ Search ]         │
│                                                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Fade Studio │ │ Glow Salon  │ │ City Clinic │          │
│  │ Barbershop  │ │ Salon       │ │ Clinic      │          │
│  │ Beirut      │ │ Jounieh     │ │ Beirut      │          │
│  │  [View]     │ │  [View]     │ │  [View]     │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  (empty state: "No businesses match your filters")        │
└───────────────────────────────────────────────────────────┘
Mobile: filters stack vertically, cards become one column.
```

## 2. Business page + booking — `/businesses/:id`

```
┌───────────────────────────────────────────────────────────┐
│ Fade Studio · Barbershop · Beirut · 01 234 567            │
├───────────────────────────────────────────────────────────┤
│ 1. Service      ( ) Haircut  30 min  $15                  │
│                 ( ) Beard    15 min  $8                   │
│ 2. Staff        [ Rami ▼ ]  (only staff who do service 1) │
│ 3. Date         [ 2026-11-20 📅 ]                         │
│ 4. Time         [09:00] [09:30] [10:30] [11:00] ...       │
│                 (only free slots are shown)               │
│                                     [ Confirm booking ]   │
│ (loading / "No free times on this day" / error + Retry)   │
└───────────────────────────────────────────────────────────┘
```

## 3. Login / Signup — `/login`, `/signup`

```
┌──────────────────────────┐   ┌──────────────────────────────┐
│ Log in                   │   │ Create account               │
│ Email    [__________]    │   │ Name     [__________]        │
│ Password [__________]    │   │ Email    [__________]        │
│ (Invalid email or pass.) │   │ Password [__________] 8+     │
│ [ Log in ]               │   │ I am a  (•) Customer ( ) Owner│
│ No account? Sign up      │   │ [ Sign up ]                  │
└──────────────────────────┘   └──────────────────────────────┘
```

## 4. My appointments (customer) — `/appointments`

```
┌───────────────────────────────────────────────────────────┐
│ My appointments                                            │
├───────────────────────────────────────────────────────────┤
│ Upcoming                                                   │
│  Fri 20 Nov · 10:00  Haircut with Rami · Fade Studio       │
│  Status: Confirmed           [Reschedule] [Cancel]         │
│ Past / cancelled (read only)                               │
│ (empty state: "No appointments yet — find a business")     │
└───────────────────────────────────────────────────────────┘
Reschedule opens the same date + free-time picker as booking.
```

## 5. Owner dashboard — `/owner`

```
┌───────────────────────────────────────────────────────────┐
│ Fade Studio          [ Day | Week ]   ◄  Fri 20 Nov  ►      │
├───────────────────────────────────────────────────────────┤
│ Day view                                                   │
│  09:00  Haircut · Sara K. · Rami     PENDING               │
│         [Confirm] [Reschedule] [Cancel]                    │
│  10:00  Beard · Ali M. · Rami        CONFIRMED             │
│         [Complete] [Reschedule] [Cancel]                   │
│                                                           │
│ Week view: 7 columns (Mon..Sun), appointments listed       │
│ under each day; on mobile the days stack vertically.       │
└───────────────────────────────────────────────────────────┘
```

## 6. Business setup (owner) — `/owner/setup`

```
┌───────────────────────────────────────────────────────────┐
│ [Profile] [Hours & breaks] [Services] [Staff]   (tabs)     │
├───────────────────────────────────────────────────────────┤
│ Profile:  name, category, location, address, phone, email  │
│ Hours:    Mon [09:00]-[18:00]  break [13:00]-[14:00]  ...  │
│ Services: name · price · duration · active   [+ Add]       │
│ Staff:    name · services they do ☑ · active  [+ Add]      │
│           (solo business = one staff member: the owner)    │
└───────────────────────────────────────────────────────────┘
```
