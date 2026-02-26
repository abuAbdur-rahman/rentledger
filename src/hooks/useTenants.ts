import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface Tenant {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  propertyName: string;
  unitLabel: string;
  status: "pending" | "active" | "rejected" | "terminated";
  startDate: string | null;
}

interface TenantsResponse {
  tenants: Tenant[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

async function fetchTenants(page = 1): Promise<TenantsResponse> {
  const { data } = await axios.get<TenantsResponse>(
    `/api/tenants?page=${page}&limit=10`
  );
  return data;
}

async function inviteTenant(tenant: {
  phoneNumber: string;
  propertyId: string;
  unitId: string;
  rentAmount: number;
  startDate: string;
  rentCycle: "monthly" | "annual";
}): Promise<{ success: boolean }> {
  const { data } = await axios.post("/api/tenants", tenant);
  return data;
}

async function validateTenant(phoneNumber: string): Promise<{ valid: boolean; message: string }> {
  const { data } = await axios.get(`/api/tenants/validate?phone=${phoneNumber}`);
  return data;
}

async function respondToTenancy(tenancyId: string, action: "accept" | "reject"): Promise<void> {
  await axios.post("/api/tenancies/respond", { tenancy_id: tenancyId, action });
}

export function useTenants(page = 1) {
  return useQuery({
    queryKey: ["tenants", page],
    queryFn: () => fetchTenants(page),
  });
}

export function useInviteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inviteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useValidateTenant() {
  return useMutation({
    mutationFn: validateTenant,
  });
}

export function useRespondToTenancy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenancyId, action }: { tenancyId: string; action: "accept" | "reject" }) =>
      respondToTenancy(tenancyId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
