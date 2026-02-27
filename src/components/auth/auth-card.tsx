import Link from "next/link";
import { Home } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
}

export function AuthCard({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthCardProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50/30 to-violet-50/20 flex flex-col items-center justify-center px-4 py-12">
      {/* Background decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-15%] right-[-10%] w-125 h-125 bg-blue-200/25 rounded-full blur-3xl" />
        <div className="absolute bottom-[-15%] left-[-10%] w-125 h-125 bg-violet-200/20 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2.5 font-bold text-gray-900 text-[1.0625rem] mb-8 hover:opacity-80 transition-opacity"
      >
        <div className="w-9 h-9 rounded-[10px] bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-md shadow-blue-200">
          <Home className="w-5 h-5 text-white" />
        </div>
        RentLedger
      </Link>

      {/* Card */}
      <Card className="w-full max-w-[420px] rounded-[16px] border border-gray-200/80 shadow-xl shadow-gray-200/60 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-2 pt-8 px-8 space-y-1">
          <h1 className="text-[1.5rem] font-black tracking-[-0.025em] text-gray-900">
            {title}
          </h1>
          <p className="text-sm text-gray-500 font-[Roboto,sans-serif] leading-relaxed">
            {subtitle}
          </p>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-6">{children}</CardContent>
      </Card>

      {/* Footer link */}
      <p className="mt-6 text-sm text-gray-500 font-[Roboto,sans-serif]">
        {footerText}{" "}
        <Link
          href={footerLinkHref}
          className="font-semibold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline transition-colors"
        >
          {footerLinkText}
        </Link>
      </p>
    </div>
  );
}
