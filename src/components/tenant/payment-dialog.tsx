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

      const proofUrl = file ? URL.createObjectURL(file) : null

      await axios.post(
        "/api/tenant/dashboard",
        {
          tenancyId: rentInfo.tenancyId,
          paymentId: rentInfo.currentPaymentId,
          reference: reference.trim() || null,
          proofUrl,
          amount:   rentInfo.rentAmount,
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

        <div className={cn("px-6 pt-6 pb-5 bg-gradient-to-br", s.dialogBg)}>
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[22px] font-black tracking-tight text-gray-900 leading-none">
              {isOverdue ? "Rent Overdue" : "Rent Due"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 leading-snug">
              Submit proof for your landlord to verify your payment.
            </DialogDescription>
          </DialogHeader>

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

          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-gray-700 block">
              Proof of Payment
            </Label>
            <DropZone file={file} onFile={setFile} disabled={busy || done} />
          </div>

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
