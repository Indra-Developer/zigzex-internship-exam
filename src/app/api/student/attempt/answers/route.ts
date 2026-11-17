import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireStudentSession } from "@/lib/auth/student-session";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { expireAttemptIfNeeded, validateAnswers } from "@/lib/student/attempts";
import { serializeAttempt } from "@/lib/student/serializers";

export async function PATCH(request: Request) {
  try {
    const session = await requireStudentSession();
    const body = (await request.json()) as { answers?: unknown };
    if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
      return NextResponse.json({ error: "Answers must be an object." }, { status: 400 });
    }

    const firestore = getFirebaseAdminFirestore();
    const attemptRef = firestore.collection("attempts").doc(session.uid);
    const snapshot = await attemptRef.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Examination attempt not found." }, { status: 404 });
    const currentData = await expireAttemptIfNeeded(firestore, session.uid, snapshot.data() || {});
    const current = serializeAttempt(session.uid, currentData);
    if (current.status !== "in-progress") return NextResponse.json({ error: "This examination is already closed." }, { status: 409 });

    const answers = validateAnswers(current, body.answers as Record<string, unknown>);
    await firestore.runTransaction(async (transaction) => {
      const latest = await transaction.get(attemptRef);
      if (!latest.exists || latest.data()?.status !== "in-progress") throw new Error("ATTEMPT_CLOSED");
      const deadlineAt = latest.data()?.deadlineAt;
      if (deadlineAt?.toMillis && deadlineAt.toMillis() <= Date.now()) throw new Error("ATTEMPT_EXPIRED");
      transaction.update(attemptRef, { answers, updatedAt: FieldValue.serverTimestamp() });
    });
    return NextResponse.json({ saved: true, answers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save answers.";
    const status = message === "STUDENT_UNAUTHORIZED" ? 401 : message === "ATTEMPT_CLOSED" || message === "ATTEMPT_EXPIRED" ? 409 : 400;
    return NextResponse.json({ error: status === 401 ? "Unauthorized." : "This examination is already closed." }, { status });
  }
}
