"use client";
import { useState } from "react";
import axios, { AxiosError } from "axios";
import { Loader2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RejectDialogProps {
  paymentId: string | null;
  tenantName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

export function RejectDialog({
  paymentId,
  tenantName,
  open,
  onOpenChange,
  onSuccess,
}: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }
    if (!paymentId) return;
    setLoading(true);
    setError(null);
    try {
      await axios.patch(`/api/payments/${paymentId}`, {
        action: "reject",
        reason: reason.trim(),
      });
      setReason("");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const e = err as AxiosError<{ error: string }>;
      setError(e.response?.data?.error ?? "Failed to reject payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) {
          setReason("");
          setError(null);
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="sm:max-w-[400px] rounded-[16px] p-0 border border-gray-200 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-red-50 to-white px-6 pt-6 pb-5">
          <DialogHeader>
            <div className="w-11 h-11 bg-red-500 rounded-2xl flex items-center justify-center mb-4 shadow-sm shadow-red-200">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl font-black tracking-[-0.025em]">
              Reject Payment
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              Rejecting payment from <strong>{tenantName}</strong>. Please
              provide a reason.
            </DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {error && (
            <Alert
              variant="destructive"
              className="border-red-200 bg-red-50 rounded-[10px] py-3"
            >
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">
              Reason for Rejection <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Proof of payment is unclear. Please re-upload a clearer image."
              rows={3}
              disabled={loading}
              className="rounded-xl text-sm border-gray-200 focus-visible:border-red-400 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReason("");
                setError(null);
                onOpenChange(false);
              }}
              disabled={loading}
              className="flex-1 h-11 rounded-xl border-gray-200 font-semibold text-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold gap-2 hover:shadow-lg hover:shadow-red-200 hover:-translate-y-px transition-all disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Confirm Reject"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
