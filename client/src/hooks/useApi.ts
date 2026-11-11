import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../api/client'

// Loads data from one API path and tracks the three states every page needs:
// loading, error and data. `reload()` fetches again (after a change).
// Passing null as the path waits (for example until a choice is made).
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(path !== null)

  // useCallback keeps the same function between renders, so the effect
  // below only runs again when the path changes (no endless requests).
  const load = useCallback(() => {
    if (path === null) return
    setLoading(true)
    setError(null)
    apiFetch<T>(path)
      .then(setData, setError)
      .finally(() => setLoading(false))
  }, [path])

  // Fetching is a side effect, so it belongs in useEffect. load() sets the
  // loading state right away so the page shows "Loading…" for the new path;
  // this is intended, so the linter's general warning is switched off here.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    load()
  }, [load])

  return { data, error, loading, reload: load }
}
