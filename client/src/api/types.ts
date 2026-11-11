// Shapes of the data the QueueLess API sends back (see README > API routes).

export type Role = 'CUSTOMER' | 'OWNER'

export type User = {
  id: number
  name: string
  email: string
  role: Role
}

export type AuthResponse = {
  token: string
  user: User
}

export type Category = {
  id: number
  name: string
}

// One result of GET /api/businesses (search)
export type BusinessSummary = {
  id: number
  name: string
  location: string
  address: string
  category: Category
}

export type ServiceSummary = {
  id: number
  name: string
  price: number
  durationMinutes: number
}

export type StaffSummary = {
  id: number
  name: string
  serviceIds: number[] // services this person performs
}

// GET /api/businesses/:id (public business page)
export type BusinessDetail = BusinessSummary & {
  categoryId: number
  phone: string
  email: string
  services: ServiceSummary[]
  staff: StaffSummary[]
}

// One free time from GET /api/businesses/:id/availability
export type Slot = {
  startAt: string // ISO date-time
  endAt: string
}

export type Availability = {
  date: string
  timezone: string
  slots: Slot[]
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

// An appointment as the API returns it (POST/GET/PATCH /api/appointments)
export type Appointment = {
  id: number
  status: AppointmentStatus
  startAt: string
  endAt: string
  createdAt: string
  updatedAt: string
  business: { id: number; name: string; location: string; address: string; phone: string; email: string }
  service: ServiceSummary
  staff: { id: number; name: string }
  customer: { id: number; name: string; email: string }
}

// ---- Owner setup (GET /api/businesses/mine) ----

export type TimeRange = {
  weekday: number // 0 = Sunday ... 6 = Saturday
  startTime: string // "HH:MM"
  endTime: string
}

export type Schedule = {
  hours: TimeRange[]
  breaks: TimeRange[]
}

export type OwnerService = ServiceSummary & { active: boolean }

export type OwnerStaff = Schedule & {
  id: number
  name: string
  active: boolean
  serviceIds: number[]
}

export type BusinessProfile = {
  name: string
  categoryId: number
  location: string
  address: string
  phone: string
  email: string
}

export type OwnerBusiness = BusinessProfile &
  Schedule & {
    id: number
    category: Category
    services: OwnerService[]
    staff: OwnerStaff[]
  }
