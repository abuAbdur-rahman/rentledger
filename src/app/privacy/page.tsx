import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy — RentLedger",
  description: "Privacy Policy for RentLedger.",
};

export default function PrivacyPage() {
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
          <h1 className="text-2xl font-black text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mb-8">Last updated: February 2026</p>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Introduction</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              At RentLedger, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Information We Collect</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-2">
              We may collect personal information that you voluntarily provide when using RentLedger, including:
            </p>
            <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
              <li>Name and contact information (email, phone number)</li>
              <li>Account credentials</li>
              <li>Property and tenancy information</li>
              <li>Payment and transaction data</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. How We Use Your Information</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We use the information we collect to: provide, maintain, and improve our services; 
              process your transactions; send you technical notices and support messages; 
              and communicate with you about products, services, and events.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Data Security</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your 
              personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Third-Party Services</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We may use third-party service providers to help us operate our business. 
              These parties have access to your personal information only to perform these services.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Your Rights</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              You have the right to access, update, or delete your personal information at any time. 
              You may also opt out of receiving communications from us.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">7. Contact Us</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through the app.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
