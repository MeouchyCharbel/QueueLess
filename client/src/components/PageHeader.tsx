// Title (and optional line of explanation) at the top of a page.
type PageHeaderProps = {
  title: string
  subtitle?: string
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
    </div>
  )
}
