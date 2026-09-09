import type { Metadata } from "next"
import { AuthCard } from "@/components/auth/auth-card"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = {
  title: "Create Account — RentLedger",
  description:
    "Sign up to RentLedger and start tracking rent payments professionally.",
}

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Join thousands of users managing properties"
      footerText="Already have an account?"
      footerLinkText="Log in"
      footerLinkHref="/auth/login"
    >
      <RegisterForm />
    </AuthCard>
  )
}
