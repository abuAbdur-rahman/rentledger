import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  created_at: string | null;
  data: { tenancy_id?: string } | null;
}

interface NotificationsResponse {
  notifications: Notification[];
}

async function fetchNotifications(unreadOnly = false): Promise<Notification[]> {
  const { data } = await axios.get<NotificationsResponse>(
    unreadOnly ? "/api/notifications?unread=true" : "/api/notifications"
  );
  return data.notifications ?? [];
}

async function markAsRead(notificationId: string): Promise<void> {
  await axios.patch("/api/notifications", { notification_id: notificationId });
}

async function markAllAsRead(): Promise<void> {
  await axios.patch("/api/notifications", { mark_all_read: true });
}

async function respondToInvitation(
  notificationId: string,
  action: "accept" | "reject",
  tenancyId: string
): Promise<void> {
  await axios.patch("/api/notifications", {
    notification_id: notificationId,
    action,
    tenancy_id: tenancyId,
  });
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => fetchNotifications(unreadOnly),
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications", false]);

      queryClient.setQueryData<Notification[]>(["notifications", false], (old) =>
        old?.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );

      return { previousNotifications };
    },
    onError: (_err, _id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", false], context.previousNotifications);
      }
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications", false]);

      queryClient.setQueryData<Notification[]>(["notifications", false], (old) =>
        old?.map((n) => ({ ...n, read: true }))
      );

      return { previousNotifications };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", false], context.previousNotifications);
      }
    },
  });
}

export function useRespondToInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationId, action, tenancyId }: { notificationId: string; action: "accept" | "reject"; tenancyId: string }) =>
      respondToInvitation(notificationId, action, tenancyId),
    onMutate: async ({ notificationId, action }) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications", false]);

      queryClient.setQueryData<Notification[]>(["notifications", false], (old) =>
        old?.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                read: true,
                title: action === "accept" ? "Tenancy Accepted" : "Tenancy Declined",
              }
            : n
        )
      );

      return { previousNotifications };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", false], context.previousNotifications);
      }
    },
  });
}
