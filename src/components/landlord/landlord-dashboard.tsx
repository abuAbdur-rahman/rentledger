import { SummaryCards } from "@/components/dashboard/summary-cards"
import { RecentPayments } from "@/components/dashboard/recent-payments"
import { QuickActions } from "@/components/dashboard/quick-actions"
import type { DashboardSummary } from "@/services/dashboard"

interface LandlordDashboardProps {
  summary: DashboardSummary | null
  loading?: boolean
}

export function LandlordDashboard({ summary, loading }: LandlordDashboardProps) {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Here&apos;s your property overview.
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} loading={loading} />

      {/* Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentPayments payments={summary?.recentPayments ?? null} loading={loading} />
      </div>
    </div>
  )
}
