"use client";

import { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RentDueCard,
  RentDueCardSkeleton,
} from "@/components/tenant/rent-due-card";
import {
  MiniPaymentList,
  MiniPaymentListSkeleton,
} from "@/components/tenant/mini-payment-list";
import { PaymentDialog } from "@/components/tenant/payment-dialog";
import type { TenantDashboardResponse } from "@/types/tenant";

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

export function TenantDashboard() {
  const [data, setData] = useState<TenantDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dlgOpen, setDlgOpen] = useState(false);

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
        res.hasTenancy &&
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

  if (!data?.hasTenancy) {
    return <NoTenancyState />;
  }

  const { rentInfo, recentPayments } = data;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your rent status and payment history
        </p>
      </div>

      {rentInfo && <RentDueCard rentInfo={rentInfo} />}

      {rentInfo && rentInfo.currentPaymentStatus !== "paid" && (
        <Button
          onClick={() => setDlgOpen(true)}
          className="w-full h-12 rounded-[10px] bg-blue-500 hover:bg-blue-600 font-semibold"
        >
          Submit Payment Proof
        </Button>
      )}

      <MiniPaymentList payments={recentPayments} />

      {rentInfo && (
        <PaymentDialog
          open={dlgOpen}
          onOpenChange={setDlgOpen}
          rentInfo={rentInfo}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
