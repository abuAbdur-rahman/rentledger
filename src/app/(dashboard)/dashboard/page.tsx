import { TopBar } from "@/components/dashboard/top-bar"
import { LandlordDashboard } from "@/components/landlord/landlord-dashboard"
import { TenantDashboard } from "@/components/tenant/tenant-dashboard"
import { getUser } from "@/services/user"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const userData = await getUser()
  const role = userData?.role || "tenant"
  
  const topBarUser = {
    name: userData?.full_name || "User",
    email: userData?.email || "",
    role,
  }

  return (
    <>
      <TopBar title="Dashboard" user={topBarUser} notificationCount={0} />
      {role === "landlord" ? (
        <LandlordDashboard />
      ) : (
        <TenantDashboard />
      )}
    </>
  )
}
