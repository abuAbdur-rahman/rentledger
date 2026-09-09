import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Terms of Service — RentLedger",
  description: "Terms of Service for RentLedger.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-gray-600 hover:text-gray-900 -ml-2"
          >
            <Link href="/auth/register">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className="prose prose-sm max-w-none">
          <h1 className="text-2xl font-black text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-500 text-sm mb-8">Last updated: February 2026</p>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              By accessing and using RentLedger, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Description of Service</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              RentLedger is a property management platform that helps landlords manage their rental properties, 
              tenants track payments, and facilitates rent collection and verification.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. User Accounts</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Users are responsible for maintaining the confidentiality of their account credentials. 
              You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Privacy Policy</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Your privacy is important to us. Please review our{" "}
              <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link> 
              {" "}which also governs your use of the service.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Limitation of Liability</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              RentLedger shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages resulting from your use of or inability to use the service.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Contact Information</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through the app.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
