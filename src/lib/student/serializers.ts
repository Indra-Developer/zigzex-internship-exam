import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import type { StudentAttempt, StudentQuestion } from "@/types/exam";

function timestampToIso(value: unknown) {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as Timestamp).toDate().toISOString();
  }
  return typeof value === "string" ? value : null;
}

export function stripQuestionAnswer(data: DocumentData): StudentQuestion {
  return {
    id: String(data.id),
    category: data.category,
    question: String(data.question),
    options: Array.isArray(data.options) ? data.options.map((option) => ({ id: String(option.id), text: String(option.text) })) : [],
    marks: Number(data.marks || 2),
  };
}

export function serializeAttempt(id: string, data: DocumentData): StudentAttempt {
  return {
    id,
    studentUid: String(data.studentUid),
    language: data.language === "java" ? "java" : "python",
    status: data.status === "submitted" ? "submitted" : data.status === "expired" ? "expired" : "in-progress",
    questions: Array.isArray(data.questions) ? data.questions.map((question) => stripQuestionAnswer(question)) : [],
    answers: data.answers && typeof data.answers === "object" ? Object.fromEntries(Object.entries(data.answers)) : {},
    startedAt: timestampToIso(data.startedAt) || new Date(0).toISOString(),
    deadlineAt: timestampToIso(data.deadlineAt) || new Date(0).toISOString(),
    submittedAt: timestampToIso(data.submittedAt),
    violationCount: Number(data.violationCount || 0),
    cutoffMarksAtStart: Number(data.cutoffMarksAtStart ?? 60),
  };
}

export function serializeAttemptSummary(id: string, data: DocumentData) {
  const attempt = serializeAttempt(id, data);
  return {
    id: attempt.id,
    language: attempt.language,
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    submittedAt: attempt.submittedAt,
    violationCount: attempt.violationCount,
  };
}
