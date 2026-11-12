import { Link } from 'react-router'
import Icon from './Icons'
import { categoryLook } from '../lib/categoryImages'
import type { BusinessSummary } from '../api/types'

const BUTTON = 'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors duration-200'

// One search result: category photo with badge, name, address, and two
// links to the business page ("Book now" jumps straight to the booking form).
export default function BusinessCard({ business }: { business: BusinessSummary }) {
  const look = categoryLook(business.category.name)

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-card shadow-card">
      <div className="relative h-40">
        <img src={look.image} alt="" loading="lazy" className="size-full object-cover" />
        <span className="absolute bottom-2 left-4 flex items-center gap-1 rounded-full bg-card px-2 py-1 text-[13px] font-semibold text-ink">
          <Icon name={look.icon} className="size-4 text-copper" />
          {business.category.name}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[22px] text-brand">{business.name}</h3>
        <p className="mt-2 flex items-start gap-2 text-[15px] text-muted">
          <Icon name="pin" className="mt-1 size-4 shrink-0 text-copper" />
          {business.address}, {business.location}
        </p>

        <div className="mt-auto flex gap-2 pt-4">
          <Link to={`/businesses/${business.id}`} className={`${BUTTON} border border-line text-ink hover:border-brand`}>
            View details
          </Link>
          <Link to={`/businesses/${business.id}#booking`} className={`${BUTTON} bg-brand text-white hover:bg-brand-dark`}>
            <Icon name="calendar" className="size-4" />
            Book now
          </Link>
        </div>
      </div>
    </article>
  )
}
