import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, passcode, readSession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = passcode();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = secret ? await readSession(token, secret) : false;
  const loginRoute = pathname === "/login" || pathname === "/api/login";

  if (loginRoute) {
    if (signedIn && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!signedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|sw.js|manifest.webmanifest).*)",
  ],
};
