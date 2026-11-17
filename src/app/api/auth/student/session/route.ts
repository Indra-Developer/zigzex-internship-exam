import { NextResponse } from "next/server";
import { createStudentSessionCookie, getStudentSessionCookieName } from "@/lib/auth/student-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: unknown };
    if (typeof body.idToken !== "string" || !body.idToken) {
      return NextResponse.json({ error: "A Firebase ID token is required." }, { status: 400 });
    }

    const sessionCookie = await createStudentSessionCookie(body.idToken);
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: getStudentSessionCookieName(),
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create student session.";
    console.error("Student session creation failed:", message);
    const errorText = message === "STUDENT_INACTIVE" ? "This student account is inactive." : message === "STUDENT_NOT_FOUND" ? "This account is not registered as a student." : "Unable to sign in.";
    return NextResponse.json({ error: errorText }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getStudentSessionCookieName(),
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
