"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RecentPayment } from "@/services/dashboard";

function formatCurrency(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface RecentPaymentsProps {
  payments: RecentPayment[] | null;
  loading?: boolean;
}

export function RecentPayments({ payments, loading }: RecentPaymentsProps) {
  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <Skeleton className="w-32 h-5" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div>
                  <Skeleton className="w-24 h-4 mb-1" />
                  <Skeleton className="w-16 h-3" />
                </div>
              </div>
              <Skeleton className="w-16 h-5 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-8">
            No recent payments
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusStyles = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700",
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Recent Payments
        </CardTitle>
        <Link
          href="/payments"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                {payment.tenantInitials}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {payment.tenantName}
                </p>
                <p className="text-xs text-gray-500">
                  {payment.unitLabel} • {formatDate(payment.date)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(payment.amount)}
              </p>
              <Badge
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border-0",
                  statusStyles[payment.status],
                )}
              >
                {payment.status}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
