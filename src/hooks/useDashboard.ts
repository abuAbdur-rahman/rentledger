import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface LandlordSummary {
  revenue: { current: number; previous: number; change: number };
  pending: { count: number; amount: number };
  overdue: { count: number; amount: number };
  properties: { total: number; occupied: number; vacant: number };
  tenants: { total: number; active: number; pending: number };
}

interface TenantDashboardData {
  hasActiveTenancy: boolean;
  rentInfo: {
    tenancyId: string;
    unitLabel: string;
    propertyName: string;
    propertyAddress: string;
    rentAmount: number;
    nextDueDate: string;
    daysUntilDue: number;
    currentPaymentStatus: "paid" | "pending" | "overdue";
    currentPaymentId: string | null;
  } | null;
  recentPayments: TenantPayment[];
  tenancies: TenantTenancyItem[];
}

interface TenantPayment {
  id: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "rejected";
  dueDate: string;
  paidAt: string | null;
  reference: string | null;
  proofUrl: string | null;
  rejectionReason: string | null;
}

interface TenantTenancyItem {
  id: string;
  status: "pending" | "active" | "rejected" | "terminated";
  startDate: string | null;
  unitLabel: string;
  propertyName: string;
  propertyAddress: string;
  rentAmount: number;
}

async function fetchLandlordDashboard(): Promise<LandlordSummary> {
  const { data } = await axios.get<LandlordSummary>("/api/dashboard/summary");
  return data;
}

async function fetchTenantDashboard(): Promise<TenantDashboardData> {
  const { data } = await axios.get<TenantDashboardData>("/api/tenant/dashboard");
  return data;
}

export function useLandlordDashboard() {
  return useQuery({
    queryKey: ["dashboard", "landlord"],
    queryFn: fetchLandlordDashboard,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useTenantDashboard() {
  return useQuery({
    queryKey: ["dashboard", "tenant"],
    queryFn: fetchTenantDashboard,
    staleTime: 60 * 1000,
  });
}
