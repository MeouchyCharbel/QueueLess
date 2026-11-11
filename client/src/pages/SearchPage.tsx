import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import BusinessCard from '../components/BusinessCard'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import SelectField from '../components/SelectField'
import TextField from '../components/TextField'
import { EmptyState, ErrorState, LoadingState } from '../components/LoadStates'
import { useApi } from '../hooks/useApi'
import type { BusinessSummary, Category } from '../api/types'

// Business search with category and location filters.
// The filters live in the URL (?categoryId=1&location=beirut), so a search
// can be shared or bookmarked and the browser's Back button works.
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') ?? '')
  const [location, setLocation] = useState(searchParams.get('location') ?? '')

  const categories = useApi<Category[]>('/api/categories')
  const results = useApi<BusinessSummary[]>(`/api/businesses?${searchParams}`)
  const hasFilters = searchParams.has('categoryId') || searchParams.has('location')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const next = new URLSearchParams()
    if (categoryId) next.set('categoryId', categoryId)
    if (location.trim()) next.set('location', location.trim())
    setSearchParams(next)
  }

  function clearFilters() {
    setCategoryId('')
    setLocation('')
    setSearchParams(new URLSearchParams())
  }

  return (
    <div>
      <PageHeader
        title="Book your next appointment"
        subtitle="Find a barbershop, salon, clinic, trainer or consultant near you."
      />

      <form
        role="search"
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-lg border border-line bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <SelectField label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Location"
          placeholder="e.g. Beirut"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Button type="submit">Search</Button>
      </form>

      <section aria-label="Results" className="mt-8">
        {results.loading ? (
          <LoadingState label="Loading businesses…" />
        ) : results.error ? (
          <ErrorState error={results.error} onRetry={results.reload} />
        ) : results.data && results.data.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted">
              {results.data.length} {results.data.length === 1 ? 'business' : 'businesses'} found
            </p>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.data.map((business) => (
                <li key={business.id}>
                  <BusinessCard business={business} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState title={hasFilters ? 'No businesses match your filters' : 'No businesses yet'}>
            {hasFilters ? (
              <button type="button" onClick={clearFilters} className="font-medium text-brand hover:underline">
                Clear filters
              </button>
            ) : (
              <>
                Own a business?{' '}
                <Link to="/signup" className="font-medium text-brand hover:underline">
                  Sign up to take bookings
                </Link>
              </>
            )}
          </EmptyState>
        )}
      </section>
    </div>
  )
}
