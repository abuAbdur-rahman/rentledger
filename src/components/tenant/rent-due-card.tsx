import { Calendar, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  fmtCurrency,
  fmtDate,
  STATUS,
  StatusBadge,
} from "@/components/tenant/ui-kit";
import type { TenantRentInfo } from "@/types/tenant";

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
          {[36, 44].map((w) => (
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
  );
}

export function RentDueCard({ rentInfo }: { rentInfo: TenantRentInfo }) {
  const s = STATUS[rentInfo.currentPaymentStatus];

  const countdownText =
    rentInfo.daysUntilDue === 0
      ? "Due today"
      : rentInfo.daysUntilDue < 0
        ? `${Math.abs(rentInfo.daysUntilDue)}d overdue`
        : `${rentInfo.daysUntilDue}d until due`;

  return (
    <Card
      className={cn(
        "rounded-2xl border border-gray-200 border-t-4 shadow-md hover:shadow-lg",
        "bg-linear-to-br transition-shadow duration-200",
        s.cardTop,
        s.cardGrad,
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Next Rent Due
            </p>
            <p
              className={cn(
                "text-[48px] font-black tracking-[-0.045em] leading-none",
                s.amount,
              )}
            >
              {fmtCurrency(rentInfo.rentAmount)}
            </p>
          </div>
          <StatusBadge status={rentInfo.currentPaymentStatus} />
        </div>

        <div className="h-px bg-black/5 mb-5" />

        <div className="flex items-center gap-3 mb-3">
          <span className="w-7 h-7 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
          </span>
          <div>
            <p className="text-[13px] font-bold text-gray-800 leading-tight">
              {fmtDate(rentInfo.nextDueDate, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
              {countdownText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-gray-500" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-gray-800 leading-tight">
              {rentInfo.unitLabel} · {rentInfo.propertyName}
            </p>
            {rentInfo.propertyAddress && (
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                {rentInfo.propertyAddress}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
