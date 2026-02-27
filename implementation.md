```ts
// =============================================================================
// fullpage.ts — RentLedger Tenant Screens
// Screen 8: Tenant Dashboard  (/dashboard)
// Screen 9: Tenant History    (/dashboard/history)
//
// HOW TO USE:
// Each section is wrapped in /* PATH: path/to/file.ts ... */ comments.
// Copy the content of each block into the corresponding file in your project.
// Blocks are self-contained — imports inside each block are as they'd appear
// in the real file.
// =============================================================================

export {}

// =============================================================================
// ─── TYPES ────────────────────────────────────────────────────────────────────
// PATH: types/tenant.ts
// =============================================================================
/*
export type PaymentStatus = "paid" | "pending" | "overdue" | "rejected"

export interface TenantRentInfo {
  tenancyId:            string
  unitLabel:            string
  propertyName:         string
  propertyAddress:      string
  rentAmount:           number
  nextDueDate:          string   // ISO — next billing date
  daysUntilDue:         number   // negative means already overdue
  currentPaymentStatus: PaymentStatus
  currentPaymentId:     string | null
}

export interface TenantPayment {
  id:              string
  amount:          number
  status:          PaymentStatus
  dueDate:         string   // ISO
  paidAt:          string | null
  reference:       string | null
  proofUrl:        string | null
  rejectionReason: string | null
}

export interface TenantDashboardResponse {
  hasTenancy:     boolean
  rentInfo:       TenantRentInfo | null
  recentPayments: TenantPayment[]   // last 5
}

export interface TenantHistoryResponse {
  hasTenancy: boolean
  payments:   TenantPayment[]
  total:      number
  page:       number
  limit:      number
}
*/

// =============================================================================
// ─── API ROUTE: TENANT DASHBOARD (GET + POST) ─────────────────────────────────
// PATH: app/api/tenant/dashboard/route.ts
// =============================================================================
/*
import { NextRequest, NextResponse } from "next/server"
import { createClient }              from "@supabase/supabase-js"
import type {
  TenantDashboardResponse,
  TenantRentInfo,
  TenantPayment,
  PaymentStatus,
} from "@/types/tenant"

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getAuthedTenant(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return null
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "tenant") return null
  return user
}

function deriveStatus(dbStatus: string, dueDate: string): PaymentStatus {
  if (dbStatus === "paid")     return "paid"
  if (dbStatus === "rejected") return "rejected"
  return new Date(dueDate) < new Date() ? "overdue" : "pending"
}

function nextDueDate(dueDay: number) {
  const now = new Date()
  let d = new Date(now.getFullYear(), now.getMonth(), dueDay)
  if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, dueDay)
  return d
}

// ── GET /api/tenant/dashboard ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await getAuthedTenant(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // 1. Active tenancy
    const { data: tenancy } = await sb
      .from("tenancies")
      .select(`
        id, rent_amount, due_day,
        units!inner(
          id, unit_number,
          properties!inner(id, name, address)
        )
      `)
      .eq("tenant_id", user.id)
      .eq("status", "active")
      .single()

    if (!tenancy) {
      return NextResponse.json(
        { hasTenancy: false, rentInfo: null, recentPayments: [] } satisfies TenantDashboardResponse
      )
    }

    const unit     = (tenancy as any).units
    const property = unit?.properties
    const due      = nextDueDate((tenancy as any).due_day ?? 1)
    const now      = new Date()
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / 86_400_000)

    // 2. Current month's payment record
    const som = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const { data: current } = await sb
      .from("payments")
      .select("id, status, due_date")
      .eq("tenancy_id", tenancy.id)
      .gte("due_date", som).lte("due_date", eom)
      .single()

    const currentStatus: PaymentStatus = current
      ? deriveStatus(current.status, current.due_date)
      : daysUntilDue < 0 ? "overdue" : "pending"

    const rentInfo: TenantRentInfo = {
      tenancyId:            tenancy.id,
      unitLabel:            `Unit ${unit?.unit_number ?? "—"}`,
      propertyName:         property?.name ?? "Property",
      propertyAddress:      property?.address ?? "",
      rentAmount:           (tenancy as any).rent_amount ?? 0,
      nextDueDate:          due.toISOString(),
      daysUntilDue,
      currentPaymentStatus: currentStatus,
      currentPaymentId:     current?.id ?? null,
    }

    // 3. Recent payments (last 5)
    const { data: rows } = await sb
      .from("payments")
      .select("id, amount, status, due_date, paid_at, reference, proof_url, rejection_reason")
      .eq("tenancy_id", tenancy.id)
      .order("due_date", { ascending: false })
      .limit(5)

    const recentPayments: TenantPayment[] = (rows ?? []).map((p: any) => ({
      id:              p.id,
      amount:          p.amount ?? 0,
      status:          deriveStatus(p.status, p.due_date),
      dueDate:         p.due_date,
      paidAt:          p.paid_at ?? null,
      reference:       p.reference ?? null,
      proofUrl:        p.proof_url ?? null,
      rejectionReason: p.rejection_reason ?? null,
    }))

    return NextResponse.json({ hasTenancy: true, rentInfo, recentPayments } satisfies TenantDashboardResponse)
  } catch (err) {
    console.error("[GET /api/tenant/dashboard]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ── POST /api/tenant/dashboard — submit payment proof ─────────────────────────
export async function POST(req: NextRequest) {
  const user = await getAuthedTenant(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { tenancyId, paymentId, reference, proofUrl, amount, dueDate } = body
    if (!tenancyId) return NextResponse.json({ error: "tenancyId required" }, { status: 400 })

    // Ownership check
    const { data: t } = await sb
      .from("tenancies").select("id").eq("id", tenancyId).eq("tenant_id", user.id).single()
    if (!t) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    if (paymentId) {
      await sb.from("payments").update({
        reference:    reference ?? null,
        proof_url:    proofUrl ?? null,
        status:       "pending",
        submitted_at: new Date().toISOString(),
      }).eq("id", paymentId).eq("tenancy_id", tenancyId)
    } else {
      await sb.from("payments").insert({
        tenancy_id:   tenancyId,
        amount:       amount ?? 0,
        status:       "pending",
        due_date:     dueDate ?? new Date().toISOString(),
        reference:    reference ?? null,
        proof_url:    proofUrl ?? null,
        submitted_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[POST /api/tenant/dashboard]", err)
    return NextResponse.json({ error: "Failed to submit payment" }, { status: 500 })
  }
}
*/

// =============================================================================
// ─── API ROUTE: TENANT HISTORY (GET, paginated) ───────────────────────────────
// PATH: app/api/tenant/history/route.ts
// =============================================================================
/*
import { NextRequest, NextResponse } from "next/server"
import { createClient }              from "@supabase/supabase-js"
import type { TenantHistoryResponse, TenantPayment, PaymentStatus } from "@/types/tenant"

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function deriveStatus(dbStatus: string, dueDate: string): PaymentStatus {
  if (dbStatus === "paid")     return "paid"
  if (dbStatus === "rejected") return "rejected"
  return new Date(dueDate) < new Date() ? "overdue" : "pending"
}

// ── GET /api/tenant/history?page=1&limit=20 ───────────────────────────────────
export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "tenant") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { data: tenancy } = await sb
      .from("tenancies").select("id").eq("tenant_id", user.id).eq("status", "active").single()

    if (!tenancy)
      return NextResponse.json({ hasTenancy: false, payments: [], total: 0, page: 1, limit: 20 } satisfies TenantHistoryResponse)

    const page  = Math.max(1, Number(req.nextUrl.searchParams.get("page")  ?? 1))
    const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? 20))
    const from  = (page - 1) * limit
    const to    = from + limit - 1

    const { data: rows, count } = await sb
      .from("payments")
      .select(
        "id, amount, status, due_date, paid_at, reference, proof_url, rejection_reason",
        { count: "exact" }
      )
      .eq("tenancy_id", tenancy.id)
      .order("due_date", { ascending: false })
      .range(from, to)

    const payments: TenantPayment[] = (rows ?? []).map((p: any) => ({
      id:              p.id,
      amount:          p.amount ?? 0,
      status:          deriveStatus(p.status, p.due_date),
      dueDate:         p.due_date,
      paidAt:          p.paid_at ?? null,
      reference:       p.reference ?? null,
      proofUrl:        p.proof_url ?? null,
      rejectionReason: p.rejection_reason ?? null,
    }))

    return NextResponse.json({ hasTenancy: true, payments, total: count ?? 0, page, limit } satisfies TenantHistoryResponse)
  } catch (err) {
    console.error("[GET /api/tenant/history]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
*/

// =============================================================================
// ─── COMPONENT: STATUS BADGE + FORMATTERS (shared util) ──────────────────────
// PATH: components/tenant/ui-kit.tsx
// =============================================================================
/*
"use client"

import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PaymentStatus } from "@/types/tenant"

// ── Formatters ────────────────────────────────────────────────────────────────
export function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style:                 "currency",
    currency:              "USD",
    maximumFractionDigits: 0,
  }).format(n)
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

// ── Status colour map ─────────────────────────────────────────────────────────
export const STATUS = {
  paid: {
    label:      "Paid",
    badge:      "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon:       <CheckCircle2 className="w-3 h-3" />,
    cardTop:    "border-t-emerald-500",
    cardGrad:   "from-emerald-50/80 via-white to-white",
    amount:     "text-emerald-700",
    dialogBg:   "from-emerald-50 to-white",
  },
  pending: {
    label:      "Due Soon",
    badge:      "bg-amber-100 text-amber-700 border-amber-200",
    icon:       <Clock className="w-3 h-3" />,
    cardTop:    "border-t-blue-500",
    cardGrad:   "from-blue-50/80 via-white to-white",
    amount:     "text-blue-700",
    dialogBg:   "from-blue-50 to-white",
  },
  overdue: {
    label:      "Overdue",
    badge:      "bg-red-100 text-red-700 border-red-200",
    icon:       <AlertTriangle className="w-3 h-3" />,
    cardTop:    "border-t-red-500",
    cardGrad:   "from-red-50/80 via-white to-white",
    amount:     "text-red-600",
    dialogBg:   "from-red-50 to-white",
  },
  rejected: {
    label:      "Rejected",
    badge:      "bg-slate-100 text-slate-500 border-slate-200",
    icon:       <XCircle className="w-3 h-3" />,
    cardTop:    "border-t-slate-400",
    cardGrad:   "from-slate-50/80 via-white to-white",
    amount:     "text-slate-600",
    dialogBg:   "from-slate-50 to-white",
  },
} satisfies Record<PaymentStatus, {
  label: string; badge: string; icon: React.ReactNode
  cardTop: string; cardGrad: string; amount: string; dialogBg: string
}>

// ── StatusBadge ───────────────────────────────────────────────────────────────
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
*/

// =============================================================================
// ─── COMPONENT: PAYMENT DIALOG ────────────────────────────────────────────────
// PATH: components/tenant/payment-dialog.tsx
// Auto-opens when payment is pending or overdue.
// =============================================================================
/*
"use client"

import {
  useState, useRef, useCallback, type FormEvent, type DragEvent,
} from "react"
import axios, { type AxiosError } from "axios"
import {
  Upload, X, FileText, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button }               from "@/components/ui/button"
import { Input }                from "@/components/ui/input"
import { Label }                from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn }                   from "@/lib/utils"
import { fmtCurrency, fmtDate, STATUS } from "@/components/tenant/ui-kit"
import type { TenantRentInfo }  from "@/types/tenant"

// ── File drop zone ────────────────────────────────────────────────────────────
function DropZone({
  file, onFile, disabled,
}: {
  file: File | null
  onFile: (f: File | null) => void
  disabled?: boolean
}) {
  const inp = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const pick = useCallback((e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  if (file) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
        <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-blue-600" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
          <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          type="button"
          onClick={() => onFile(null)}
          disabled={disabled}
          className="w-6 h-6 rounded-full hover:bg-blue-200 flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5 text-blue-600" />
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={inp}
        type="file"
        accept="image/*,.pdf"
        className="sr-only"
        onChange={e => onFile(e.target.files?.[0] ?? null)}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => inp.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={pick}
        disabled={disabled}
        className={cn(
          "w-full border-2 border-dashed rounded-xl py-7 flex flex-col items-center gap-2.5",
          "transition-all duration-150 focus-visible:outline-none",
          over
            ? "border-blue-400 bg-blue-50/70 scale-[1.01]"
            : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/40",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        <span className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center">
          <Upload className="w-5 h-5 text-gray-400" />
        </span>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">Upload payment proof</p>
          <p className="text-xs text-gray-400 mt-0.5">PNG, JPG or PDF · max 5 MB</p>
        </div>
      </button>
    </>
  )
}

// ── Dialog ────────────────────────────────────────────────────────────────────
interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
  rentInfo:     TenantRentInfo
  onSuccess:    () => void
}

export function PaymentDialog({ open, onOpenChange, rentInfo, onSuccess }: Props) {
  const [file,      setFile]      = useState<File | null>(null)
  const [reference, setReference] = useState("")
  const [busy,      setBusy]      = useState(false)
  const [done,      setDone]      = useState(false)
  const [err,       setErr]       = useState<string | null>(null)

  const reset = () => { setFile(null); setReference(""); setErr(null); setDone(false) }

  function close(v: boolean) {
    if (busy) return
    if (!v) reset()
    onOpenChange(v)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!file && !reference.trim()) {
      setErr("Please upload proof or enter a reference number.")
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const token = typeof window !== "undefined"
        ? sessionStorage.getItem("rl_access_token") : null

      // In production: upload `file` to Supabase Storage, pass the returned URL.
      const proofUrl = file ? URL.createObjectURL(file) : null

      await axios.post(
        "/api/tenant/dashboard",
        {
          tenancyId: rentInfo.tenancyId,
          paymentId: rentInfo.currentPaymentId,
          reference: reference.trim() || null,
          proofUrl,
          amount:   rentInfo.rentAmount,
          dueDate:  rentInfo.nextDueDate,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )

      setDone(true)
      setTimeout(() => { onSuccess(); close(false) }, 1_300)
    } catch (e) {
      const ae = e as AxiosError<{ error: string }>
      setErr(ae.response?.data?.error ?? "Something went wrong. Please try again.")
    } finally { setBusy(false) }
  }

  const isOverdue = rentInfo.currentPaymentStatus === "overdue"
  const s = STATUS[rentInfo.currentPaymentStatus]

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[420px] p-0 rounded-2xl border border-gray-200 shadow-2xl overflow-hidden gap-0">

        {/* Gradient header */}
        <div className={cn("px-6 pt-6 pb-5 bg-linear-to-br", s.dialogBg)}>
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[22px] font-black tracking-tight text-gray-900 leading-none">
              {isOverdue ? "⚠️ Rent Overdue" : "🏠 Rent Due"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 leading-snug">
              Submit proof for your landlord to verify your payment.
            </DialogDescription>
          </DialogHeader>

          {/* Amount + due date row */}
          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Amount Due
              </p>
              <p className={cn("text-[42px] font-black tracking-[-0.04em] leading-none", s.amount)}>
                {fmtCurrency(rentInfo.rentAmount)}
              </p>
            </div>
            <div className="text-right pb-1">
              <p className="text-[11px] text-gray-400 mb-1">Due date</p>
              <p className="text-sm font-bold text-gray-700 tabular-nums">
                {fmtDate(rentInfo.nextDueDate, { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={submit} className="px-6 pt-5 pb-6 space-y-4 bg-white">

          {err && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-xl py-3 gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <AlertDescription className="text-xs leading-relaxed">{err}</AlertDescription>
            </Alert>
          )}

          {done && (
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs font-semibold text-emerald-700">
                Submitted! Awaiting landlord verification.
              </p>
            </div>
          )}

          {/* Upload zone */}
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-gray-700 block">
              Proof of Payment
            </Label>
            <DropZone file={file} onFile={setFile} disabled={busy || done} />
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <Label htmlFor="dlg-ref" className="text-sm font-bold text-gray-700">
              Reference / Transaction ID{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Input
              id="dlg-ref"
              value={reference}
              onChange={e => { setReference(e.target.value); setErr(null) }}
              placeholder="e.g. TXN-0000000000"
              disabled={busy || done}
              className="h-11 rounded-xl border-gray-200 text-sm
                focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:border-blue-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => close(false)}
              disabled={busy}
              className="flex-1 h-11 rounded-xl border-gray-200 font-semibold text-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || done}
              className={cn(
                "flex-1 h-11 rounded-xl font-bold gap-2 text-white shadow-sm",
                "transition-all hover:-translate-y-px active:translate-y-0",
                "disabled:opacity-60 disabled:translate-y-0",
                isOverdue
                  ? "bg-red-500 hover:bg-red-600 shadow-red-200 hover:shadow-red-300"
                  : "bg-blue-500 hover:bg-blue-600 shadow-blue-200 hover:shadow-blue-300",
                "hover:shadow-md",
              )}
            >
              {busy ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
              ) : done ? (
                <><CheckCircle2 className="w-4 h-4" />Submitted!</>
              ) : (
                "Submit Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
*/

// =============================================================================
// ─── COMPONENT: RENT DUE CARD ─────────────────────────────────────────────────
// PATH: components/tenant/rent-due-card.tsx
// Large highlight card shown at top of tenant dashboard.
// =============================================================================
/*
import { Calendar, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton }          from "@/components/ui/skeleton"
import { cn }                from "@/lib/utils"
import { fmtCurrency, fmtDate, STATUS, StatusBadge } from "@/components/tenant/ui-kit"
import type { TenantRentInfo } from "@/types/tenant"

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function RentDueCardSkeleton() {
  return (
    <Card className="rounded-2xl border border-gray-200 border-t-4 border-t-gray-100 shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-12 w-40 rounded" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="h-px bg-gray-100 mb-5" />
        <div className="space-y-3">
          {[36, 44].map(w => (
            <div key={w} className="flex items-center gap-3">
              <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className={`h-3.5 w-${w} rounded`} />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export function RentDueCard({ rentInfo }: { rentInfo: TenantRentInfo }) {
  const s = STATUS[rentInfo.currentPaymentStatus]

  const countdownText =
    rentInfo.daysUntilDue === 0
      ? "Due today"
      : rentInfo.daysUntilDue < 0
        ? `${Math.abs(rentInfo.daysUntilDue)}d overdue`
        : `${rentInfo.daysUntilDue}d until due`

  return (
    <Card className={cn(
      "rounded-2xl border border-gray-200 border-t-4 shadow-md hover:shadow-lg",
      "bg-linear-to-br transition-shadow duration-200",
      s.cardTop, s.cardGrad,
    )}>
      <CardContent className="p-6">
        {/* Top: amount + badge */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Next Rent Due
            </p>
            <p className={cn("text-[48px] font-black tracking-[-0.045em] leading-none", s.amount)}>
              {fmtCurrency(rentInfo.rentAmount)}
            </p>
          </div>
          <StatusBadge status={rentInfo.currentPaymentStatus} />
        </div>

        <div className="h-px bg-black/5 mb-5" />

        {/* Due date row */}
        <div className="flex items-center gap-3 mb-3">
          <span className="w-7 h-7 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
          </span>
          <div>
            <p className="text-[13px] font-bold text-gray-800 leading-tight">
              {fmtDate(rentInfo.nextDueDate, { month: "long", day: "numeric", year: "numeric" })}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">{countdownText}</p>
          </div>
        </div>

        {/* Property row */}
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-gray-500" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-gray-800 leading-tight">
              {rentInfo.unitLabel} · {rentInfo.propertyName}
            </p>
            {rentInfo.propertyAddress && (
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{rentInfo.propertyAddress}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
*/

// =============================================================================
// ─── COMPONENT: MINI PAYMENT LIST (dashboard — last 5 records) ────────────────
// PATH: components/tenant/mini-payment-list.tsx
// =============================================================================
/*
import Link              from "next/link"
import { Receipt, ArrowRight } from "lucide-react"
import { Card, CardContent }   from "@/components/ui/card"
import { Skeleton }            from "@/components/ui/skeleton"
import { fmtCurrency, fmtDate, fmtMonth, StatusBadge } from "@/components/tenant/ui-kit"
import type { TenantPayment } from "@/types/tenant"

// ── Skeleton ──────────────────────────────────────────────────────────────────
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

// ── Empty ─────────────────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
export function MiniPaymentList({ payments }: { payments: TenantPayment[] }) {
  return (
    <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-black text-gray-900 tracking-tight">Recent Payments</h2>
          {payments.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">Last {payments.length} records</p>
          )}
        </div>
        <Link
          href="/dashboard/history"
          className="flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Rows */}
      <CardContent className="p-0">
        {payments.length === 0 ? <EmptyPayments /> : (
          <div>
            {payments.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0
                  hover:bg-gray-50/60 transition-colors"
              >
                {/* Month icon */}
                <span className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black text-gray-500">
                  {new Date(p.dueDate).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                </span>

                {/* Info */}
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

                {/* Amount + badge */}
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
*/

// =============================================================================
// ─── COMPONENT: TENANT DASHBOARD (full client component) ──────────────────────
// PATH: components/tenant/tenant-dashboard.tsx
// Rendered by app/(dashboard)/dashboard/page.tsx when role === "tenant"
// =============================================================================
/*
"use client"

import { useState, useEffect, useCallback }           from "react"
import axios, { type AxiosError }                     from "axios"
import { Home, RefreshCw, AlertCircle }               from "lucide-react"
import { Button }                                     from "@/components/ui/button"
import { Skeleton }                                   from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription }        from "@/components/ui/alert"
import { Avatar, AvatarFallback }                     from "@/components/ui/avatar"
import { RentDueCard, RentDueCardSkeleton }           from "@/components/tenant/rent-due-card"
import { MiniPaymentList, MiniPaymentListSkeleton }   from "@/components/tenant/mini-payment-list"
import { PaymentDialog }                              from "@/components/tenant/payment-dialog"
import { useSessionUser }                             from "@/lib/auth-context"
import type { TenantDashboardResponse }               from "@/types/tenant"

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

// ── No-tenancy empty state ────────────────────────────────────────────────────
function NoTenancyState({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] px-6 text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-[20px] flex items-center justify-center mb-6 shadow-sm">
        <Home className="w-10 h-10 text-blue-400" />
      </div>
      <h2 className="text-xl font-black tracking-tight text-gray-900 mb-2">
        Welcome, {name.split(" ")[0]}!
      </h2>
      <p className="text-sm text-gray-500 max-w-[280px] leading-relaxed mb-8">
        You haven't been assigned to a unit yet. Share your registered email with your
        landlord and ask them to assign you to your unit.
      </p>
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left w-full max-w-xs">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
          What to do next
        </p>
        <ol className="space-y-2.5">
          {[
            "Share your registered email with your landlord",
            "Ask them to assign you to a unit in RentLedger",
            "Come back to see your rent dashboard",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-black flex items-center justify-center shrink-0 mt-0.5 text-[9px]">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

// ── Mobile header ─────────────────────────────────────────────────────────────
function MobileHeader({ name }: { name: string }) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-base font-black text-gray-900 tracking-tight">Dashboard</h1>
        <Avatar className="w-8 h-8 bg-linear-to-br from-blue-500 to-violet-500 shadow-sm">
          <AvatarFallback className="text-white text-xs font-black bg-transparent">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function TenantDashboard() {
  const user = useSessionUser()

  const [data,       setData]       = useState<TenantDashboardResponse | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [dlgOpen,    setDlgOpen]    = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== "undefined"
        ? sessionStorage.getItem("rl_access_token") : null
      const { data: res } = await axios.get<TenantDashboardResponse>(
        "/api/tenant/dashboard",
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      setData(res)
      // Auto-open dialog when payment is actionable
      if (
        res.hasTenancy && res.rentInfo &&
        (res.rentInfo.currentPaymentStatus === "pending" ||
         res.rentInfo.currentPaymentStatus === "overdue")
      ) {
        setTimeout(() => setDlgOpen(true), 650)
      }
    } catch (e) {
      const ae = e as AxiosError<{ error: string }>
      setError(ae.response?.data?.error ?? "Failed to load dashboard.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <MobileHeader name={user.name} />
      <div className="px-4 py-4 lg:px-8 lg:py-8 max-w-2xl mx-auto space-y-4 w-full">
        <div className="hidden lg:block mb-8">
          <Skeleton className="h-8 w-48 mb-2 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <RentDueCardSkeleton />
        <MiniPaymentListSkeleton />
      </div>
    </>
  )

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) return (
    <>
      <MobileHeader name={user.name} />
      <div className="px-4 py-4 lg:px-8 lg:py-8 max-w-2xl mx-auto space-y-4 w-full">
        <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-2xl">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle className="font-bold">Unable to load dashboard</AlertTitle>
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
        <Button
          onClick={load}
          variant="outline"
          className="rounded-xl border-gray-200 gap-2 font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    </>
  )

  // ── No tenancy ─────────────────────────────────────────────────────────────
  if (!data?.hasTenancy) return (
    <>
      <MobileHeader name={user.name} />
      <NoTenancyState name={user.name} />
    </>
  )

  const { rentInfo, recentPayments } = data

  return (
    <>
      {/* Mobile header with avatar (spec: left "Dashboard", right avatar) */}
      <MobileHeader name={user.name} />

      <div className="px-4 py-4 lg:px-8 lg:py-8 max-w-2xl mx-auto w-full space-y-5">
        {/* Desktop heading */}
        <div className="hidden lg:block mb-2">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, {user.name.split(" ")[0]} 👋
          </p>
        </div>

        {/* Large rent card */}
        {rentInfo && <RentDueCard rentInfo={rentInfo} />}

        {/* Submit CTA — visible when not paid */}
        {rentInfo && rentInfo.currentPaymentStatus !== "paid" && (
          <button
            onClick={() => setDlgOpen(true)}
            className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700
              text-white font-bold text-sm shadow-sm hover:shadow-md hover:shadow-blue-200
              transition-all hover:-translate-y-px active:translate-y-0"
          >
            Submit Payment Proof
          </button>
        )}

        {/* Recent payments */}
        <MiniPaymentList payments={recentPayments} />
      </div>

      {/* Payment dialog — auto-opens for pending/overdue */}
      {rentInfo && (
        <PaymentDialog
          open={dlgOpen}
          onOpenChange={setDlgOpen}
          rentInfo={rentInfo}
          onSuccess={load}
        />
      )}
    </>
  )
}
*/

// =============================================================================
// ─── PAGE: TENANT HISTORY ─────────────────────────────────────────────────────
// PATH: app/(dashboard)/dashboard/history/page.tsx
// Scrollable full payment history list with load-more pagination.
// =============================================================================
/*
"use client"

import { useState, useEffect, useCallback }        from "react"
import axios, { type AxiosError }                  from "axios"
import {
  AlertCircle, ChevronDown, ExternalLink,
  RefreshCw, Receipt,
} from "lucide-react"
import { Card, CardContent }                       from "@/components/ui/card"
import { Skeleton }                                from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription }     from "@/components/ui/alert"
import { Button }                                  from "@/components/ui/button"
import { Avatar, AvatarFallback }                  from "@/components/ui/avatar"
import { fmtCurrency, fmtDate, fmtMonth, StatusBadge } from "@/components/tenant/ui-kit"
import { useSessionUser }                          from "@/lib/auth-context"
import type { TenantPayment, TenantHistoryResponse } from "@/types/tenant"

// ── Skeleton row ──────────────────────────────────────────────────────────────
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

// ── Empty state ───────────────────────────────────────────────────────────────
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

// ── Summary chips at top ──────────────────────────────────────────────────────
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

// ── Single history row ────────────────────────────────────────────────────────
function HistoryRow({ p }: { p: TenantPayment }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Month abbreviation tile */}
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex flex-col items-center justify-center shrink-0 gap-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 leading-none">
            {new Date(p.dueDate).toLocaleDateString("en-US", { month: "short" })}
          </p>
          <p className="text-[13px] font-black text-gray-700 leading-none mt-0.5">
            {new Date(p.dueDate).getFullYear().toString().slice(2)}
          </p>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Date heading */}
          <p className="text-sm font-bold text-gray-900 leading-tight">{fmtMonth(p.dueDate)}</p>

          {/* Sub-line: paid date / reference / status hint */}
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            {p.paidAt
              ? `Paid on ${fmtDate(p.paidAt)}`
              : p.reference
                ? `Ref: ${p.reference}`
                : p.status === "rejected"
                  ? "Payment rejected"
                  : "Awaiting verification"}
          </p>

          {/* Rejection reason (expandable) */}
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

          {/* Proof link */}
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

        {/* Amount + badge */}
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TenantHistoryPage() {
  const user = useSessionUser()
  const LIMIT = 20

  const [payments,    setPayments]    = useState<TenantPayment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [page,        setPage]        = useState(1)
  const [total,       setTotal]       = useState(0)
  const [hasTenancy,  setHasTenancy]  = useState(true)

  const fetchPage = useCallback(async (pg: number, append = false) => {
    append ? setLoadingMore(true) : (setLoading(true), setError(null))
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
    } finally { append ? setLoadingMore(false) : setLoading(false) }
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
      {/* ── Mobile header (spec: left "History", right: none) ── */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center h-14 px-4">
          <h1 className="text-base font-black text-gray-900 tracking-tight">History</h1>
        </div>
      </header>

      <div className="px-4 py-4 lg:px-8 lg:py-8 max-w-2xl mx-auto w-full">

        {/* Desktop heading */}
        <div className="hidden lg:block mb-8">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Payment History</h1>
          <p className="text-sm text-gray-500 mt-1">Your complete rent payment record</p>
        </div>

        {/* ── Loading ── */}
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

        {/* ── Error ── */}
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

        {/* ── Empty ── */}
        {!loading && !error && (!hasTenancy || payments.length === 0) && <EmptyState />}

        {/* ── Data ── */}
        {!loading && !error && payments.length > 0 && (
          <div className="space-y-4">
            {/* Totals strip */}
            <SummaryChips payments={payments} />

            {/* List */}
            <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-black text-gray-900 tracking-tight">All Payments</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{total} records total</p>
                </div>
              </div>
              <CardContent className="p-0">
                {payments.map(p => <HistoryRow key={p.id} p={p} />)}

                {/* Load more */}
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
    </div>
  )
}
*/
```
