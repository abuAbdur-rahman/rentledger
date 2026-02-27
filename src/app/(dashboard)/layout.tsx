import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { UserProvider } from "@/components/auth/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { getUser } from "@/services/user";
import { ChatProvider } from "@/components/chat/chat-provider";

export const metadata: Metadata = {
  title: {
    template: "%s — RentLedger",
    default: "Dashboard — RentLedger",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userData = await getUser();

  if (!userData) {
    redirect("/auth/login");
  }

  const user = {
    id: userData.id,
    name: userData.full_name || "User",
    email: userData.email,
    role: userData.role,
    avatarUrl: "",
  };

  return (
    <UserProvider user={user}>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar user={user} />
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 pb-22 lg:pb-0">{children}</div>
        </main>
        <BottomNav role={user.role} />
        <ChatProvider />
        <Toaster />
      </div>
    </UserProvider>
  );
}
