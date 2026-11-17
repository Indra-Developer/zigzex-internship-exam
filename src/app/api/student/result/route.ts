import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/auth/student-session";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { finalizeAttempt } from "@/lib/results/evaluation";
import { serializeResult } from "@/lib/results/serializers";

export async function GET() {
  try {
    const session = await requireStudentSession();
    const firestore = getFirebaseAdminFirestore();
    const resultRef = firestore.collection("results").doc(session.uid);
    const resultSnapshot = await resultRef.get();
    if (resultSnapshot.exists) return NextResponse.json({ result: serializeResult(resultRef.id, resultSnapshot.data() || {}) });

    const attempt = await firestore.collection("attempts").doc(session.uid).get();
    if (attempt.exists && attempt.data()?.status !== "in-progress") {
      return NextResponse.json({ result: await finalizeAttempt(firestore, session.uid) });
    }
    return NextResponse.json({ result: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load result.";
    const status = message === "STUDENT_UNAUTHORIZED" ? 401 : message === "ATTEMPT_NOT_SUBMITTED" ? 409 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized." : message }, { status });
  }
}
