"use client"

import { useState, useEffect, useCallback }        from "react"
import Image from "next/image"
import axios, { type AxiosError }                  from "axios"
import {
  AlertCircle, ChevronDown, ExternalLink,
  RefreshCw, Receipt,
} from "lucide-react"
import { Card, CardContent }                       from "@/components/ui/card"
import { Skeleton }                                from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription }     from "@/components/ui/alert"
import { Button }                                  from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { fmtCurrency, fmtDate, fmtMonth, StatusBadge } from "@/components/tenant/ui-kit"
import type { TenantPayment, TenantHistoryResponse } from "@/types/tenant"

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-50 last:border-0">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <Skeleton className="h-3.5 w-36 rounded" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-4 w-14 rounded" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[45vh] text-center px-6">
      <div className="w-20 h-20 bg-gray-100 rounded-[20px] flex items-center justify-center mb-5">
        <Receipt className="w-9 h-9 text-gray-400" />
      </div>
      <h3 className="text-lg font-black tracking-tight text-gray-900 mb-2">No payment history yet</h3>
      <p className="text-sm text-gray-500 max-w-[260px] leading-relaxed">
        Your complete rent payment record will appear here after you make your first payment.
      </p>
    </div>
  )
}

function SummaryChips({ payments }: { payments: TenantPayment[] }) {
  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0)
  const pending   = payments.filter(p => p.status === "pending").length
  const overdue   = payments.filter(p => p.status === "overdue").length

  return (
    <div className="grid grid-cols-3 gap-2.5 mb-5">
      {[
        { label: "Total Paid",  value: fmtCurrency(totalPaid), valueClass: "text-emerald-600" },
        { label: "Pending",     value: String(pending),         valueClass: "text-amber-600"   },
        { label: "Overdue",     value: String(overdue),         valueClass: "text-red-600"     },
      ].map(item => (
        <div
          key={item.label}
          className="bg-white rounded-2xl border border-gray-200 px-3 py-3 text-center shadow-sm"
        >
          <p className={`text-[17px] font-black tracking-tight ${item.valueClass}`}>
            {item.value}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  )
}

function HistoryRow({ p, onClick }: { p: TenantPayment; onClick?: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div 
      className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex flex-col items-center justify-center shrink-0 gap-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 leading-none">
            {new Date(p.dueDate).toLocaleDateString("en-US", { month: "short" })}
          </p>
          <p className="text-[13px] font-black text-gray-700 leading-none mt-0.5">
            {new Date(p.dueDate).getFullYear().toString().slice(2)}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight">{fmtMonth(p.dueDate)}</p>

          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            {p.paidAt
              ? `Paid on ${fmtDate(p.paidAt)}`
              : p.reference
                ? `Ref: ${p.reference}`
                : p.status === "rejected"
                  ? "Payment rejected"
                  : "Awaiting verification"}
          </p>

          {p.status === "rejected" && p.rejectionReason && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="mt-1.5 text-left text-xs text-red-500 bg-red-50 border border-red-100
                rounded-lg px-2 py-1 leading-relaxed w-full transition-colors hover:bg-red-100"
            >
              <span className="font-bold">Reason: </span>
              {expanded
                ? p.rejectionReason
                : p.rejectionReason.length > 55
                  ? `${p.rejectionReason.slice(0, 55)}… `
                  : p.rejectionReason}
              {p.rejectionReason.length > 55 && (
                <span className="font-bold underline underline-offset-2">
                  {expanded ? "less" : "more"}
                </span>
              )}
            </button>
          )}

          {p.proofUrl && p.status !== "rejected" && (
            <a
              href={p.proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline
                underline-offset-2 mt-1"
            >
              View proof <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <p className="text-sm font-black text-gray-900 tabular-nums">
            {fmtCurrency(p.amount)}
          </p>
          <StatusBadge status={p.status} />
        </div>
      </div>
    </div>
  )
}

export default function TenantHistoryPage() {
  const LIMIT = 20

  const [payments,    setPayments]    = useState<TenantPayment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [page,        setPage]        = useState(1)
  const [total,       setTotal]       = useState(0)
  const [hasTenancy,  setHasTenancy]  = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<TenantPayment | null>(null)

  const fetchPage = useCallback(async (pg: number, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
    }
    try {
      const token = typeof window !== "undefined"
        ? sessionStorage.getItem("rl_access_token") : null
      const { data } = await axios.get<TenantHistoryResponse>(
        `/api/tenant/history?page=${pg}&limit=${LIMIT}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      setHasTenancy(data.hasTenancy)
      setTotal(data.total)
      setPayments(prev => append ? [...prev, ...data.payments] : data.payments)
    } catch (e) {
      const ae = e as AxiosError<{ error: string }>
      setError(ae.response?.data?.error ?? "Failed to load history.")
    } finally { 
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => { fetchPage(1) }, [fetchPage])

  function loadMore() {
    const next = page + 1
    setPage(next)
    fetchPage(next, true)
  }

  const hasMore = payments.length < total

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center h-14 px-4">
          <h1 className="text-base font-black text-gray-900 tracking-tight">History</h1>
        </div>
      </header>

      <div className="px-4 py-4 lg:px-8 lg:py-8 max-w-2xl mx-auto w-full">

        <div className="hidden lg:block mb-8">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Payment History</h1>
          <p className="text-sm text-gray-500 mt-1">Your complete rent payment record</p>
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm text-center">
                  <Skeleton className="h-5 w-14 mx-auto mb-1.5 rounded" />
                  <Skeleton className="h-2.5 w-16 mx-auto rounded" />
                </div>
              ))}
            </div>
            <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && error && (
          <div className="space-y-4">
            <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-2xl">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle className="font-bold">Unable to load history</AlertTitle>
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
            <Button
              onClick={() => fetchPage(1)}
              variant="outline"
              className="rounded-xl border-gray-200 gap-2 font-semibold"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          </div>
        )}

        {!loading && !error && (!hasTenancy || payments.length === 0) && <EmptyState />}

        {!loading && !error && payments.length > 0 && (
          <div className="space-y-4">
            <SummaryChips payments={payments} />

            <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-black text-gray-900 tracking-tight">All Payments</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{total} records total</p>
                </div>
              </div>
              <CardContent className="p-0">
                {payments.map(p => <HistoryRow key={p.id} p={p} onClick={() => setSelectedPayment(p)} />)}

                {hasMore && (
                  <div className="px-5 py-4 border-t border-gray-100">
                    <Button
                      onClick={loadMore}
                      disabled={loadingMore}
                      variant="outline"
                      className="w-full h-11 rounded-xl border-gray-200 font-semibold gap-2 text-gray-600"
                    >
                      {loadingMore ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" />Loading…</>
                      ) : (
                        <><ChevronDown className="w-4 h-4" />Load more ({total - payments.length} remaining)</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Sheet open={!!selectedPayment} onOpenChange={(v) => !v && setSelectedPayment(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedPayment && (
            <>
              <SheetHeader>
                <SheetTitle>Payment Details</SheetTitle>
                <SheetDescription>
                  Your payment information and proof
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Amount</p>
                    <p className="text-lg font-bold text-gray-900">{fmtCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                    <StatusBadge status={selectedPayment.status} />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Due Date</p>
                    <p className="text-sm font-semibold text-gray-900">{fmtDate(selectedPayment.dueDate)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Paid On</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedPayment.paidAt ? fmtDate(selectedPayment.paidAt) : "—"}
                    </p>
                  </div>
                </div>

                {selectedPayment.reference && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reference</p>
                    <p className="text-sm font-mono text-gray-900">{selectedPayment.reference}</p>
                  </div>
                )}

                {selectedPayment.status === "rejected" && selectedPayment.rejectionReason && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-700">{selectedPayment.rejectionReason}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Payment Proof</p>
                  {selectedPayment.proofUrl ? (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <Image
                        src={selectedPayment.proofUrl}
                        alt="Payment proof"
                        width={400}
                        height={300}
                        className="w-full h-auto max-h-[300px] object-contain bg-gray-50"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 p-8 text-center">
                      <p className="text-sm text-gray-400">No payment proof submitted</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
