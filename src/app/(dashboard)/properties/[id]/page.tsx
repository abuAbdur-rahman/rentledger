"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import {
  ArrowLeft,
  MoreVertical,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  DoorOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UnitCard, UnitCardSkeleton } from "@/components/properties/unit-card";
import { AddUnitDialog } from "@/components/properties/add-unit-dialog";

interface UnitItem {
  id: string;
  unitNumber: string;
  rentAmount: number;
  tenantName: string | null;
  tenantId: string | null;
  tenancyId: string | null;
  paymentStatus: "paid" | "pending" | "overdue" | "vacant";
}

interface PropertyDetail {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  unitsCount: number;
  activeTenants: number;
  totalRevenue: number;
  pendingCount: number;
  overdueCount: number;
  units: UnitItem[];
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProperty = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`/api/properties/${id}`);
      setProperty(data.property);
    } catch (err) {
      const e = err as AxiosError<{ error: string }>;
      setError(e.response?.data?.error ?? "Failed to load property.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await axios.delete(`/api/properties/${id}`);
      router.push("/properties");
    } catch {
      setError("Failed to delete property.");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8 rounded-xl hover:bg-gray-100 -ml-1"
            >
              <ArrowLeft className="w-4 h-4 text-gray-700" />
            </Button>
            <h1 className="text-base font-black tracking-[-0.02em] text-gray-900 truncate max-w-[180px]">
              {loading ? "Loading..." : (property?.name ?? "Property")}
            </h1>
          </div>
          {!loading && property && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl hover:bg-gray-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 rounded-2xl p-1.5"
              >
                <DropdownMenuItem className="gap-2 rounded-xl cursor-pointer">
                  <Pencil className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-sm">Edit Property</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-100 my-1" />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="gap-2 rounded-xl cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="px-4 py-4 lg:px-8 lg:py-8 max-w-[1000px] mx-auto w-full pb-28">
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="h-9 w-9 rounded-xl border-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-[-0.025em] text-gray-900">
                {loading ? "Loading..." : property?.name}
              </h1>
              <p className="text-sm text-gray-500">{property?.address}</p>
            </div>
          </div>
          {!loading && property && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl border-gray-200 text-sm font-semibold"
                >
                  <MoreVertical className="w-4 h-4" />
                  Options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 rounded-2xl p-1.5"
              >
                <DropdownMenuItem className="gap-2 rounded-xl cursor-pointer">
                  <Pencil className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-sm">Edit Property</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-100 my-1" />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="gap-2 rounded-xl cursor-pointer text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Error */}
        {!loading && error && (
          <div className="space-y-4">
            <Alert
              variant="destructive"
              className="border-red-200 bg-red-50 rounded-2xl"
            >
              <AlertTitle className="font-semibold">Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              onClick={fetchProperty}
              variant="outline"
              className="rounded-xl gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-6">
            <Card className="rounded-2xl border border-gray-200">
              <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-14" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <UnitCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {/* Property detail */}
        {!loading && !error && property && (
          <div className="space-y-6">
            {/* Summary card */}
            <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x-0 sm:divide-x divide-gray-100">
                  {[
                    {
                      label: "Total Units",
                      value: property.unitsCount,
                      color: "text-gray-900",
                    },
                    {
                      label: "Active Tenants",
                      value: property.activeTenants,
                      color: "text-green-600",
                    },
                    {
                      label: "Pending",
                      value: property.pendingCount,
                      color: "text-amber-600",
                    },
                    {
                      label: "Overdue",
                      value: property.overdueCount,
                      color: "text-red-600",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="sm:px-4 first:pl-0 last:pr-0"
                    >
                      <p className="text-xs font-semibold text-gray-400 mb-1 font-[Roboto,sans-serif]">
                        {item.label}
                      </p>
                      <p
                        className={`text-2xl font-black tracking-tight ${item.color}`}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Units section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black tracking-[-0.02em] text-gray-900">
                  Units
                </h2>
                <Button
                  onClick={() => setAddUnitOpen(true)}
                  size="sm"
                  className="h-8 px-3 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-semibold text-xs gap-1.5 hidden lg:flex"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Unit
                </Button>
              </div>
              {property.units.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-violet-50 rounded-[16px] flex items-center justify-center mb-4">
                    <DoorOpen className="w-8 h-8 text-violet-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-1">
                    No units yet
                  </p>
                  <p className="text-xs text-gray-400 mb-5 font-[Roboto,sans-serif]">
                    Add units to this property to start assigning tenants.
                  </p>
                  <Button
                    onClick={() => setAddUnitOpen(true)}
                    size="sm"
                    className="rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-semibold gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add First Unit
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {property.units.map((u) => (
                    <UnitCard key={u.id} {...u} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FAB: mobile Add Unit */}
      {!loading && property && (
        <button
          onClick={() => setAddUnitOpen(true)}
          className="lg:hidden fixed bottom-24 right-4 z-40 w-14 h-14 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white rounded-full shadow-xl shadow-violet-300/50 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <AddUnitDialog
        propertyId={id}
        open={addUnitOpen}
        onOpenChange={setAddUnitOpen}
        onSuccess={fetchProperty}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-[16px] border border-gray-200 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black tracking-[-0.02em]">
              Delete Property?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              This will permanently delete <strong>{property?.name}</strong> and
              all its units and payment records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-gray-200 font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold gap-2"
            >
              {deleting ? "Deleting..." : "Delete Property"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
