"use client"

interface PageHeaderProps {
  title: string
  subtitle?: string
  user: {
    name: string
    email: string
    role: "landlord" | "tenant"
  }
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-black tracking-[-0.025em] text-gray-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-0.5 font-[Roboto,sans-serif]">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
