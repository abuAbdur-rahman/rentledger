import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface PaymentRow {
  id: string;
  tenantName: string;
  tenantInitials: string;
  unitLabel: string;
  propertyName: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "rejected";
  dueDate: string;
  paidAt: string | null;
  reference: string | null;
  proofUrl: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaymentsResponse {
  payments: PaymentRow[];
  pagination: Pagination;
}

type TabValue = "all" | "pending" | "verified" | "rejected";

async function fetchPayments(status: TabValue = "all", page = 1): Promise<PaymentsResponse> {
  const { data } = await axios.get<PaymentsResponse>(
    `/api/payments?status=${status}&page=${page}&limit=10`
  );
  return data;
}

async function verifyPayment(paymentId: string): Promise<{ success: boolean; status: string }> {
  const { data } = await axios.patch(`/api/payments/${paymentId}`, { action: "verify" });
  return data;
}

async function rejectPayment(paymentId: string, reason: string): Promise<{ success: boolean; status: string }> {
  const { data } = await axios.patch(`/api/payments/${paymentId}`, { action: "reject", reason });
  return data;
}

export function usePayments(status: TabValue = "all", page = 1) {
  return useQuery({
    queryKey: ["payments", status, page],
    queryFn: () => fetchPayments(status, page),
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyPayment,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRejectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      rejectPayment(paymentId, reason),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}
