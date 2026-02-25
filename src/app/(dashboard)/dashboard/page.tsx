import { TopBar } from "@/components/dashboard/top-bar"
import { LandlordDashboard } from "@/components/landlord/landlord-dashboard"
import { TenantDashboard } from "@/components/tenant/tenant-dashboard"
import { dashboardService } from "@/services/dashboard"
import { getUser } from "@/services/user"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const userData = await getUser()
  const role = userData?.role || "tenant"
  const userId = userData?.id || null

  const topBarUser = {
    name: userData?.full_name || "User",
    email: userData?.email || "",
    role,
  }

  let summary = null

  if (role === "landlord" && userId) {
    const result = await dashboardService.getLandlordSummary(userId)
    summary = result.data
  }

  return (
    <>
      <TopBar title="Dashboard" user={topBarUser} notificationCount={0} />
      {role === "landlord" ? (
        <LandlordDashboard summary={summary} />
      ) : (
        <TenantDashboard />
      )}
    </>
  )
}
