"use client";

import Link from "next/link";
import { Bell, CreditCard, MessageSquare, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/hooks";

export function NotificationBell() {
  const { data: notifications = [], isLoading } = useNotifications(true);
  const markAsRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead.mutateAsync(id);
    } catch {
      // Silent fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
    } catch {
      // Silent fail
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case "message":
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-[10px] hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/60 p-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <DropdownMenuLabel className="p-0 font-semibold text-gray-900">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {!isLoading && notifications.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No notifications yet</p>
            </div>
          )}

          {notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="p-0 cursor-pointer"
              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
            >
              <div
                className={`flex items-start gap-3 px-4 py-3 w-full transition-colors ${
                  !notification.read ? "bg-blue-50/50" : ""
                }`}
              >
                <div className="mt-0.5">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {formatTime(notification.created_at)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        <div className="border-t border-gray-100 px-4 py-2">
          <Link
            href="/notifications"
            className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-1"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
