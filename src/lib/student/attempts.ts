import { randomInt } from "node:crypto";
import { FieldValue, Timestamp, type DocumentData, type Firestore } from "firebase-admin/firestore";
import type { ExamLanguage, StudentAttempt, ViolationKind } from "@/types/exam";
import { serializeAttempt, stripQuestionAnswer } from "@/lib/student/serializers";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function selectQuestions(documents: DocumentData[], language: ExamLanguage) {
  const technical = documents.filter((question) => question.category === "technical");
  const aptitude = documents.filter((question) => question.category === "aptitude");
  const programming = documents.filter((question) => question.category === language);

  if (technical.length < 20 || aptitude.length < 10 || programming.length < 20) {
    throw new Error("The question bank does not contain enough questions for this examination.");
  }

  const selected = [...shuffle(technical).slice(0, 20), ...shuffle(aptitude).slice(0, 10), ...shuffle(programming).slice(0, 20)];
  return shuffle(selected).map((question) => ({
    ...stripQuestionAnswer(question),
    options: shuffle(stripQuestionAnswer(question).options),
  }));
}

function isExpired(data: DocumentData) {
  const deadline = data.deadlineAt as Timestamp | undefined;
  return Boolean(deadline && deadline.toMillis() <= Date.now());
}

export async function expireAttemptIfNeeded(firestore: Firestore, attemptId: string, data: DocumentData) {
  if (data.status !== "in-progress" || !isExpired(data)) return data;

  const attemptRef = firestore.collection("attempts").doc(attemptId);
  const studentRef = firestore.collection("students").doc(String(data.studentUid));
  await firestore.runTransaction(async (transaction) => {
    const current = await transaction.get(attemptRef);
    if (!current.exists || current.data()?.status !== "in-progress" || !isExpired(current.data() || {})) return;
    transaction.update(attemptRef, { status: "expired", submittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    transaction.update(studentRef, { examStatus: "completed", updatedAt: FieldValue.serverTimestamp() });
  });

  const refreshed = await attemptRef.get();
  return refreshed.data() || data;
}

export async function createOrGetAttempt(firestore: Firestore, studentUid: string, language: ExamLanguage) {
  const attemptRef = firestore.collection("attempts").doc(studentUid);
  const studentRef = firestore.collection("students").doc(studentUid);
  const settingsRef = firestore.collection("examSettings").doc("main");
  const questionSnapshot = await firestore.collection("questions").get();
  const questionDocuments = questionSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }));

  const attemptData = await firestore.runTransaction(async (transaction) => {
    const [attemptSnapshot, studentSnapshot, settingsSnapshot] = await Promise.all([
      transaction.get(attemptRef),
      transaction.get(studentRef),
      transaction.get(settingsRef),
    ]);
    const studentData = studentSnapshot.data() || {};
    const settingsData = settingsSnapshot.data() || {};

    if (!studentSnapshot.exists || studentData.status !== "active") throw new Error("STUDENT_INACTIVE");
    if (!settingsSnapshot.exists || settingsData.enabled !== true) throw new Error("EXAM_DISABLED");
    if (studentData.examStatus === "completed") throw new Error("ATTEMPT_ALREADY_COMPLETED");

    if (attemptSnapshot.exists) {
      const current = attemptSnapshot.data() || {};
      if (current.status === "in-progress") return current;
      throw new Error("ATTEMPT_ALREADY_COMPLETED");
    }

    const durationMinutes = Number(settingsData.durationMinutes || 60);
    const startedAt = Timestamp.now();
    const deadlineAt = Timestamp.fromMillis(startedAt.toMillis() + durationMinutes * 60 * 1000);
    const questions = selectQuestions(questionDocuments, language);
    const newAttempt = {
      studentUid,
      language,
      status: "in-progress",
      questions,
      answers: {},
      startedAt,
      deadlineAt,
      submittedAt: null,
      violationCount: 0,
      cutoffMarksAtStart: Number(settingsData.cutoffMarks ?? 60),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.set(attemptRef, newAttempt);
    transaction.update(studentRef, { examStatus: "in-progress", updatedAt: FieldValue.serverTimestamp() });
    return newAttempt;
  });

  return serializeAttempt(studentUid, { ...attemptData, studentUid });
}

export function validateAnswers(attempt: StudentAttempt, answers: Record<string, unknown>) {
  const allowed = new Map(attempt.questions.map((question) => [question.id, new Set(question.options.map((option) => option.id))]));
  const sanitized: Record<string, string> = {};
  for (const [questionId, answer] of Object.entries(answers)) {
    if (!allowed.has(questionId) || typeof answer !== "string" || !allowed.get(questionId)?.has(answer)) continue;
    sanitized[questionId] = answer;
  }
  return sanitized;
}

export const allowedViolationKinds: ViolationKind[] = [
  "tab-hidden",
  "fullscreen-exit",
  "webcam-permission-denied",
  "webcam-interrupted",
  "webcam-unavailable",
  "microphone-interrupted",
];
