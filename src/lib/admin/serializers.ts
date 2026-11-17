import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import type { ExamSettings, StudentProfile } from "@/types/admin";

function timestampToIso(value: unknown) {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as Timestamp).toDate().toISOString();
  }
  return typeof value === "string" ? value : null;
}

export function serializeStudent(uid: string, data: DocumentData): StudentProfile {
  return {
    uid,
    fullName: String(data.fullName || ""),
    email: String(data.email || ""),
    photoUrl: String(data.photoUrl || ""),
    status: data.status === "inactive" ? "inactive" : "active",
    examStatus: data.examStatus === "completed" ? "completed" : data.examStatus === "in-progress" ? "in-progress" : "not-started",
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export function serializeSettings(data: DocumentData): ExamSettings {
  return {
    name: String(data.name || "ZIGZEX Internship Entrance Examination"),
    durationMinutes: Number(data.durationMinutes || 60),
    totalMarks: Number(data.totalMarks || 100),
    cutoffMarks: Number(data.cutoffMarks ?? 60),
    enabled: data.enabled === true,
    updatedAt: timestampToIso(data.updatedAt),
  };
}
