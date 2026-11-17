import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { expireAttemptIfNeeded } from "@/lib/student/attempts";
import { finalizeAttempt } from "@/lib/results/evaluation";
import { serializeResult } from "@/lib/results/serializers";

export async function GET() {
  try {
    await requireAdminSession();
    const firestore = getFirebaseAdminFirestore();
    const attempts = await firestore.collection("attempts").get();
    for (const attempt of attempts.docs) {
      const data = await expireAttemptIfNeeded(firestore, attempt.id, attempt.data());
      if (data.status !== "in-progress") await finalizeAttempt(firestore, attempt.id).catch(() => undefined);
    }

    const results = await firestore.collection("results").get();
    return NextResponse.json({ results: results.docs.map((document) => serializeResult(document.id, document.data())).sort((a, b) => b.totalMarks - a.totalMarks || b.submittedAt.localeCompare(a.submittedAt)) });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "ADMIN_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : "Unable to load results." }, { status: unauthorized ? 401 : 500 });
  }
}
