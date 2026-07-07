"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Home, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { authService } from "@/services/auth";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: "landlord" | "tenant";
  avatar_url?: string;
}

interface LandingNavProps {
  initialUser?: UserProfile | null;
}

export function LandingNav({ initialUser = null }: LandingNavProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateUserFromSession() {
      if (initialUser) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await authService.getCurrentUser();
      if (!isMounted) return;

      if (result.data) {
        setUser({
          id: result.data.id,
          email: result.data.email,
          full_name: result.data.full_name,
          role: result.data.role,
        });
      } else {
        setUser(null);
      }

      setIsLoading(false);
    }

    hydrateUserFromSession();

    return () => {
      isMounted = false;
    };
  }, [initialUser]);

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("rl_access_token");
        sessionStorage.removeItem("rl_refresh_token");
        sessionStorage.removeItem("rl_user");
      }

      await authService.signOut();
      setUser(null);
      setIsMenuOpen(false);
      router.refresh();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const getInitials = () => {
    const fullName = user?.full_name?.trim();

    if (fullName) {
      const nameParts = fullName.split(/\s+/).filter(Boolean);

      if (nameParts.length === 1) {
        return nameParts[0].charAt(0).toUpperCase();
      }

      const firstInitial = nameParts[0].charAt(0);
      const lastInitial = nameParts[nameParts.length - 1].charAt(0);
      return `${firstInitial}${lastInitial}`.toUpperCase();
    }

    return "U";
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-gray-900 text-[1.0625rem]"
        >
          <div className="w-9 h-9 rounded-[10px] bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          RentLedger
        </Link>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          ) : user ? (
            <div className="relative flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white pl-1 pr-3 py-1 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials()}
                </div>
                <span className="text-sm font-semibold text-gray-700">My Dashboard</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300"
                aria-label="Open account menu"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed  inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />

                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-2">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">
                        {user.full_name || "User"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2 ${
                          user.role === "landlord"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {user.role === "landlord" ? "Landlord" : "Tenant"}
                      </span>
                    </div>

                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Dashboard
                    </Link>

                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Profile Settings
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="hidden md:block">
                <Button
                  variant="outline"
                  className="h-10 px-4 text-sm font-semibold rounded-lg border-blue-500 text-blue-600 hover:bg-blue-50 transition-all"
                >
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button
                  variant="default"
                  className="h-10 px-4 text-sm font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-blue-200"
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}