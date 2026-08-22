import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next({
    request,
  });

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = verifySessionToken(sessionToken);

  let isAuthenticated = false;
  let userRole: "landlord" | "tenant" = "tenant";

  if (sessionUser) {
    isAuthenticated = true;
    userRole = sessionUser.role;

    response.headers.set("x-user-role", sessionUser.role);
    response.headers.set("x-user-id", sessionUser.id);
    response.headers.set("x-user-email", sessionUser.email);
    response.headers.set("x-user-name", sessionUser.full_name);
  } else if (sessionToken) {
    response.cookies.delete(SESSION_COOKIE_NAME);
  }

  // Define public routes (no authentication required)
  const isAuthPage = pathname.startsWith("/auth");
  const isPublicPage =
    pathname === "/" || // Homepage
    pathname.startsWith("/auth/") || // Auth pages
    pathname.startsWith("/api/") || // API routes
    pathname === "/properties-overview" || // Properties listing page
    pathname.startsWith("/properties-overview/") || // Individual property pages
    pathname === "/about" || 
    pathname === "/contact" || 
    pathname === "/pricing";

  // Public pages - allow access
  if (isPublicPage) {
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

  // Role-based route protection for authenticated users only
  // These routes should only be accessible by specific roles
  
  // Landlord-only routes (management features)
  const landlordOnlyRoutes = [
    "/landlord/properties",
    "/landlord/tenants",
    "/landlord/payments",
    "/landlord/units",
    "/properties/manage",
    "/tenants/manage",
    "/payments/manage",
  ];

  // Tenant-only routes
  const tenantOnlyRoutes = [
    "/tenant/history",
    "/tenant/payments",
    "/tenant/profile",
  ];

  // Shared routes (both roles can access)
  const sharedRoutes = ["/profile", "/settings", "/notifications"];

  // Check shared routes first
  const isSharedRoute = sharedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  if (isSharedRoute) {
    return response;
  }

  // Check tenant-only routes
  const isTenantOnlyRoute = tenantOnlyRoutes.some((route) =>
    pathname.startsWith(route),
  );
  if (userRole === "landlord" && isTenantOnlyRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Check landlord-only routes
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