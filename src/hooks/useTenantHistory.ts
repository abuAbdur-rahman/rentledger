import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { TenantPayment, TenantHistoryResponse } from "@/types/tenant";

interface UseTenantHistoryParams {
  page?: number;
  limit?: number;
}

async function fetchTenantHistory({ page = 1, limit = 20 }: UseTenantHistoryParams = {}): Promise<TenantHistoryResponse> {
  const { data } = await axios.get<TenantHistoryResponse>(
    `/api/tenant/history?page=${page}&limit=${limit}`
  );
  return data;
}

export function useTenantHistory({ page = 1, limit = 20 }: UseTenantHistoryParams = {}) {
  return useQuery({
    queryKey: ["tenantHistory", page, limit],
    queryFn: () => fetchTenantHistory({ page, limit }),
  });
}

export function useTenantHistoryPagination(page: number, total: number, limit: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPage: number) => fetchTenantHistory({ page: newPage, limit }),
    onSuccess: (data, newPage) => {
      queryClient.setQueryData(["tenantHistory", newPage, limit], data);
    },
  });
}
