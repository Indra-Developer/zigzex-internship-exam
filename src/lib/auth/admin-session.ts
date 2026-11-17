import { cookies } from "next/headers";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

const defaultCookieName = "zigzex_admin_session";
const sessionDurationMs = 5 * 24 * 60 * 60 * 1000;

export function getAdminSessionCookieName() {
  return process.env.ADMIN_SESSION_COOKIE || defaultCookieName;
}

export function isAllowedAdminEmail(email: string | undefined | null) {
  if (!email) return false;
  const allowedEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowedEmails.includes(email.toLowerCase());
}

export async function getAdminSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(getAdminSessionCookieName())?.value;
    if (!sessionCookie) return null;
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    if (!isAllowedAdminEmail(decoded.email)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) throw new Error("ADMIN_UNAUTHORIZED");
  return session;
}

export async function createAdminSessionCookie(idToken: string) {
  const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
  if (!isAllowedAdminEmail(decoded.email)) throw new Error("ADMIN_EMAIL_NOT_ALLOWED");
  return getFirebaseAdminAuth().createSessionCookie(idToken, { expiresIn: sessionDurationMs });
}
