import NextAuth from "next-auth";
import { NextResponse } from "next/server";

// Edge-safe instance: no DB/bcrypt imports here. Only decodes the already
// signed session cookie — role gating logic lives here, subscription checks
// live in dashboard/learn/layout.tsx (needs real DB access).
const { auth } = NextAuth({
  session: { strategy: "jwt" },
  // Must match src/lib/auth/config.ts — the middleware builds its own edge-safe
  // instance, so this is not inherited. Omitting it 500s in production.
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role as "teacher" | "admin";
      return session;
    },
  },
});

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // ── Redirects from old routes ──────────────────────────
  if (pathname.startsWith("/dashboard/learn/resources")) {
    return NextResponse.redirect(new URL("/subjects/primary/p1", req.nextUrl));
  }
  if (pathname.startsWith("/dashboard/learn/courses")) {
    return NextResponse.redirect(new URL("/courses", req.nextUrl));
  }
  if (pathname.startsWith("/dashboard/learn")) {
    return NextResponse.redirect(new URL("/courses", req.nextUrl));
  }
  if (pathname === "/dashboard/my-learning") {
    return NextResponse.redirect(new URL("/my-library", req.nextUrl));
  }
  if (pathname === "/dashboard/certificates") {
    return NextResponse.redirect(
      new URL("/my-library/certificates", req.nextUrl),
    );
  }

  // ── Auth protection ────────────────────────────────────
  const isProtected = pathname.startsWith("/dashboard");

  if (!isProtected) return;

  if (!req.auth) {
    return NextResponse.redirect(new URL("/sign-in", req.nextUrl));
  }

  // Strictly restrict admin dashboard to admin and sales agents only
  const role = req.auth.user?.role;
  if (role !== "admin" && role !== "sales_agent") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
