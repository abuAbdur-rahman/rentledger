import Link              from "next/link"
import { Receipt, ArrowRight } from "lucide-react"
import { Card, CardContent }   from "@/components/ui/card"
import { Skeleton }            from "@/components/ui/skeleton"
import { fmtCurrency, fmtDate, fmtMonth, StatusBadge } from "@/components/tenant/ui-kit"
import type { TenantPayment } from "@/types/tenant"

export function MiniPaymentListSkeleton() {
  return (
    <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <Skeleton className="h-4 w-36 rounded" />
        <Skeleton className="h-3.5 w-16 rounded" />
      </div>
      <CardContent className="p-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 last:border-0">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Skeleton className="h-4 w-14 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function EmptyPayments() {
  return (
    <div className="py-12 text-center">
      <span className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Receipt className="w-5 h-5 text-gray-400" />
      </span>
      <p className="text-sm font-bold text-gray-700 mb-1">No payment records yet</p>
      <p className="text-xs text-gray-400">History will appear here after your first payment.</p>
    </div>
  )
}

export function MiniPaymentList({ payments }: { payments: TenantPayment[] }) {
  return (
    <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-black text-gray-900 tracking-tight">Recent Payments</h2>
          {payments.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">Last {payments.length} records</p>
          )}
        </div>
        <Link
          href="/history"
          className="flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <CardContent className="p-0">
        {payments.length === 0 ? <EmptyPayments /> : (
          <div>
            {payments.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0
                  hover:bg-gray-50/60 transition-colors"
              >
                <span className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black text-gray-500">
                  {new Date(p.dueDate).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 leading-tight truncate">
                    {fmtMonth(p.dueDate)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {p.paidAt
                      ? `Paid ${fmtDate(p.paidAt)}`
                      : p.reference
                        ? `Ref: ${p.reference}`
                        : "Awaiting verification"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <p className="text-sm font-black text-gray-900 tabular-nums">
                    {fmtCurrency(p.amount)}
                  </p>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
