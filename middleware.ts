import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next();
  
  // Add current URL to headers for layout access
  res.headers.set('x-url', req.url);
  res.headers.set('x-pathname', req.nextUrl.pathname);

  // Create Supabase client for middleware using @supabase/ssr
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: "",
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Use getUser() for secure authentication check
  const { data: { user } } = await supabase.auth.getUser();
  
  const pathname = req.nextUrl.pathname;

  // Only intercept /admin routes
  if (pathname.startsWith("/admin")) {
    
    // 1. Handle Login Page
    if (pathname === "/admin/login") {
      // If already logged in, redirect to appropriate dashboard
      if (user) {
        const { data: userRow } = await supabase
          .from("users")
          .select("role")
          .eq("auth_uid", user.id)
          .single();
        
        const typedUserRow = userRow as { role?: string } | null;
        if (typedUserRow?.role === "super_admin") {
          console.log("🔀 Middleware: Redirecting super_admin from login to dashboard");
          return NextResponse.redirect(new URL("/admin/dashboard", req.url));
        } else if (typedUserRow?.role === "admin") {
          console.log("🔀 Middleware: Redirecting admin from login to inventory");
          return NextResponse.redirect(new URL("/admin/inventory", req.url));
        }
      }
      return res;
    }

    // 2. Require Session for all other /admin routes
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    // 3. Fetch User Role
    const { data: userRow } = await supabase
      .from("users")
      .select("role")
      .eq("auth_uid", user.id)
      .single();

    const typedUserRow2 = userRow as { role?: string } | null;
    // If user not found or no role, redirect to login
    if (!typedUserRow2 || !typedUserRow2.role) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    const role = typedUserRow2.role;

    // 4. Super Admin Routes Protection
    if (pathname.startsWith("/admin/super")) {
      if (role !== "super_admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
    }
    
    // 5. Staff Routes Protection (Phase 3)
    // Staff can only access orders and shipping routes
    if (role === "staff") {
      const allowedStaffRoutes = [
        "/admin/orders",
        "/admin/shipping",
        "/admin/dashboard",
      ];
      const isAllowedRoute = allowedStaffRoutes.some(route => 
        pathname === route || pathname.startsWith(route + "/")
      );
      if (!isAllowedRoute) {
        return NextResponse.redirect(new URL("/admin/orders", req.url));
      }
    }
    
    // 6. General Admin Routes Protection
    // Admin and super_admin can access all routes (except /admin/super which is handled above)
    if (role !== "admin" && role !== "super_admin" && role !== "staff") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
