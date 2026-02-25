import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next({
    request,
  });

  // Check for custom user cookie first (for faster auth check)
  const userCookie = request.cookies.get("rl_user")?.value;
  let isAuthenticated = false;
  let userId = "";
  let userRole = "tenant";
  let userEmail = "";
  let userName = "";

  if (userCookie) {
    try {
      const cachedUser = JSON.parse(userCookie);
      if (cachedUser?.id) {
        // Validate Supabase session from cookies
        const supabase = await createServerClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error();
        } else if (session.user.id !== cachedUser.id) {
          throw new Error();
        } else {
          // Session valid
          isAuthenticated = true;
          userId = cachedUser.id;
          userRole = cachedUser.role || "tenant";
          userEmail = cachedUser.email || "";
          userName = cachedUser.full_name || "";
          // Inject headers from cookie for server components
          response.headers.set("x-user-role", userRole);
          response.headers.set("x-user-id", userId);
          response.headers.set("x-user-email", userEmail);
          response.headers.set("x-user-name", userName);
        }
      }
    } catch {
      // Invalid cookie, check with Supabase
      response.cookies.delete("rl_user");
    }
  }

  // If no custom cookie, check with Supabase
  if (!isAuthenticated) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      isAuthenticated = true;
      userId = user.id;
      userEmail = user.email || "";

      // Fetch profile for role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      userRole = profile?.role || "tenant";
      userName = profile?.full_name || "";

      // Store in cookie for subsequent requests
      response.cookies.set(
        "rl_user",
        JSON.stringify({
          id: userId,
          email: userEmail,
          full_name: userName,
          role: userRole,
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        },
      );

      // Inject headers
      response.headers.set("x-user-role", userRole);
      response.headers.set("x-user-id", userId);
      response.headers.set("x-user-email", userEmail);
      response.headers.set("x-user-name", userName);
    }
  }

  const isAuthPage = pathname.startsWith("/auth");
  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/");

  const isDashboard = pathname.startsWith("/dashboard");

  // Public pages - allow access
  if (isPublicPage && !isDashboard) {
    return response;
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && isAuthenticated) {
    const redirectUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect unauthenticated users to login
  if (!isAuthPage && !isAuthenticated) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  const landlordOnlyRoutes = ["/properties", "/tenants", "/payments"];

  const tenantOnlyRoutes = ["/history"];

  // Allow both roles to access profile and settings
  const sharedRoutes = ["/profile", "/settings"];
  const isSharedRoute = sharedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  if (isSharedRoute) {
    return response;
  }

  const isTenantOnlyRoute = tenantOnlyRoutes.some((route) =>
    pathname.startsWith(route),
  );
  if (userRole === "landlord" && isTenantOnlyRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isLandlordOnlyRoute = landlordOnlyRoutes.some((route) =>
    pathname.startsWith(route),
  );
  if (userRole === "tenant" && isLandlordOnlyRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

//abdulazeez.creative.dev@gmail.com
