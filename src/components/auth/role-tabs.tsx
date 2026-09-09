"use client";

import { Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type UserRole = "landlord" | "tenant";

interface RoleTabsProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
}

const roles: { value: UserRole; label: string; icon: React.ReactNode }[] = [
  {
    value: "landlord",
    label: "Landlord",
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    value: "tenant",
    label: "Tenant",
    icon: <User className="w-4 h-4" />,
  },
];

export function RoleTabs({ value, onChange }: RoleTabsProps) {
  return (
    <div
      role="tablist"
      className="flex bg-gray-100 rounded-[10px] p-1 gap-1"
      aria-label="Select account type"
    >
      {roles.map((role) => (
        <button
          key={role.value}
          role="tab"
          type="button"
          aria-selected={value === role.value}
          onClick={() => onChange(role.value)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl",
            "text-sm font-semibold transition-all duration-200",
            "min-h-[44px]",
            value === role.value
              ? "bg-white text-blue-600 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-700 hover:bg-white/50",
          )}
        >
          {role.icon}
          {role.label}
        </button>
      ))}
    </div>
  );
}
