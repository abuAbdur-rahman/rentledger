import Link from "next/link"
import { Building2, Users, CreditCard, ChevronRight, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface PropertyCardProps {
  id: string
  name: string
  address: string
  unitsCount: number
  activeTenants: number
  pendingPayments: number
  overduePayments: number
}

export function PropertyCard({ id, name, address, unitsCount, activeTenants, pendingPayments, overduePayments }: PropertyCardProps) {
  return (
    <Link href={`/dashboard/properties/${id}`}>
      <Card className="group rounded-[12px] border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-900 leading-tight truncate">{name}</h3>
                {address && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    <p className="text-xs text-gray-400 truncate font-[Roboto,sans-serif]">{address}</p>
                  </div>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" />
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 bg-gray-100 rounded-[6px] flex items-center justify-center"><Building2 className="w-3 h-3 text-gray-500" /></div>
              <span className="text-xs font-semibold text-gray-700">{unitsCount} units</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 bg-green-50 rounded-[6px] flex items-center justify-center"><Users className="w-3 h-3 text-green-600" /></div>
              <span className="text-xs font-semibold text-gray-700">{activeTenants} tenants</span>
            </div>
            {pendingPayments > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="w-6 h-6 bg-amber-50 rounded-[6px] flex items-center justify-center"><CreditCard className="w-3 h-3 text-amber-500" /></div>
                <span className="text-xs font-semibold text-amber-600">{pendingPayments} pending</span>
              </div>
            )}
            {overduePayments > 0 && (
              <div className={cn("flex items-center gap-1.5", pendingPayments === 0 ? "ml-auto" : "")}>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">{overduePayments} overdue</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function PropertyCardSkeleton() {
  return (
    <Card className="rounded-[12px] border border-gray-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-[10px] shrink-0" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-48" /></div>
        </div>
        <div className="flex gap-3 pt-3 border-t border-gray-100">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}
