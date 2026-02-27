import type { Metadata } from "next"
import { AuthCard } from "@/components/auth/auth-card"
import { LoginForm } from "@/components/auth/login-form"

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
      <LoginForm />
    </AuthCard>
  )
}
