"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  History,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const landlordNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/account", label: "Account", icon: User },
];

const tenantNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/account", label: "Account", icon: User },
];

export function BottomNav({ role }: { role?: "landlord" | "tenant" }) {
  const pathname = usePathname();

  const navItems = role === "tenant" ? tenantNav : landlordNav;

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 lg:hidden">
      <div className="max-w-md mx-auto flex items-center justify-between gap-1 px-1 py-1 bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-2xl shadow-xl shadow-gray-200/50">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center px-2 py-1.5 rounded-xl flex-1",
                "transition-all duration-200",
                isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
              )}
            >
              <Icon className={cn("w-4 h-4", isActive && "text-blue-500")} />
              <span
                className={cn(
                  "text-[0.5rem] font-medium mt-0.5 truncate max-w-full",
                  isActive ? "text-blue-600" : "text-gray-500",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
