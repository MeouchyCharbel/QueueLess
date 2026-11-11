import { Link } from 'react-router'
import PageHeader from '../components/PageHeader'

// Shown for any URL that matches no page.
export default function NotFoundPage() {
  return (
    <div>
      <PageHeader title="Page not found" subtitle="The page you are looking for does not exist." />
      <Link to="/" className="font-medium text-brand underline-offset-4 hover:underline">
        Back to search
      </Link>
    </div>
  )
}
