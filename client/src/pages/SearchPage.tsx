import { useId, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import BusinessCard from '../components/BusinessCard'
import Icon, { type IconName } from '../components/Icons'
import { EmptyState, ErrorState, LoadingState } from '../components/LoadStates'
import { useApi } from '../hooks/useApi'
import type { BusinessSummary, Category } from '../api/types'

// Only true statements about what QueueLess does.
const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'calendar', title: 'Easy booking', text: 'Find and book services in seconds.' },
  { icon: 'bolt', title: 'Real-time availability', text: 'See up-to-date appointment slots.' },
  { icon: 'mail', title: 'Email updates', text: 'Get notified when bookings change.' },
]

// Business search with category and location filters.
// The filters live in the URL (?categoryId=1&location=beirut), so a search
// can be shared or bookmarked and the browser's Back button works.
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') ?? '')
  const [location, setLocation] = useState(searchParams.get('location') ?? '')
  const categoryFieldId = useId()
  const locationFieldId = useId()

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

  // Picking a category filters right away (no need to press Search).
  function handleCategoryChange(value: string) {
    setCategoryId(value)
    const next = new URLSearchParams(searchParams)
    if (value) next.set('categoryId', value)
    else next.delete('categoryId')
    setSearchParams(next)
  }

  function clearFilters() {
    setCategoryId('')
    setLocation('')
    setSearchParams(new URLSearchParams())
  }

  return (
    <div>
      {/* Hero: full width, photo on the right fading into the page color */}
      <section className="relative -mx-4 -mt-8 overflow-hidden sm:-mx-8 sm:-mt-12 lg:-mx-16">
        <img
          src="/images/hero.webp"
          alt=""
          className="absolute inset-y-0 right-0 h-full w-full object-cover md:w-3/5"
        />
        <div className="absolute inset-0 bg-surface/85 md:hidden" />
        <div className="absolute inset-0 hidden bg-linear-to-r from-surface from-40% via-surface/80 to-transparent md:block" />

        <div className="relative px-4 pt-12 pb-12 sm:px-8 lg:px-16 lg:pt-16">
          <h1 className="max-w-3xl text-4xl text-brand sm:text-5xl lg:text-[60px]">
            Your next appointment,
            <br />
            <span className="text-copper">made simple.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink">
            Book with clinics, barbershops, salons, trainers and consultants, all in one place.
          </p>

          <form
            role="search"
            onSubmit={handleSubmit}
            className="mt-8 grid max-w-5xl gap-2 rounded-2xl bg-card p-2 shadow-panel md:grid-cols-[1fr_1fr_auto] md:items-center md:divide-x md:divide-line"
          >
            <div className="flex items-center gap-4 px-4 py-2">
              <Icon name="grid" className="size-6 shrink-0 text-copper" />
              <div className="flex-1">
                <label htmlFor={categoryFieldId} className="block text-[13px] font-semibold text-ink">
                  Category
                </label>
                <select
                  id={categoryFieldId}
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-transparent py-1 text-[15px] text-ink"
                >
                  <option value="">All categories</option>
                  {categories.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 px-4 py-2">
              <Icon name="pin" className="size-6 shrink-0 text-copper" />
              <div className="flex-1">
                <label htmlFor={locationFieldId} className="block text-[13px] font-semibold text-ink">
                  Location
                </label>
                <input
                  id={locationFieldId}
                  placeholder="e.g. Beirut"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent py-1 text-[15px] text-ink placeholder:text-muted"
                />
              </div>
            </div>

            <div className="md:border-none md:pl-2">
              <button
                type="submit"
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-brand px-8 text-base font-semibold text-white transition-colors duration-200 hover:bg-brand-dark"
              >
                <Icon name="search" className="size-5" />
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      <section aria-labelledby="results-title" className="mt-12 sm:mt-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="results-title" className="text-[28px] text-brand sm:text-[38px]">
              Explore businesses
            </h2>
            <p className="mt-1 text-muted">Discover and book from trusted professionals near you.</p>
          </div>
          {results.data && results.data.length > 0 && (
            <p className="text-[15px] text-muted">
              {results.data.length} {results.data.length === 1 ? 'business' : 'businesses'} found
            </p>
          )}
        </div>

        {results.loading ? (
          <LoadingState label="Loading businesses…" />
        ) : results.error ? (
          <ErrorState error={results.error} onRetry={results.reload} />
        ) : results.data && results.data.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {results.data.map((business) => (
              <li key={business.id}>
                <BusinessCard business={business} />
              </li>
            ))}
          </ul>
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

      <section
        aria-label="Why QueueLess"
        className="mt-12 grid gap-8 rounded-lg border border-line bg-brand-soft p-8 sm:mt-16 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line"
      >
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-4 md:px-8">
            <Icon name={f.icon} className="size-10 shrink-0 text-copper" />
            <div>
              <h3 className="text-[22px] text-brand">{f.title}</h3>
              <p className="mt-1 text-[15px] text-muted">{f.text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
