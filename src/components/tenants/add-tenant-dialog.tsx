"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, UserPlus, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
  propertyName: string;
}

interface AddTenantDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  preSelectedPropertyId?: string;
  preSelectedUnitId?: string;
}

export function AddTenantDialog({
  open,
  onOpenChange,
  onSuccess,
  preSelectedPropertyId,
  preSelectedUnitId,
}: AddTenantDialogProps) {
  const [phone, setPhone] = useState("");
  const [propertyId, setPropertyId] = useState(preSelectedPropertyId || "");
  const [unitId, setUnitId] = useState(preSelectedUnitId || "");
  const [startDate, setStartDate] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [fetchingUnits, setFetchingUnits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    phone?: string;
    propertyId?: string;
    unitId?: string;
  }>({});
  const [phoneValidated, setPhoneValidated] = useState<
    "idle" | "valid" | "invalid"
  >("idle");

  useEffect(() => {
    if (!open) return;
    axios
      .get("/api/properties?limit=100")
      .then((r) => setProperties(r.data.properties ?? []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!propertyId) {
      setUnits([]);
      return;
    }
    setFetchingUnits(true);
    axios
      .get(`/api/properties/${propertyId}/units`)
      .then((r) => {
        const vacant = (r.data.units ?? []).filter(
          (u: Unit & { isVacant: boolean }) => u.isVacant,
        );
        setUnits(vacant);
      })
      .catch(() => {})
      .finally(() => setFetchingUnits(false));
  }, [propertyId]);

  useEffect(() => {
    if (preSelectedPropertyId) setPropertyId(preSelectedPropertyId);
    if (preSelectedUnitId) setUnitId(preSelectedUnitId);
  }, [preSelectedPropertyId, preSelectedUnitId]);

  async function validatePhone() {
    if (!phone.trim()) return;
    setValidating(true);
    try {
      const res = await axios.get(
        `/api/tenants/validate?phone=${encodeURIComponent(phone.trim())}`,
      );
      setPhoneValidated(res.data.valid ? "valid" : "invalid");
    } catch {
      setPhoneValidated("idle");
    } finally {
      setValidating(false);
    }
  }

  function reset() {
    setPhone("");
    setPropertyId("");
    setUnitId("");
    setStartDate("");
    setError(null);
    setSuccess(null);
    setErrors({});
    setPhoneValidated("idle");
  }

  const canSubmit =
    phoneValidated === "valid" && propertyId && unitId && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!phone.trim()) newErrors.phone = "Tenant phone is required.";
    if (!propertyId) newErrors.propertyId = "Please select a property.";
    if (!unitId) newErrors.unitId = "Please select a unit.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await axios.post("/api/tenants", {
        phone: phone.trim(),
        unitId,
        startDate: startDate || new Date().toISOString(),
      });
      setSuccess("Invitation sent successfully!");
      setTimeout(() => {
        reset();
        onSuccess();
        onOpenChange(false);
      }, 1500);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.response?.data?.needsRegistration) {
        setPhoneValidated("invalid");
        setError("This user hasn't registered on RentLedger yet.");
      } else {
        setError(err.response?.data?.error ?? "Failed to send invitation.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) {
          reset();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-[450px] max-h-[90vh] overflow-y-auto rounded-[16px] p-0 border border-gray-200 shadow-2xl">
        <div className="bg-linear-to-br from-green-50 to-white px-4 sm:px-6 pt-6 pb-5">
          <DialogHeader>
            <div className="w-11 h-11 bg-green-500 rounded-2xl flex items-center justify-center mb-4 shadow-sm shadow-green-200">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl font-black tracking-[-0.025em]">
              Invite Tenant
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              Invite a tenant by their phone number.
            </DialogDescription>
          </DialogHeader>
        </div>
        <form
          onSubmit={handleSubmit}
          className="px-4 sm:px-6 pb-6 pt-4 space-y-4"
        >
          {error && (
            <Alert
              variant="destructive"
              className="border-red-200 bg-red-50 rounded-[10px] py-3"
            >
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-200 bg-green-50 rounded-[10px] py-3">
              <AlertDescription className="text-xs text-green-700">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            {!preSelectedPropertyId && (
              <div className="flex-1 space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Property <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={propertyId}
                  onValueChange={(v) => {
                    setPropertyId(v);
                    setUnitId("");
                    setErrors((p) => ({ ...p, propertyId: undefined }));
                  }}
                >
                  <SelectTrigger
                    className={`h-11 rounded-xl text-sm ${errors.propertyId ? "border-red-400" : "border-gray-200"}`}
                  >
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[10px]">
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.propertyId && (
                  <p className="text-xs text-red-500 font-medium">
                    {errors.propertyId}
                  </p>
                )}
              </div>
            )}

            <div
              className={`${preSelectedPropertyId ? "w-full" : "flex-1"} space-y-1.5`}
            >
              <Label className="text-sm font-semibold text-gray-700">
                Unit <span className="text-red-500">*</span>
              </Label>
              <Select
                value={unitId}
                onValueChange={(v) => {
                  setUnitId(v);
                  setErrors((p) => ({ ...p, unitId: undefined }));
                }}
              >
                <SelectTrigger
                  className={`h-11 rounded-xl text-sm ${errors.unitId ? "border-red-400" : "border-gray-200"}`}
                  disabled={!propertyId || fetchingUnits}
                >
                  <SelectValue
                    placeholder={
                      fetchingUnits ? "Loading..." : "Select a vacant unit"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="rounded-[10px]">
                  {units.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-500">
                      No vacant units
                    </div>
                  ) : (
                    units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        Unit {u.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.unitId && (
                <p className="text-xs text-red-500 font-medium">
                  {errors.unitId}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">
              Tenant Phone <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 min-w-0">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneValidated("idle");
                    setErrors((p) => ({ ...p, phone: undefined }));
                  }}
                  placeholder="e.g. 08012345678"
                  disabled={loading}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), validatePhone())
                  }
                  className={`h-11 rounded-xl text-sm pr-10 ${errors.phone ? "border-red-400 bg-red-50/40" : phoneValidated === "valid" ? "border-green-400 bg-green-50/40" : phoneValidated === "invalid" ? "border-red-400 bg-red-50/40" : "border-gray-200 focus-visible:border-green-500"}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {phoneValidated === "valid" && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                  {phoneValidated === "invalid" && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              <Button
                type="button"
                onClick={validatePhone}
                disabled={!phone.trim() || validating || loading}
                className="cursor-pointer h-11 rounded-xl border-gray-200 px-3 sm:px-4 text-sm font-medium whitespace-nowrap"
              >
                {validating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Check"
                )}
              </Button>
            </div>
            {phoneValidated === "valid" && (
              <p className="text-xs text-green-600 font-medium">User found</p>
            )}
            {phoneValidated === "invalid" && (
              <p className="text-xs text-red-500 font-medium">
                User not found. They need to register first.
              </p>
            )}
            {errors.phone && (
              <p className="text-xs text-red-500 font-medium">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">
              Start Date{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
              className="h-11 rounded-xl text-sm border-gray-200 focus-visible:border-green-500"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={loading}
              className="flex-1 h-11 rounded-xl border-gray-200 font-semibold text-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold gap-2 hover:shadow-lg hover:shadow-green-200 hover:-translate-y-px transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invite"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
