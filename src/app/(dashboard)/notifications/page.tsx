"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Bell, Loader2, Check, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TopBar } from "@/components/dashboard/top-bar";
import { useSessionUser } from "@/components/auth/auth-context";
import { toast } from "sonner";

const NOTIFICATION_REFRESH_KEY = "rl_notification_refresh_interval";
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  created_at: string | null;
  data: { tenancy_id?: string } | null;
}

export default function NotificationsPage() {
  const user = useSessionUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(
    DEFAULT_REFRESH_INTERVAL,
  );
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATION_REFRESH_KEY);
    if (stored) {
      const interval = parseInt(stored, 10);
      if (!isNaN(interval) && interval >= 60000) {
        setRefreshInterval(interval);
      }
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await axios.get<{ notifications: Notification[] }>(
        "/api/notifications",
      );
      setNotifications(data.notifications ?? []);
      setLastRefresh(new Date());
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (refreshInterval < 60000) return;

    const intervalId = setInterval(() => {
      fetchNotifications();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchNotifications]);

  const handleRefreshIntervalChange = (minutes: number) => {
    const interval = minutes * 60 * 1000;
    setRefreshInterval(interval);
    localStorage.setItem(NOTIFICATION_REFRESH_KEY, String(interval));
    toast.success(
      `Notifications will refresh every ${minutes} minute${minutes > 1 ? "s" : ""}`,
    );
  };

  const handleAction = async (
    notificationId: string,
    action: "accept" | "reject",
    tenancyId: string,
  ) => {
    setActionLoading(notificationId);
    try {
      await axios.patch("/api/notifications", {
        notification_id: notificationId,
        action,
        tenancy_id: tenancyId,
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                read: true,
                title:
                  action === "accept" ? "Tenancy Accepted" : "Tenancy Declined",
              }
            : n,
        ),
      );
      toast.success(
        action === "accept" ? "Tenancy accepted!" : "Tenancy declined",
      );
    } catch {
      toast.error("Failed to process action");
    } finally {
      setActionLoading(null);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await axios.patch("/api/notifications", { notification_id: id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch("/api/notifications", { mark_all_read: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isTenancyInvite = (notification: Notification) => {
    return notification.type === "tenancy" && notification.data?.tenancy_id;
  };

  const headerUser = { name: user.name, email: user.email, role: user.role };

  return (
    <>
      <TopBar title="Notifications" user={headerUser} />
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {lastRefresh && (
              <p className="text-xs text-gray-400 mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(refreshInterval / 60000)}
              onValueChange={(v) =>
                handleRefreshIntervalChange(parseInt(v, 10))
              }
            >
              <SelectTrigger className="w-35 h-9 rounded-xl text-xs">
                <SelectValue placeholder="Refresh interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every 1 min</SelectItem>
                <SelectItem value="5">Every 5 min</SelectItem>
                <SelectItem value="10">Every 10 min</SelectItem>
                <SelectItem value="15">Every 15 min</SelectItem>
                <SelectItem value="30">Every 30 min</SelectItem>
                <SelectItem value="0">Manual only</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchNotifications();
              }}
              className="rounded-xl h-9"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            {notifications.some((n) => !n.read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                className="rounded-xl"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        {/*<div className="flex items-center gap-2">
            <Select
              value={String(refreshInterval / 60000)}
              onValueChange={(v) => handleRefreshIntervalChange(parseInt(v, 10))}
            >
              <SelectTrigger className="w-[140px] h-9 rounded-xl text-xs">
                <SelectValue placeholder="Refresh interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every 1 min</SelectItem>
                <SelectItem value="5">Every 5 min</SelectItem>
                <SelectItem value="10">Every 10 min</SelectItem>
                <SelectItem value="15">Every 15 min</SelectItem>
                <SelectItem value="30">Every 30 min</SelectItem>
                <SelectItem value="0">Manual only</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchNotifications();
              }}
              className="rounded-xl h-9"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            {notifications.some((n) => !n.read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                className="rounded-xl"
              >
                Mark all as read
              </Button>
            )}
          </div>*/}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="rounded-3xl border border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`rounded-3xl border ${
                  !notification.read
                    ? "border-blue-200 bg-blue-50/50"
                    : "border-gray-200"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-semibold">
                      {notification.title}
                    </CardTitle>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {notification.message && (
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {formatTime(notification.created_at)}
                    </p>
                    <div className="flex items-center gap-2">
                      {isTenancyInvite(notification) && !notification.read && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAction(
                                notification.id,
                                "accept",
                                notification.data!.tenancy_id!,
                              )
                            }
                            disabled={actionLoading === notification.id}
                            className="h-7 text-xs bg-green-500 hover:bg-green-600 gap-1"
                          >
                            {actionLoading === notification.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleAction(
                                notification.id,
                                "reject",
                                notification.data!.tenancy_id!,
                              )
                            }
                            disabled={actionLoading === notification.id}
                            className="h-7 text-xs gap-1"
                          >
                            {actionLoading === notification.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            Decline
                          </Button>
                        </>
                      )}
                      {!notification.read && !isTenancyInvite(notification) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="h-7 text-xs"
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
