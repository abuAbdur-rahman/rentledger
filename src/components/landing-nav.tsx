"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-gray-900 text-[1.0625rem]">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          RentLedger
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href="/auth/login" className="hidden md:block">
            <Button
              variant="outline"
              className="h-10 px-4 text-sm font-semibold rounded-lg border-blue-500 text-blue-600 hover:bg-blue-50 transition-all"
            >
              Login
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button
              variant="default"
              className="h-10 px-4 text-sm font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-blue-200"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
