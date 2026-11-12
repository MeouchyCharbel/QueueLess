import { Link } from 'react-router'
import Icon from './Icons'

// Calendar mark + "QueueLess" in forest green.
export default function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 text-2xl font-bold tracking-tight text-brand sm:text-[30px]"
      aria-label="QueueLess home"
    >
      <Icon name="calendar" className="size-7 text-copper sm:size-8" />
      QueueLess
    </Link>
  )
}
