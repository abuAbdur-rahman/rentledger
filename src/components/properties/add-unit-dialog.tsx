"use client"
import { useState } from "react"
import axios, { AxiosError } from "axios"
import { Loader2, DoorOpen } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AddUnitDialogProps {
  propertyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddUnitDialog({ propertyId, open, onOpenChange, onSuccess }: AddUnitDialogProps) {
  const [unitNumber, setUnitNumber] = useState("")
  const [rentAmount, setRentAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ unitNumber?: string; rentAmount?: string }>({})

  function reset() { setUnitNumber(""); setRentAmount(""); setError(null); setErrors({}) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: typeof errors = {}
    if (!unitNumber.trim()) newErrors.unitNumber = "Unit name is required."
    if (!rentAmount || isNaN(Number(rentAmount)) || Number(rentAmount) <= 0) newErrors.rentAmount = "Enter a valid rent amount."
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setLoading(true); setError(null)
    try {
      await axios.post(`/api/properties/${propertyId}/units`, { unitNumber: unitNumber.trim(), rentAmount: Number(rentAmount) })
      reset(); onSuccess(); onOpenChange(false)
    } catch (err) {
      const e = err as AxiosError<{ error: string }>
      setError(e.response?.data?.error ?? "Failed to add unit.")
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { reset(); onOpenChange(v) } }}>
      <DialogContent className="sm:max-w-[380px] rounded-[16px] p-0 border border-gray-200 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-violet-50 to-white px-6 pt-6 pb-5">
          <DialogHeader>
            <div className="w-11 h-11 bg-violet-500 rounded-[12px] flex items-center justify-center mb-4 shadow-sm shadow-violet-200">
              <DoorOpen className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl font-black tracking-[-0.025em]">Add Unit</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">Add a new rentable unit to this property.</DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {error && <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-[10px] py-3"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">Unit Name / Number <span className="text-red-500">*</span></Label>
            <Input value={unitNumber} onChange={(e) => { setUnitNumber(e.target.value); setErrors(p => ({ ...p, unitNumber: undefined })) }}
              placeholder="e.g. 4A, Unit 1, Flat B" disabled={loading}
              className={`h-11 rounded-[8px] text-sm ${errors.unitNumber ? "border-red-400 bg-red-50/40" : "border-gray-200 focus-visible:border-violet-500"}`} />
            {errors.unitNumber && <p className="text-xs text-red-500 font-medium">{errors.unitNumber}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">Monthly Rent <span className="text-red-500">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">$</span>
              <Input value={rentAmount} onChange={(e) => { setRentAmount(e.target.value); setErrors(p => ({ ...p, rentAmount: undefined })) }}
                placeholder="0.00" type="number" min="0" step="0.01" disabled={loading}
                className={`h-11 rounded-[8px] text-sm pl-7 ${errors.rentAmount ? "border-red-400 bg-red-50/40" : "border-gray-200 focus-visible:border-violet-500"}`} />
            </div>
            {errors.rentAmount && <p className="text-xs text-red-500 font-medium">{errors.rentAmount}</p>}
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false) }} disabled={loading}
              className="flex-1 h-11 rounded-[8px] border-gray-200 font-semibold text-gray-600">Cancel</Button>
            <Button type="submit" disabled={loading}
              className="flex-1 h-11 rounded-[8px] bg-violet-500 hover:bg-violet-600 text-white font-semibold gap-2 hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-px transition-all disabled:opacity-70">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Add Unit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
