import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState, LoadingState } from '../components/LoadStates'
import { useApi } from '../hooks/useApi'
import { ApiError } from '../api/client'
import BookingForm from '../components/BookingForm'
import type { BusinessDetail } from '../api/types'

// Public business page: profile, the booking form (services, staff, date,
// free times) and the team.
export default function BusinessPage() {
  const { id } = useParams()
  const { data: business, error, loading, reload } = useApi<BusinessDetail>(`/api/businesses/${id}`)

  if (loading) return <LoadingState label="Loading business…" />

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState title="Business not found">
        <Link to="/" className="font-medium text-brand hover:underline">
          Back to search
        </Link>
      </EmptyState>
    )
  }
  if (error || !business) return <ErrorState error={error ?? new Error('Something went wrong')} onRetry={reload} />

  return (
    <div className="space-y-8">
      <Link to="/" className="text-sm font-medium text-brand hover:underline">
        ← Back to search
      </Link>

      <header className="rounded-lg bg-ink p-6 text-white sm:p-8">
        <span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold text-ink">
          {business.category.name}
        </span>
        <h1 className="mt-4 text-3xl">{business.name}</h1>
        <p className="mt-2 text-white/80">
          {business.address}, {business.location}
        </p>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href={`tel:${business.phone}`} className="hover:text-accent">
            {business.phone}
          </a>
          <a href={`mailto:${business.email}`} className="hover:text-accent">
            {business.email}
          </a>
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <section aria-labelledby="booking-title" className="rounded-lg border border-line bg-card p-6">
          <h2 id="booking-title" className="mb-6 text-xl">
            Book an appointment
          </h2>
          <BookingForm business={business} />
        </section>

        <section aria-labelledby="team-title" className="h-fit rounded-lg border border-line bg-card p-6">
          <h2 id="team-title" className="text-xl">
            Team
          </h2>
          <ul className="mt-4 space-y-2">
            {business.staff.map((member) => (
              <li key={member.id} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
                >
                  {member.name.charAt(0).toUpperCase()}
                </span>
                {member.name}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
