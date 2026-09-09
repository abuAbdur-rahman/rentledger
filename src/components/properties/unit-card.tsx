import { User, ArrowRight, DoorOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";

interface UnitItem {
  id: string;
  unitNumber: string;
  rentAmount: number;
  tenantName: string | null;
  tenantId: string | null;
  tenancyId: string | null;
  paymentStatus: "paid" | "pending" | "overdue" | "vacant";
}

const statusCfg = {
  paid: { label: "Paid", cls: "bg-green-100 text-green-700 border-green-200" },
  pending: {
    label: "Pending",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  overdue: { label: "Overdue", cls: "bg-red-100 text-red-700 border-red-200" },
  vacant: { label: "Vacant", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

export function UnitCard({
  unitNumber,
  rentAmount,
  tenantName,
  paymentStatus,
}: UnitItem) {
  const cfg = statusCfg[paymentStatus];
  return (
    <Card className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center",
                paymentStatus === "vacant" ? "bg-gray-100" : "bg-violet-50",
              )}
            >
              <DoorOpen
                className={cn(
                  "w-4 h-4",
                  paymentStatus === "vacant"
                    ? "text-gray-400"
                    : "text-violet-500",
                )}
              />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Unit {unitNumber}
              </p>
              <p className="text-xs text-gray-400 font-[Roboto,sans-serif]">
                {formatCurrency(rentAmount)}/mo
              </p>
            </div>
          </div>
          <span
            className={cn(
              "text-[0.625rem] font-bold px-2 py-0.5 rounded-full border uppercase tracking-[0.05em]",
              cfg.cls,
            )}
          >
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-600 font-[Roboto,sans-serif]">
              {tenantName ?? "No tenant assigned"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors cursor-pointer">
            View
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UnitCardSkeleton() {
  return (
    <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-2.5 mb-3">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32 mt-3" />
      </CardContent>
    </Card>
  );
}
