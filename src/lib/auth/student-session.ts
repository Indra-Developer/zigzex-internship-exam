import { cookies } from "next/headers";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";

const defaultCookieName = "zigzex_student_session";
const sessionDurationMs = 24 * 60 * 60 * 1000;

export function getStudentSessionCookieName() {
  return process.env.STUDENT_SESSION_COOKIE || defaultCookieName;
}

export async function getStudentSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(getStudentSessionCookieName())?.value;
    if (!sessionCookie) return null;

    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    const user = await getFirebaseAdminAuth().getUser(decoded.uid);
    if (user.disabled) return null;

    const profile = await getFirebaseAdminFirestore().collection("students").doc(decoded.uid).get();
    if (!profile.exists || profile.data()?.status !== "active") return null;

    return {
      uid: decoded.uid,
      email: decoded.email || user.email || "",
    };
  } catch {
    return null;
  }
}

export async function requireStudentSession() {
  const session = await getStudentSession();
  if (!session) throw new Error("STUDENT_UNAUTHORIZED");
  return session;
}

export async function createStudentSessionCookie(idToken: string) {
  const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
  const user = await getFirebaseAdminAuth().getUser(decoded.uid);
  if (user.disabled) throw new Error("STUDENT_INACTIVE");

  const profile = await getFirebaseAdminFirestore().collection("students").doc(decoded.uid).get();
  if (!profile.exists) throw new Error("STUDENT_NOT_FOUND");
  if (profile.data()?.status !== "active") throw new Error("STUDENT_INACTIVE");

  return getFirebaseAdminAuth().createSessionCookie(idToken, { expiresIn: sessionDurationMs });
}
