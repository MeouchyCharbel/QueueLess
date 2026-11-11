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
