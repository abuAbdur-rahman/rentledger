"use client";

import { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  RentDueCard,
  RentDueCardSkeleton,
} from "@/components/tenant/rent-due-card";
import {
  MiniPaymentList,
  MiniPaymentListSkeleton,
} from "@/components/tenant/mini-payment-list";
import { PaymentDialog } from "@/components/tenant/payment-dialog";
import type { TenantDashboardResponse, TenantTenancyItem } from "@/types/tenant";
import { toast } from "sonner";

function NoTenancyState() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <Card className="rounded-2xl">
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">No tenancy data found.</p>
          <p className="text-sm text-gray-400 mt-2">
            Contact your landlord to get assigned to a unit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function TenancyAcceptDialog({
  open,
  onOpenChange,
  tenancy,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenancy: TenantTenancyItem | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: "accept" | "reject") => {
    if (!tenancy) return;
    setLoading(action);
    try {
      await axios.post("/api/tenancies/respond", {
        tenancyId: tenancy.id,
        action,
      });
      toast.success(action === "accept" ? "Invitation accepted!" : "Invitation declined");
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      const ae = e as AxiosError<{ error: string }>;
      toast.error(ae.response?.data?.error ?? "Failed to respond");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Pending Invitation</DialogTitle>
          <DialogDescription>
            You have been invited to the following property:
          </DialogDescription>
        </DialogHeader>
        {tenancy && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-semibold">{tenancy.propertyName}</p>
              <p className="text-sm text-gray-500">{tenancy.unitLabel}</p>
              {tenancy.propertyAddress && (
                <p className="text-sm text-gray-400 mt-1">{tenancy.propertyAddress}</p>
              )}
              {tenancy.rentAmount > 0 && (
                <p className="text-sm font-medium mt-2">₦{tenancy.rentAmount.toLocaleString()}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleAction("reject")}
                disabled={!!loading}
                className="flex-1"
              >
                {loading === "reject" ? "Declining..." : "Decline"}
              </Button>
              <Button
                onClick={() => handleAction("accept")}
                disabled={!!loading}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                {loading === "accept" ? "Accepting..." : "Accept"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TenantDashboard() {
  const [data, setData] = useState<TenantDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [acceptDlgOpen, setAcceptDlgOpen] = useState(false);
  const [selectedTenancy, setSelectedTenancy] = useState<TenantTenancyItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("rl_access_token")
          : null;
      const { data: res } = await axios.get<TenantDashboardResponse>(
        "/api/tenant/dashboard",
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      setData(res);

      if (
        res.hasActiveTenancy &&
        res.rentInfo &&
        (res.rentInfo.currentPaymentStatus === "pending" ||
          res.rentInfo.currentPaymentStatus === "overdue")
      ) {
        setTimeout(() => setDlgOpen(true), 800);
      }
    } catch (e) {
      const ae = e as AxiosError<{ error: string }>;
      setError(ae.response?.data?.error ?? "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTenancyClick = (tenancy: TenantTenancyItem) => {
    setSelectedTenancy(tenancy);
    setAcceptDlgOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <Skeleton className="w-32 h-8" />
        <div className="grid gap-6">
          <RentDueCardSkeleton />
          <MiniPaymentListSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Alert
          variant="destructive"
          className="border-red-200 bg-red-50 rounded-2xl"
        >
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchData} variant="outline" className="rounded-xl">
          Retry
        </Button>
      </div>
    );
  }

  if (!data || (data.tenancies.length === 0)) {
    return <NoTenancyState />;
  }

  const { rentInfo, recentPayments, tenancies, hasActiveTenancy } = data;

  const pendingTenancies = tenancies.filter(t => t.status === "pending");
  const pastTenancies = tenancies.filter(t => t.status === "rejected" || t.status === "terminated");

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your rent status and payment history
        </p>
      </div>

      {hasActiveTenancy && rentInfo && (
        <>
          <RentDueCard rentInfo={rentInfo} />

          {rentInfo.currentPaymentStatus !== "paid" && (
            <Button
              onClick={() => setDlgOpen(true)}
              className="w-full h-12 rounded-[10px] bg-blue-500 hover:bg-blue-600 font-semibold"
            >
              Submit Payment Proof
            </Button>
          )}

          <MiniPaymentList payments={recentPayments} />

          <PaymentDialog
            open={dlgOpen}
            onOpenChange={setDlgOpen}
            rentInfo={rentInfo}
            onSuccess={fetchData}
          />
        </>
      )}

      {pendingTenancies.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTenancies.map((tenancy) => (
              <div 
                key={tenancy.id} 
                className="flex items-center justify-between p-3 bg-amber-50 rounded-xl hover:bg-amber-100 cursor-pointer transition-colors"
                onClick={() => handleTenancyClick(tenancy)}
              >
                <div>
                  <p className="font-medium">{tenancy.propertyName}</p>
                  <p className="text-sm text-gray-500">{tenancy.unitLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">Pending</Badge>
                  <Button size="sm" className="h-7 bg-green-500 hover:bg-green-600 text-xs">
                    Respond
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pastTenancies.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Past Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastTenancies.map((tenancy) => (
              <div key={tenancy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium">{tenancy.propertyName}</p>
                  <p className="text-sm text-gray-500">{tenancy.unitLabel}</p>
                </div>
                <Badge variant="outline">{tenancy.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!hasActiveTenancy && pendingTenancies.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No active tenancy</p>
            <p className="text-sm text-gray-400 mt-2">
              You have no active tenancy. Contact your landlord to get assigned to a unit.
            </p>
          </CardContent>
        </Card>
      )}

      <TenancyAcceptDialog
        open={acceptDlgOpen}
        onOpenChange={setAcceptDlgOpen}
        tenancy={selectedTenancy}
        onSuccess={fetchData}
      />
    </div>
  );
}
