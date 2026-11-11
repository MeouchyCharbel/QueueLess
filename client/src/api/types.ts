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
