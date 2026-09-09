import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

interface PaymentWithRelations {
  id: string;
  amount: number;
  status: Database["public"]["Enums"]["payment_status"];
  payment_date: string | null;
  tenancies: {
    id: string;
    next_due_date: string;
    unit_id: string;
    units: {
      id: string;
      name: string;
      properties: {
        id: string;
        landlord_id: string;
      };
    };
    profiles: {
      id: string;
      full_name: string;
    };
  };
}

interface TenancyWithUnit {
  id: string;
  start_date: string;
  next_due_date: string;
  rent_cycle: string;
  status: string;
  unit: {
    id: string;
    name: string;
    rent_amount: number;
    property: {
      id: string;
      name: string;
      address: string | null;
    };
  };
}

export interface DashboardSummary {
  totalRevenue: number;
  revenueGrowth: number;
  pendingPayments: number;
  overduePayments: number;
  activeTenantsCount: number;
  propertiesCount: number;
  recentPayments: RecentPayment[];
}

export interface RecentPayment {
  id: string;
  tenantName: string;
  tenantInitials: string;
  unitLabel: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  date: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const dashboardService = {
  async getLandlordSummary(
    landlordId: string,
  ): Promise<{ data: DashboardSummary | null; error: string | null }> {
    try {
      const { count: propertiesCount } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("landlord_id", landlordId);

      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select(
          `
          id,
          amount,
          status,
          payment_date,
          tenancies!inner (
            id,
            next_due_date,
            unit_id,
            units!inner (
              id,
              name,
              properties!inner (
                id,
                landlord_id
              )
            ),
            profiles!inner (
              id,
              full_name
            )
          )
        `,
        )
        .eq("tenancies.units.properties.landlord_id", landlordId)
        .order("payment_date", { ascending: false });

      if (paymentsError) {
        return { data: null, error: paymentsError.message };
      }

      const { data: unitsData } = (await supabase
        .from("units")
        .select("id, property_id")) as {
        data: { id: string; property_id: string }[] | null;
      };

      const { data: propertiesData } = (await supabase
        .from("properties")
        .select("id")) as { data: { id: string }[] | null };

      const propertyIds = propertiesData?.map((p) => p.id) ?? [];
      const unitIds =
        unitsData
          ?.filter((u) => propertyIds.includes(u.property_id))
          .map((u) => u.id) ?? [];

      const { count: activeTenantsCount } = await supabase
        .from("tenancies")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .in("unit_id", unitIds);

      const now = new Date();

      const recentPayments: RecentPayment[] = (
        (payments ?? []) as unknown as PaymentWithRelations[]
      )
        .slice(0, 5)
        .map((p) => {
          const dueDate = new Date(p.tenancies?.next_due_date ?? "");
          const isOverdue =
            p.status !== "verified" && dueDate < now;

          return {
            id: p.id,
            tenantName: p.tenancies?.profiles?.full_name ?? "Unknown Tenant",
            tenantInitials: getInitials(
              p.tenancies?.profiles?.full_name ?? "Unknown",
            ),
            unitLabel: p.tenancies?.units?.name ?? "Unit",
            amount: p.amount ?? 0,
            status: isOverdue
              ? "overdue"
              : p.status === "verified"
                ? "paid"
                : "pending",
            date: p.payment_date || p.tenancies?.next_due_date,
          };
        });

      const allPayments = recentPayments;

      const totalRevenue = allPayments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);

      const pendingPayments = allPayments.filter(
        (p) => p.status === "pending",
      ).length;

      const overduePayments = allPayments.filter(
        (p) => p.status === "overdue",
      ).length;

      const summary: DashboardSummary = {
        totalRevenue,
        revenueGrowth: 0,
        pendingPayments,
        overduePayments,
        activeTenantsCount: activeTenantsCount ?? 0,
        propertiesCount: propertiesCount ?? 0,
        recentPayments,
      };

      return { data: summary, error: null };
    } catch (err) {
      return { data: null, error: (err as Error).message };
    }
  },

  async getTenantSummary(
    tenantId: string,
  ): Promise<{ data: TenantDashboardData | null; error: string | null }> {
    try {
      const { data: tenancyRaw, error: tenancyError } = await supabase
        .from("tenancies")
        .select(
          `
          id,
          start_date,
          next_due_date,
          rent_cycle,
          status,
          unit:units!inner (
            id,
            name,
            rent_amount,
            property:properties!inner (
              id,
              name,
              address
            )
          )
        `,
        )
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .single();

      if (tenancyError || !tenancyRaw) {
        return {
          data: null,
          error: tenancyError?.message || "No active tenancy",
        };
      }

      const tenancy = tenancyRaw as unknown as TenancyWithUnit;

      const { data: paymentsRaw, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("tenancy_id", tenancy.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (paymentsError) {
        return {
          data: null,
          error: paymentsError.message || "Failed to fetch payments",
        };
      }

      const payments = paymentsRaw as PaymentRow[];

      const now = new Date();
      const dueDate = new Date(tenancy.next_due_date);
      const isOverdue = dueDate < now;
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const lastPayment = payments?.[0];
      const currentStatus = !lastPayment
        ? isOverdue
          ? "overdue"
          : "pending"
        : lastPayment.status === "verified"
          ? "paid"
          : isOverdue
            ? "overdue"
            : "pending";

      const summary: TenantDashboardData = {
        tenancy: {
          id: tenancy.id,
          unitName: tenancy.unit.name,
          propertyName: tenancy.unit.property.name,
          propertyAddress: tenancy.unit.property.address,
          rentAmount: tenancy.unit.rent_amount,
          dueDate: tenancy.next_due_date,
          daysUntilDue: daysUntilDue > 0 ? daysUntilDue : 0,
          isOverdue,
        },
        currentStatus: currentStatus as "paid" | "pending" | "overdue",
        paymentHistory: (payments ?? []).map((p) => ({
          id: p.id,
          amount: p.amount,
          status:
            p.status === "verified" ? "paid" : "pending",
          date: p.payment_date || p.created_at || "",
        })),
      };

      return { data: summary, error: null };
    } catch (err) {
      return { data: null, error: (err as Error).message };
    }
  },
};

export interface TenantDashboardData {
  tenancy: {
    id: string;
    unitName: string;
    propertyName: string;
    propertyAddress: string | null;
    rentAmount: number;
    dueDate: string;
    daysUntilDue: number;
    isOverdue: boolean;
  };
  currentStatus: "paid" | "pending" | "overdue";
  paymentHistory: {
    id: string;
    amount: number;
    status: "paid" | "pending";
    date: string;
  }[];
}
