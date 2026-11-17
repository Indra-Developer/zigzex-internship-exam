import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import type { StudentResult } from "@/types/result";

function timestampToIso(value: unknown) {
  if (!value) return new Date(0).toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) return (value as Timestamp).toDate().toISOString();
  return typeof value === "string" ? value : new Date(0).toISOString();
}

export function serializeResult(id: string, data: DocumentData): StudentResult {
  return {
    id,
    studentUid: String(data.studentUid || id),
    studentName: String(data.studentName || "Student"),
    email: String(data.email || ""),
    photoUrl: String(data.photoUrl || ""),
    language: data.language === "java" ? "java" : "python",
    status: "complete",
    technicalMarks: Number(data.technicalMarks || 0),
    aptitudeMarks: Number(data.aptitudeMarks || 0),
    programmingMarks: Number(data.programmingMarks || 0),
    totalMarks: Number(data.totalMarks || 0),
    totalPossible: Number(data.totalPossible || 100),
    percentage: Number(data.percentage || 0),
    cutoffMarks: Number(data.cutoffMarks || 0),
    qualification: data.qualification === "QUALIFIED" ? "QUALIFIED" : "NOT QUALIFIED",
    correctCount: Number(data.correctCount || 0),
    incorrectCount: Number(data.incorrectCount || 0),
    unansweredCount: Number(data.unansweredCount || 0),
    submittedAt: timestampToIso(data.submittedAt),
    evaluatedAt: timestampToIso(data.evaluatedAt),
    recordedViolations: Number(data.recordedViolations || 0),
  };
}
