import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireStudentSession } from "@/lib/auth/student-session";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { finalizeAttempt } from "@/lib/results/evaluation";

export async function POST(request: Request) {
  try {
    const session = await requireStudentSession();
    const body = (await request.json().catch(() => ({}))) as { reason?: unknown };
    const reason = body.reason === "timeout" ? "timeout" : "manual";
    const firestore = getFirebaseAdminFirestore();
    const attemptRef = firestore.collection("attempts").doc(session.uid);
    const studentRef = firestore.collection("students").doc(session.uid);
    const result = await firestore.runTransaction(async (transaction) => {
      const attempt = await transaction.get(attemptRef);
      if (!attempt.exists) throw new Error("ATTEMPT_NOT_FOUND");
      const data = attempt.data() || {};
      if (data.status !== "in-progress") return { status: data.status };
      const deadline = data.deadlineAt;
      const timedOut = reason === "timeout" || Boolean(deadline?.toMillis && deadline.toMillis() <= Date.now());
      const status = timedOut ? "expired" : "submitted";
      transaction.update(attemptRef, { status, submittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      transaction.update(studentRef, { examStatus: "completed", updatedAt: FieldValue.serverTimestamp() });
      return { status };
    });
    const finalResult = await finalizeAttempt(firestore, session.uid);
    return NextResponse.json({ submitted: true, status: result.status, result: finalResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit examination.";
    const status = message === "STUDENT_UNAUTHORIZED" ? 401 : message === "ATTEMPT_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: status === 401 ? "Unauthorized." : status === 404 ? "Examination attempt not found." : message }, { status });
  }
}
