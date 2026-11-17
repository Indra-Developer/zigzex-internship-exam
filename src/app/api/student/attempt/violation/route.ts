import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireStudentSession } from "@/lib/auth/student-session";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { allowedViolationKinds } from "@/lib/student/attempts";

export async function POST(request: Request) {
  try {
    const session = await requireStudentSession();
    const body = (await request.json()) as { kind?: unknown };
    if (typeof body.kind !== "string" || !allowedViolationKinds.includes(body.kind as (typeof allowedViolationKinds)[number])) {
      return NextResponse.json({ error: "Unsupported monitoring event." }, { status: 400 });
    }

    const firestore = getFirebaseAdminFirestore();
    const attemptRef = firestore.collection("attempts").doc(session.uid);
    const violationRef = firestore.collection("violations").doc();
    await firestore.runTransaction(async (transaction) => {
      const attempt = await transaction.get(attemptRef);
      if (!attempt.exists || attempt.data()?.status !== "in-progress") return;
      transaction.set(violationRef, { studentUid: session.uid, attemptId: session.uid, kind: body.kind, createdAt: FieldValue.serverTimestamp() });
      transaction.update(attemptRef, { violationCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
    });
    return NextResponse.json({ logged: true });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "STUDENT_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : "Unable to log monitoring event." }, { status: unauthorized ? 401 : 400 });
  }
}
