"use client"
import { useState, useEffect } from "react"
import axios, { AxiosError } from "axios"
import { Loader2, UserPlus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Property {
  id: string
  name: string
}

interface Unit {
  id: string
  name: string
  propertyName: string
}

interface AddTenantDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
  preSelectedPropertyId?: string
  preSelectedUnitId?: string
}

export function AddTenantDialog({ open, onOpenChange, onSuccess, preSelectedPropertyId, preSelectedUnitId }: AddTenantDialogProps) {
  const [email, setEmail] = useState("")
  const [propertyId, setPropertyId] = useState(preSelectedPropertyId || "")
  const [unitId, setUnitId] = useState(preSelectedUnitId || "")
  const [startDate, setStartDate] = useState("")
  const [properties, setProperties] = useState<Property[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingUnits, setFetchingUnits] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ email?: string; propertyId?: string; unitId?: string }>({})

  useEffect(() => {
    if (!open) return
    axios.get("/api/properties?limit=100")
      .then(r => setProperties(r.data.properties ?? []))
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (!propertyId) {
      setUnits([])
      return
    }
    setFetchingUnits(true)
    axios.get(`/api/properties/${propertyId}/units`)
      .then(r => {
        // Filter to only vacant units
        const vacant = (r.data.units ?? []).filter((u: Unit & { isVacant: boolean }) => u.isVacant)
        setUnits(vacant)
      })
      .catch(() => {})
      .finally(() => setFetchingUnits(false))
  }, [propertyId])

  useEffect(() => {
    if (preSelectedPropertyId) setPropertyId(preSelectedPropertyId)
    if (preSelectedUnitId) setUnitId(preSelectedUnitId)
  }, [preSelectedPropertyId, preSelectedUnitId])

  function reset() { 
    setEmail(""); setPropertyId(""); setUnitId(""); setStartDate(""); 
    setError(null); setSuccess(null); setErrors({}) 
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: typeof errors = {}
    if (!email.trim()) newErrors.email = "Tenant email is required."
    if (!propertyId) newErrors.propertyId = "Please select a property."
    if (!unitId) newErrors.unitId = "Please select a unit."
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    
    setLoading(true); setError(null); setSuccess(null)
    try {
      await axios.post("/api/tenants", { 
        email: email.trim(), 
        unitId, 
        startDate: startDate || new Date().toISOString() 
      })
      setSuccess("Invitation sent successfully!")
      setTimeout(() => {
        reset(); 
        onSuccess(); 
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      const e = err as AxiosError<{ error: string; needsRegistration?: boolean }>
      if (e.response?.data?.needsRegistration) {
        setError("This user hasn't registered on RentLedger yet. They need to sign up first.")
      } else {
        setError(e.response?.data?.error ?? "Failed to send invitation.")
      }
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { reset(); onOpenChange(v) } }}>
      <DialogContent className="sm:max-w-[400px] rounded-[16px] p-0 border border-gray-200 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-green-50 to-white px-6 pt-6 pb-5">
          <DialogHeader>
            <div className="w-11 h-11 bg-green-500 rounded-[12px] flex items-center justify-center mb-4 shadow-sm shadow-green-200">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl font-black tracking-[-0.025em]">Invite Tenant</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">Send an invitation to a tenant by email.</DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {error && <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-[10px] py-3"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
          {success && <Alert className="border-green-200 bg-green-50 rounded-[10px] py-3"><AlertDescription className="text-xs text-green-700">{success}</AlertDescription></Alert>}
          
          {!preSelectedPropertyId && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700">Property <span className="text-red-500">*</span></Label>
              <Select value={propertyId} onValueChange={(v) => { setPropertyId(v); setUnitId(""); setErrors(p => ({ ...p, propertyId: undefined })) }}>
                <SelectTrigger className={`h-11 rounded-[8px] text-sm ${errors.propertyId ? "border-red-400" : "border-gray-200"}`}>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent className="rounded-[10px]">
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.propertyId && <p className="text-xs text-red-500 font-medium">{errors.propertyId}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">Unit <span className="text-red-500">*</span></Label>
            <Select value={unitId} onValueChange={(v) => { setUnitId(v); setErrors(p => ({ ...p, unitId: undefined })) }}>
              <SelectTrigger className={`h-11 rounded-[8px] text-sm ${errors.unitId ? "border-red-400" : "border-gray-200"}`} disabled={!propertyId || fetchingUnits}>
                <SelectValue placeholder={fetchingUnits ? "Loading units..." : "Select a vacant unit"} />
              </SelectTrigger>
              <SelectContent className="rounded-[10px]">
                {units.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-500">No vacant units available</div>
                ) : (
                  units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>Unit {u.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.unitId && <p className="text-xs text-red-500 font-medium">{errors.unitId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">Tenant Email <span className="text-red-500">*</span></Label>
            <Input 
              type="email"
              value={email} 
              onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })) }}
              placeholder="tenant@example.com" 
              disabled={loading}
              className={`h-11 rounded-[8px] text-sm ${errors.email ? "border-red-400 bg-red-50/40" : "border-gray-200 focus-visible:border-green-500"}`} 
            />
            {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">Start Date <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={loading}
              className="h-11 rounded-[8px] text-sm border-gray-200 focus-visible:border-green-500" />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false) }} disabled={loading}
              className="flex-1 h-11 rounded-[8px] border-gray-200 font-semibold text-gray-600">Cancel</Button>
            <Button type="submit" disabled={loading}
              className="flex-1 h-11 rounded-[8px] bg-green-500 hover:bg-green-600 text-white font-semibold gap-2 hover:shadow-lg hover:shadow-green-200 hover:-translate-y-px transition-all disabled:opacity-70">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : "Send Invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
