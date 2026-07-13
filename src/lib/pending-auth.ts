import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pending_auth";
const MAX_AGE_SECONDS = 5 * 60; // 5 Minuten Zeitfenster für den 2FA-Schritt

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET fehlt");
  // 32 Byte Schlüssel aus dem Secret ableiten
  return new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32));
}

export async function setPendingAuthCookie(email: string, password: string) {
  const token = await new EncryptJWT({ email, password })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .encrypt(getKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function readPendingAuthCookie(): Promise<{ email: string; password: string } | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, getKey());
    return { email: payload.email as string, password: payload.password as string };
  } catch {
    return null;
  }
}

export async function clearPendingAuthCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
