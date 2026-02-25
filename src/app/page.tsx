import Link from "next/link";
import {
  Home,
  CreditCard,
  Users,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LandingNav } from "@/components/landing-nav";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  bullets: string[];
}

interface StepProps {
  num: string;
  title: string;
  description: string;
}

// ─── Sub-components (Server Components) ─────────────────────────────────────

function FeatureCard({
  icon,
  iconBg,
  title,
  description,
  bullets,
}: FeatureCardProps) {
  return (
    <Card className="group relative overflow-hidden border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 bg-white">
      {/* Top gradient bar on hover */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <CardHeader className="pb-0 pt-8 px-8">
        <div
          className={`w-14 h-14 rounded-[14px] flex items-center justify-center mb-6 ${iconBg}`}
        >
          {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-[0.9375rem] text-gray-500 leading-relaxed font-[Roboto,sans-serif]">
          {description}
        </p>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <ul className="mt-5 space-y-2">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Step({ num, title, description }: StepProps) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white text-lg font-extrabold flex items-center justify-center mx-auto mb-4">
        {num}
      </div>
      <h4 className="text-base font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-500 leading-relaxed font-[Roboto,sans-serif]">
        {description}
      </p>
    </div>
  );
}

// ─── Dashboard Preview (abstract illustration) ───────────────────────────────

function DashboardPreview() {
  return (
    <div className="max-w-5xl mx-auto px-6 pb-20">
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-[20px] p-8 shadow-xl flex flex-wrap gap-6 items-start justify-center relative overflow-hidden">
        {/* Decorative blob */}
        <div className="absolute top-[-60px] right-[-60px] w-56 h-56 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />

        {/* Revenue card */}
        <Card className="rounded-2xl border border-gray-200 shadow-md bg-white min-w-[180px] flex-1 max-w-[220px]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 leading-none">
                  Total Revenue
                </p>
                <p className="text-xs text-gray-400 mt-0.5">This month</p>
              </div>
            </div>
            <p className="text-2xl font-extrabold tracking-tight text-gray-900">
              ₦420,000
            </p>
            <Badge className="mt-2 text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-full">
              ↑ 12% vs last month
            </Badge>
          </CardContent>
        </Card>

        {/* Payments list card */}
        <Card className="rounded-2xl border border-gray-200 shadow-md bg-white min-w-[220px] flex-1 max-w-[280px]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 leading-none">
                  Recent Payments
                </p>
                <p className="text-xs text-gray-400 mt-0.5">All units</p>
              </div>
            </div>
            <div className="space-y-0 divide-y divide-gray-100">
              {[
                {
                  name: "Unit 4A · Emeka",
                  status: "Paid",
                  color: "bg-green-100 text-green-700",
                },
                {
                  name: "Unit 2B · Fatima",
                  status: "Pending",
                  color: "bg-amber-100 text-amber-700",
                },
                {
                  name: "Unit 1C · Chidi",
                  status: "Overdue",
                  color: "bg-red-100 text-red-700",
                },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="text-[0.8125rem] font-medium text-gray-700">
                    {row.name}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${row.color}`}
                  >
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Outstanding card */}
        <Card className="rounded-2xl border border-gray-200 shadow-md bg-white min-w-[180px] flex-1 max-w-[220px]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 leading-none">
                  Outstanding
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Needs attention</p>
              </div>
            </div>
            <p className="text-2xl font-extrabold tracking-tight text-gray-900">
              ₦85,000
            </p>
            <Badge className="mt-2 text-[10px] font-semibold bg-red-100 text-red-700 hover:bg-red-100 border-0 rounded-full">
              3 overdue units
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── PAGE ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-[Inter,sans-serif] antialiased">
      {/* ── Navigation ── */}
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden text-center px-6 pt-20 pb-16 md:pt-28 md:pb-20">
        {/* Background radial glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="mt-[-60px] w-[700px] h-[500px] bg-gradient-radial from-blue-100/60 via-violet-50/30 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Beta badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-600 text-[0.8125rem] font-semibold px-4 py-1.5 rounded-full mb-6 animate-[fadeUp_0.5s_ease_both]">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          Now in public beta
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-black tracking-[-0.03em] leading-[1.05] text-gray-900 mb-5 max-w-[700px] mx-auto">
          <span className="block">RentLedger</span>
          <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
            Smart rent tracking
          </span>
        </h1>

        {/* Tagline */}
        <p className="font-[Roboto,sans-serif] text-[clamp(1rem,2.5vw,1.25rem)] text-gray-500 max-w-[520px] mx-auto mb-10 leading-[1.7]">
          Smart rent tracking for landlords and tenants. Replace notebooks and
          WhatsApp threads with structured dashboards that just work.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center gap-3 flex-wrap mb-16">
          <Link href="/auth/register">
            <Button
              size="lg"
              className="h-[52px] px-7 text-base font-semibold rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white gap-2 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200 transition-all duration-150"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button
              variant="outline"
              size="lg"
              className="h-[52px] px-7 text-base font-semibold rounded-[10px] border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:-translate-y-0.5 transition-all duration-150"
            >
              Login to Account
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {[
            { num: "2K+", label: "Properties tracked" },
            { divider: true },
            { num: "98%", label: "On-time payments" },
            { divider: true },
            { num: "Zero", label: "Missed rent disputes" },
          ].map((item, i) =>
            item.divider ? (
              <div key={i} className="w-px h-9 bg-gray-200 hidden sm:block" />
            ) : (
              <div key={i} className="text-center">
                <p className="text-2xl font-extrabold tracking-tight text-gray-900">
                  {item.num}
                </p>
                <p className="text-[0.8125rem] text-gray-400 mt-0.5 font-[Roboto,sans-serif]">
                  {item.label}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* ── Dashboard Illustration ── */}
      <DashboardPreview />

      {/* ── Features ── */}
      <section className="bg-gray-50 px-6 py-20">
        <p className="text-center text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-blue-500 mb-3">
          What we offer
        </p>
        <h2 className="text-center text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-gray-900 mb-4">
          Everything you need to manage rent
        </h2>
        <p className="text-center font-[Roboto,sans-serif] text-[1.0625rem] text-gray-500 max-w-[480px] mx-auto mb-14 leading-[1.7]">
          From property setup to payment tracking — RentLedger handles it all so
          you can focus on what matters.
        </p>

        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Home className="w-7 h-7 text-blue-500" />}
            iconBg="bg-gradient-to-br from-blue-50 to-blue-100"
            title="Track Properties"
            description="Manage multiple properties and units from a single clean dashboard. Add tenants, set rent amounts, and track occupancy in seconds."
            bullets={[
              "Multi-property management",
              "Unit-level tracking",
              "Tenant assignment & history",
            ]}
          />
          <FeatureCard
            icon={<CreditCard className="w-7 h-7 text-violet-500" />}
            iconBg="bg-gradient-to-br from-violet-50 to-violet-100"
            title="Monitor Payments"
            description="Automatically track paid, pending, and overdue payments. See your total revenue and outstanding balances at a glance."
            bullets={[
              "Auto overdue detection",
              "Monthly revenue summary",
              "Full payment history",
            ]}
          />
          <FeatureCard
            icon={<Users className="w-7 h-7 text-green-600" />}
            iconBg="bg-gradient-to-br from-green-50 to-green-100"
            title="Reduce Disputes"
            description="Give tenants clear visibility into their rent status, due dates, and payment history. Transparency eliminates arguments."
            bullets={[
              "Tenant self-service portal",
              "Clear due date reminders",
              "Shared payment records",
            ]}
          />
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-6 py-20">
        <p className="text-center text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-blue-500 mb-3">
          How it works
        </p>
        <h2 className="text-center text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-gray-900 mb-4">
          Up and running in minutes
        </h2>
        <p className="text-center font-[Roboto,sans-serif] text-[1.0625rem] text-gray-500 max-w-[420px] mx-auto mb-14 leading-[1.7]">
          Four simple steps to replace your notebook forever.
        </p>

        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          <Step
            num="1"
            title="Create Account"
            description="Sign up as a landlord or tenant. Your role determines your dashboard experience."
          />
          <Step
            num="2"
            title="Add Properties"
            description="Landlords add properties, create units, and set monthly rent amounts and due dates."
          />
          <Step
            num="3"
            title="Assign Tenants"
            description="Link tenants to units. They instantly get access to their personal rent dashboard."
          />
          <Step
            num="4"
            title="Track Everything"
            description="Mark payments, view overdue status, and watch your financial dashboard update in real time."
          />
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative overflow-hidden bg-[#1E3A5F] px-6 py-20 text-center">
        {/* Blobs */}
        <div className="pointer-events-none absolute top-[-100px] right-[-100px] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-100px] left-[-100px] w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

        <h2 className="relative text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold text-white tracking-tight mb-4">
          Start tracking rent the right way
        </h2>
        <p className="relative font-[Roboto,sans-serif] text-[1.0625rem] text-white/60 max-w-[440px] mx-auto mb-10 leading-[1.7]">
          Join landlords and tenants who&apos;ve eliminated rent confusion for
          good. Free to get started.
        </p>
        <div className="relative flex items-center justify-center gap-3 flex-wrap">
          <Link href="/auth/register">
            <Button
              size="lg"
              className="h-[52px] px-7 text-base font-bold rounded-[10px] bg-white text-gray-900 hover:bg-gray-50 gap-2 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-white/20 transition-all duration-150"
            >
              <ArrowRight className="w-4 h-4" />
              Get Started Free
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button
              variant="outline"
              size="lg"
              className="h-[52px] px-7 text-base font-semibold rounded-[10px] border-2 border-white/25 text-white/85 bg-transparent hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-150"
            >
              Login to Account
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-gray-900"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            RentLedger
          </Link>

          {/* Copyright */}
          <p className="text-[0.8125rem] text-gray-400 font-[Roboto,sans-serif]">
            © {new Date().getFullYear()} RentLedger. All rights reserved.
          </p>

          {/* Links */}
          <div className="hidden md:flex gap-6">
            {["Privacy", "Terms", "Support"].map((link) => (
              <Link
                key={link}
                href="#"
                className="text-[0.8125rem] text-gray-400 hover:text-gray-700 transition-colors font-[Roboto,sans-serif]"
              >
                {link}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
