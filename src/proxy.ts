import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Next.js 16 renamed Middleware to Proxy (same functionality, see node_modules/next/dist/docs).
// This is an *optimistic* redirect only — every Server Action / Route Handler still calls
// requirePermission()/requireSession() independently; this just avoids a flash of protected UI.
export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const { pathname } = req.nextUrl;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");
  // Public seller lead-capture forms (src/app/f/[token]) — reachable signed in or out.
  if (pathname.startsWith("/f/")) return;

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
