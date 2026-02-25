"use client"
import { useState } from "react"
import axios, { AxiosError } from "axios"
import { Loader2, Plus, Building2 } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AddPropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddPropertyDialog({ open, onOpenChange, onSuccess }: AddPropertyDialogProps) {
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [unitsCount, setUnitsCount] = useState("")
  const [rentAmount, setRentAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [unitsError, setUnitsError] = useState<string | null>(null)
  const [rentError, setRentError] = useState<string | null>(null)

  function reset() { 
    setName(""); setAddress(""); setUnitsCount(""); setRentAmount(""); 
    setError(null); setNameError(null); setUnitsError(null); setRentError(null) 
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    let hasError = false
    if (!name.trim()) { setNameError("Property name is required."); hasError = true }
    if (!unitsCount || parseInt(unitsCount) < 1) { setUnitsError("Number of units is required."); hasError = true }
    if (!rentAmount || parseFloat(rentAmount) < 0) { setRentError("Rent amount is required."); hasError = true }
    if (hasError) return

    setLoading(true); setError(null)
    try {
      await axios.post("/api/properties", { 
        name: name.trim(), 
        address: address.trim(),
        unitsCount: parseInt(unitsCount),
        rentAmount: parseFloat(rentAmount)
      })
      reset(); onSuccess(); onOpenChange(false)
    } catch (err) {
      const e = err as AxiosError<{ error: string }>
      setError(e.response?.data?.error ?? "Failed to create property.")
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { reset(); onOpenChange(v) } }}>
      <DialogContent className="sm:max-w-[400px] rounded-[16px] p-0 border border-gray-200 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-blue-50 to-white px-6 pt-6 pb-5">
          <DialogHeader>
            <div className="w-11 h-11 bg-blue-500 rounded-[12px] flex items-center justify-center mb-4 shadow-sm shadow-blue-200">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl font-black tracking-[-0.025em]">Add Property</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">Create a new property with units.</DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-[10px] py-3">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">Property Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); setNameError(null) }}
              placeholder="e.g. Sunset Apartments" disabled={loading}
              className={`h-11 rounded-[8px] text-sm ${nameError ? "border-red-400 bg-red-50/40 focus-visible:border-red-500" : "border-gray-200 focus-visible:border-blue-500"}`} />
            {nameError && <p className="text-xs text-red-500 font-medium">{nameError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">Address <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street, City, State"
              disabled={loading} className="h-11 rounded-[8px] text-sm border-gray-200 focus-visible:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700">Units <span className="text-red-500">*</span></Label>
              <Input 
                type="number" 
                min="1" 
                value={unitsCount} 
                onChange={(e) => { setUnitsCount(e.target.value); setUnitsError(null) }}
                placeholder="e.g. 4" 
                disabled={loading}
                className={`h-11 rounded-[8px] text-sm ${unitsError ? "border-red-400 bg-red-50/40 focus-visible:border-red-500" : "border-gray-200 focus-visible:border-blue-500"}`} 
              />
              {unitsError && <p className="text-xs text-red-500 font-medium">{unitsError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700">Rent/Unit <span className="text-red-500">*</span></Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01"
                value={rentAmount} 
                onChange={(e) => { setRentAmount(e.target.value); setRentError(null) }}
                placeholder="e.g. 500" 
                disabled={loading}
                className={`h-11 rounded-[8px] text-sm ${rentError ? "border-red-400 bg-red-50/40 focus-visible:border-red-500" : "border-gray-200 focus-visible:border-blue-500"}`} 
              />
              {rentError && <p className="text-xs text-red-500 font-medium">{rentError}</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false) }}
              disabled={loading} className="flex-1 h-11 rounded-[8px] border-gray-200 font-semibold text-gray-600">Cancel</Button>
            <Button type="submit" disabled={loading}
              className="flex-1 h-11 rounded-[8px] bg-blue-500 hover:bg-blue-600 text-white font-semibold gap-2 hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-px transition-all disabled:opacity-70 disabled:translate-y-0">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Plus className="w-4 h-4" />Save Property</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
