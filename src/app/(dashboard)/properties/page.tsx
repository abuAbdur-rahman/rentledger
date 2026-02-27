"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios, { AxiosError } from "axios";
import {
  Plus,
  Search,
  Building2,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TopBar } from "@/components/dashboard/top-bar";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  PropertyCard,
  PropertyCardSkeleton,
} from "@/components/properties/property-card";
import { AddPropertyDialog } from "@/components/properties/add-property-dialog";
import { useSessionUser } from "@/components/auth/auth-context";
import { Pagination } from "@/components/ui/pagination";

interface PropertyItem {
  id: string;
  name: string;
  address: string;
  unitsCount: number;
  activeTenants: number;
  pendingPayments: number;
  overduePayments: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PropertiesPage() {
  const user = useSessionUser();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchProperties = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`/api/properties?page=${page}&limit=10`);
      setProperties(data.properties ?? []);
      setPagination(
        data.pagination ?? { page, limit: 10, total: 0, totalPages: 0 },
      );
    } catch (err) {
      const e = err as AxiosError<{ error: string }>;
      setError(e.response?.data?.error ?? "Failed to load properties.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties(1);
  }, [fetchProperties]);

  const filtered = useMemo(() => {
    let list = properties;
    if (search.trim())
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.address.toLowerCase().includes(search.toLowerCase()),
      );
    if (filter === "overdue") list = list.filter((p) => p.overduePayments > 0);
    if (filter === "pending") list = list.filter((p) => p.pendingPayments > 0);
    if (filter === "vacant") list = list.filter((p) => p.activeTenants === 0);
    return list;
  }, [properties, search, filter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchProperties(newPage);
    }
  };

  const headerUser = { name: user.name, email: user.email, role: user.role };

  return (
    <>
      <TopBar title="Properties" user={headerUser} />
      <div className="px-4 py-4 lg:px-8 lg:py-8 max-w-[1200px] mx-auto w-full">
        <PageHeader
          title="Properties"
          subtitle={`${pagination.total} propert${pagination.total !== 1 ? "ies" : "y"}`}
          user={headerUser}
          action={
            <Button
              onClick={() => setDialogOpen(true)}
              className="h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm gap-2 hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-px transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Property
            </Button>
          }
        />

        {/* Search + Filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties..."
              className="pl-9 h-11 rounded-xl border-gray-200 text-sm focus-visible:border-blue-500 bg-white"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px] h-11 rounded-xl border-gray-200 text-sm bg-white gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-[10px]">
              <SelectItem value="all">All Properties</SelectItem>
              <SelectItem value="overdue">Has Overdue</SelectItem>
              <SelectItem value="pending">Has Pending</SelectItem>
              <SelectItem value="vacant">Vacant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="space-y-4">
            <Alert
              variant="destructive"
              className="border-red-200 bg-red-50 rounded-2xl"
            >
              <AlertTitle className="font-semibold">
                Failed to load properties
              </AlertTitle>
              <AlertDescription className="text-sm mt-1">
                {error}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => fetchProperties(pagination.page)}
              variant="outline"
              className="rounded-xl border-gray-200 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Empty — no properties at all */}
        {!loading && !error && properties.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[45vh] text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-[20px] flex items-center justify-center mb-6 shadow-sm">
              <Building2 className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-lg font-black tracking-[-0.02em] text-gray-900 mb-2">
              No properties yet
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mb-6 font-[Roboto,sans-serif] leading-relaxed">
              Add your first property to start tracking units, tenants, and rent
              payments.
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="h-11 px-6 rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white font-semibold gap-2 shadow-sm hover:shadow-md hover:shadow-blue-200 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Your First Property
            </Button>
          </div>
        )}

        {/* Empty — search/filter yields nothing */}
        {!loading &&
          !error &&
          properties.length > 0 &&
          filtered.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700 mb-1">
                No results found
              </p>
              <p className="text-xs text-gray-400">
                Try adjusting your search or filter.
              </p>
            </div>
          )}

        {/* Property Cards grid */}
        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <PropertyCard key={p.id} {...p} />
              ))}
            </div>
            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      <AddPropertyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchProperties}
      />
    </>
  );
}
