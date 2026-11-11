import { Link } from 'react-router'

// "Queue" in white and "Less" in tangerine, on the charcoal header.
export default function Logo() {
  return (
    <Link to="/" className="text-xl font-bold tracking-tight text-white" aria-label="QueueLess home">
      Queue<span className="text-accent">Less</span>
    </Link>
  )
}
