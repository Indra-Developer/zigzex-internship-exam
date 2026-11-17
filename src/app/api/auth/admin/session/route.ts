import { NextResponse } from "next/server";
import { createAdminSessionCookie, getAdminSessionCookieName } from "@/lib/auth/admin-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: unknown };
    if (typeof body.idToken !== "string" || !body.idToken) {
      return NextResponse.json({ error: "A Firebase ID token is required." }, { status: 400 });
    }

    const sessionCookie = await createAdminSessionCookie(body.idToken);
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: getAdminSessionCookieName(),
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 5 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create admin session.";
    console.error("Admin session creation failed:", message);
    const status = message === "ADMIN_EMAIL_NOT_ALLOWED" ? 403 : 401;
    const errorMessage = message === "ADMIN_EMAIL_NOT_ALLOWED"
      ? "This account is not an allowed admin."
      : message.startsWith("Firebase Admin") || message.startsWith("FIREBASE_PRIVATE_KEY")
        ? "The server Firebase configuration is invalid. Check the Vercel Firebase Admin environment variables."
        : message;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
