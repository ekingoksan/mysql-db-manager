import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionUser } from "@/lib/session";

type SessionData = { user?: SessionUser };

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  const isAuth = !!session.user;
  const url = req.nextUrl;

  // Public routes
  const publicPaths = ["/login", "/register", "/api/auth"];
  const isPublic = publicPaths.some((path) => url.pathname.startsWith(path));

  // If not logged in and not public → redirect to /login
  if (!isAuth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If logged in and trying to access /login or /register → redirect to dashboard
  if (isAuth && ["/login", "/register"].includes(url.pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};