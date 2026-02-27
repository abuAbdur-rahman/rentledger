import type { Metadata } from "next"
import { Suspense } from "react"
import { AuthCard } from "@/components/auth/auth-card"
import { LoginForm } from "@/components/auth/login-form"
import { Loader2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Log In — RentLedger",
  description: "Log in to your RentLedger account to manage your properties.",
}

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your RentLedger account"
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkHref="/auth/register"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}
