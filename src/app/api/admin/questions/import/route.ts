import { NextResponse } from "next/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { validateQuestionBank } from "@/lib/questions/validation";
import questionBank from "@/data/question-bank.json";

export async function POST() {
  try {
    await requireAdminSession();
    const questions = validateQuestionBank(questionBank);
    const firestore = getFirebaseAdminFirestore();
    const batch = firestore.batch();
    for (const question of questions) {
      batch.set(firestore.collection("questions").doc(question.id), { ...question, importedAt: new Date() });
    }
    await batch.commit();
    return NextResponse.json({ imported: questions.length, message: "Question bank imported successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import question bank.";
    const unauthorized = message === "ADMIN_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : message }, { status: unauthorized ? 401 : 400 });
  }
}
