// One function owns every request to the API, so these rules live in one place:
//   1. the base URL comes from config (VITE_API_URL), never hard-coded
//   2. the login token is added automatically
//   3. a bad status becomes a thrown ApiError with the server's message
//   4. a 401 on a logged-in request fires "auth:expired" so the app logs out

const API_URL = import.meta.env.VITE_API_URL

export const TOKEN_KEY = 'token'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)

  let res: Response
  try {
    res = await fetch(API_URL + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    })
  } catch {
    // fetch only rejects when no answer arrives at all (offline, server down).
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }

  if (res.status === 401 && token) {
    window.dispatchEvent(new Event('auth:expired'))
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`)
  }

  // 204 No Content has no body to read.
  return (res.status === 204 ? null : await res.json()) as T
}
