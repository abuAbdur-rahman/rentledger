"use client"

import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PaymentStatus } from "@/types/tenant"

export function fmtCurrency(n: number) {
  return `₦${n.toLocaleString()}`
}

export function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-US", {
    ...{ month: "short", day: "numeric", year: "numeric" },
    ...opts,
  })
}

export function fmtMonth(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export const STATUS = {
  paid: {
    label: "Paid",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
    cardTop: "border-t-emerald-500",
    cardGrad: "from-emerald-50/80 via-white to-white",
    amount: "text-emerald-700",
    dialogBg: "from-emerald-50 to-white",
  },
  pending: {
    label: "Due Soon",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="w-3 h-3" />,
    cardTop: "border-t-blue-500",
    cardGrad: "from-blue-50/80 via-white to-white",
    amount: "text-blue-700",
    dialogBg: "from-blue-50 to-white",
  },
  overdue: {
    label: "Overdue",
    badge: "bg-red-100 text-red-700 border-red-200",
    icon: <AlertTriangle className="w-3 h-3" />,
    cardTop: "border-t-red-500",
    cardGrad: "from-red-50/80 via-white to-white",
    amount: "text-red-600",
    dialogBg: "from-red-50 to-white",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-slate-100 text-slate-500 border-slate-200",
    icon: <XCircle className="w-3 h-3" />,
    cardTop: "border-t-slate-400",
    cardGrad: "from-slate-50/80 via-white to-white",
    amount: "text-slate-600",
    dialogBg: "from-slate-50 to-white",
  },
} satisfies Record<PaymentStatus, {
  label: string; badge: string; icon: React.ReactNode
  cardTop: string; cardGrad: string; amount: string; dialogBg: string
}>

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const s = STATUS[status]
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full border",
      "text-[10px] font-bold uppercase tracking-[0.06em]",
      s.badge,
    )}>
      {s.icon}
      {s.label}
    </span>
  )
}
