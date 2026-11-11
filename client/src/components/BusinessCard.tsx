import { Link } from 'react-router'
import type { BusinessSummary } from '../api/types'

// One search result. The whole card is a link to the business page.
export default function BusinessCard({ business }: { business: BusinessSummary }) {
  return (
    <Link
      to={`/businesses/${business.id}`}
      className="group flex h-full flex-col rounded-lg border border-line bg-card p-6 transition-shadow duration-200 hover:shadow-md"
    >
      <span className="w-fit rounded-full bg-accent px-2 py-1 text-xs font-semibold text-ink">
        {business.category.name}
      </span>
      <h2 className="mt-4 text-lg group-hover:text-brand">{business.name}</h2>
      <p className="mt-1 text-sm text-muted">
        {business.address}, {business.location}
      </p>
      <span className="mt-auto pt-4 text-sm font-semibold text-brand">View &amp; book →</span>
    </Link>
  )
}
