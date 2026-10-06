export const SESSION_COOKIE = "ft_session";
export const SESSION_DAYS = 30;

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

async function hmac(passcode: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passcode),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

export function passcode(): string | null {
  const value = process.env.APP_PASSCODE?.trim();
  return value ? value : null;
}

export function passcodeMatches(input: string, expected: string): boolean {
  return safeEqual(input, expected);
}

export async function signSession(secret: string, now = Date.now()): Promise<string> {
  const exp = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ exp })));
  const signature = await hmac(secret, payload);
  return `${payload}.${signature}`;
}

export async function readSession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await hmac(secret, payload);
  if (!safeEqual(signature, expected)) return false;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as { exp?: number };
    return typeof parsed.exp === "number" && parsed.exp > now;
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
