import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { EmptyState, ErrorState, LoadingState } from '../components/LoadStates'
import { useApi } from '../hooks/useApi'
import { ApiError } from '../api/client'
import BookingForm from '../components/BookingForm'
import Icon from '../components/Icons'
import { categoryLook } from '../lib/categoryImages'
import type { BusinessDetail } from '../api/types'

// Public business page: profile, the booking form (services, staff, date,
// free times) and the team.
export default function BusinessPage() {
  const { id } = useParams()
  const { data: business, error, loading, reload } = useApi<BusinessDetail>(`/api/businesses/${id}`)
  const { hash } = useLocation()

  // "Book now" links end with #booking: scroll to the form once it is on screen.
  useEffect(() => {
    if (!loading && business && hash === '#booking') {
      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [loading, business, hash])

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

  const look = categoryLook(business.category.name)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link to="/" className="text-sm font-medium text-brand hover:underline">
        ← Back to search
      </Link>

      <header className="overflow-hidden rounded-lg border border-line bg-card shadow-card">
        <img src={look.image} alt="" className="h-48 w-full object-cover sm:h-64" />
        <div className="p-6 sm:p-8">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-1 text-[13px] font-semibold text-ink">
            <Icon name={look.icon} className="size-4 text-copper" />
            {business.category.name}
          </span>
          <h1 className="mt-4 text-3xl text-brand sm:text-[38px]">{business.name}</h1>
          <p className="mt-2 flex items-start gap-2 text-muted">
            <Icon name="pin" className="mt-1 size-4 shrink-0 text-copper" />
            {business.address}, {business.location}
          </p>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-medium">
            <a href={`tel:${business.phone}`} className="text-brand hover:underline">
              {business.phone}
            </a>
            <a href={`mailto:${business.email}`} className="text-brand hover:underline">
              {business.email}
            </a>
          </p>
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <section
          id="booking"
          aria-labelledby="booking-title"
          className="scroll-mt-8 rounded-lg border border-line bg-card p-6 shadow-card"
        >
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
