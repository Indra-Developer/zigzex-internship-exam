import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { serializeResult } from "@/lib/results/serializers";
import type { StudentResult } from "@/types/result";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export async function finalizeAttempt(firestore: Firestore, studentUid: string): Promise<StudentResult> {
  const attemptRef = firestore.collection("attempts").doc(studentUid);
  const resultRef = firestore.collection("results").doc(studentUid);
  const [attemptSnapshot, profileSnapshot, questionSnapshot] = await Promise.all([
    attemptRef.get(),
    firestore.collection("students").doc(studentUid).get(),
    firestore.collection("questions").get(),
  ]);

  if (!attemptSnapshot.exists) throw new Error("ATTEMPT_NOT_FOUND");
  if (!profileSnapshot.exists) throw new Error("STUDENT_NOT_FOUND");

  const attempt = attemptSnapshot.data() || {};
  const existing = await resultRef.get();
  if (existing.exists) return serializeResult(resultRef.id, existing.data() || {});

  const deadline = attempt.deadlineAt;
  if (attempt.status === "in-progress" && (!deadline?.toMillis || deadline.toMillis() > Date.now())) {
    throw new Error("ATTEMPT_NOT_SUBMITTED");
  }

  const questionKey = new Map(questionSnapshot.docs.map((document) => [document.id, document.data()]));
  const answers = attempt.answers && typeof attempt.answers === "object" ? attempt.answers as Record<string, string> : {};
  let technicalMarks = 0;
  let aptitudeMarks = 0;
  let programmingMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  for (const assigned of Array.isArray(attempt.questions) ? attempt.questions : []) {
    const bankQuestion = questionKey.get(String(assigned.id));
    if (!bankQuestion) continue;
    const answer = answers[String(assigned.id)];
    const marks = Number(bankQuestion.marks || 2);
    if (!answer) {
      unansweredCount += 1;
      continue;
    }
    if (answer === bankQuestion.correctOption) {
      correctCount += 1;
      if (assigned.category === "technical") technicalMarks += marks;
      else if (assigned.category === "aptitude") aptitudeMarks += marks;
      else programmingMarks += marks;
    } else {
      incorrectCount += 1;
    }
  }

  const totalMarks = technicalMarks + aptitudeMarks + programmingMarks;
  const totalPossible = 100;
  const cutoffMarks = Number(attempt.cutoffMarksAtStart ?? 60);
  const resultData = {
    studentUid,
    studentName: String(profileSnapshot.data()?.fullName || "Student"),
    email: String(profileSnapshot.data()?.email || ""),
    photoUrl: String(profileSnapshot.data()?.photoUrl || ""),
    language: attempt.language === "java" ? "java" : "python",
    status: "complete",
    technicalMarks,
    aptitudeMarks,
    programmingMarks,
    totalMarks,
    totalPossible,
    percentage: round((totalMarks / totalPossible) * 100),
    cutoffMarks,
    qualification: totalMarks >= cutoffMarks ? "QUALIFIED" : "NOT QUALIFIED",
    correctCount,
    incorrectCount,
    unansweredCount,
    submittedAt: attempt.submittedAt || FieldValue.serverTimestamp(),
    evaluatedAt: FieldValue.serverTimestamp(),
    recordedViolations: Number(attempt.violationCount || 0),
  };

  await firestore.runTransaction(async (transaction) => {
    const [latestAttempt, latestResult] = await Promise.all([transaction.get(attemptRef), transaction.get(resultRef)]);
    if (latestResult.exists) return;
    const latestData = latestAttempt.data() || {};
    const latestDeadline = latestData.deadlineAt;
    if (latestData.status === "in-progress" && (!latestDeadline?.toMillis || latestDeadline.toMillis() > Date.now())) throw new Error("ATTEMPT_NOT_SUBMITTED");
    transaction.set(resultRef, resultData);
    transaction.update(attemptRef, { resultId: studentUid, evaluatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  });

  const saved = await resultRef.get();
  return serializeResult(resultRef.id, saved.data() || resultData);
}
