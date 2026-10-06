import { NextResponse } from "next/server";
import { passcode, passcodeMatches, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";
import { clientIp } from "@/lib/request";
import { loginLocked, recordLogin } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = passcode();
  if (!secret) {
    return NextResponse.json({ error: "APP_PASSCODE is not set." }, { status: 500 });
  }

  const ip = clientIp(request);
  if (await loginLocked(ip)) {
    return NextResponse.json(
      { error: "Too many tries. Wait 15 minutes, then try again." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { passcode?: string };
  const given = body.passcode?.trim() ?? "";
  if (!given || !passcodeMatches(given, secret)) {
    await recordLogin(ip, false);
    return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
  }

  await recordLogin(ip, true);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await signSession(secret), sessionCookieOptions());
  return response;
}
