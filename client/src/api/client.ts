// Requests go to /api on the *same origin* as the website.
// Local Vite and production Vercel proxy /api to the Express server.
// The browser sends an HttpOnly session cookie; JavaScript never reads JWTs.
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }

  // Failed login attempts and the initial session check are not a logout event.
  if (res.status === 401 && !['/api/auth/login', '/api/auth/signup', '/api/auth/me'].includes(path)) {
    window.dispatchEvent(new Event('auth:expired'))
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`)
  }

  return (res.status === 204 ? null : await res.json()) as T
}
