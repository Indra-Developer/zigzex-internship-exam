import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/auth/student-session";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { createOrGetAttempt, expireAttemptIfNeeded } from "@/lib/student/attempts";
import { serializeAttempt } from "@/lib/student/serializers";
import type { ExamLanguage } from "@/types/exam";

export async function GET() {
  try {
    const session = await requireStudentSession();
    const firestore = getFirebaseAdminFirestore();
    const snapshot = await firestore.collection("attempts").doc(session.uid).get();
    if (!snapshot.exists) return NextResponse.json({ attempt: null });
    const data = await expireAttemptIfNeeded(firestore, session.uid, snapshot.data() || {});
    return NextResponse.json({ attempt: serializeAttempt(session.uid, data) });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "STUDENT_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : "Unable to load examination." }, { status: unauthorized ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStudentSession();
    const body = (await request.json()) as { language?: unknown };
    if (body.language !== "python" && body.language !== "java") {
      return NextResponse.json({ error: "Select Python or Java before starting." }, { status: 400 });
    }
    const attempt = await createOrGetAttempt(getFirebaseAdminFirestore(), session.uid, body.language as ExamLanguage);
    return NextResponse.json({ attempt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start examination.";
    const status = message === "STUDENT_UNAUTHORIZED" ? 401 : message === "EXAM_DISABLED" ? 403 : message === "STUDENT_INACTIVE" ? 403 : message === "ATTEMPT_ALREADY_COMPLETED" ? 409 : 400;
    const errorText = message === "EXAM_DISABLED" ? "The examination is currently disabled by the administrator." : message === "ATTEMPT_ALREADY_COMPLETED" ? "This examination attempt is already closed." : message;
    return NextResponse.json({ error: status === 401 ? "Unauthorized." : errorText }, { status });
  }
}
