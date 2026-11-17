import type { ExamSettings, StudentStatus } from "@/types/admin";

export function getString(value: unknown, field: string, required = true) {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return "";
    throw new Error(`${field} must be text.`);
  }
  const trimmed = value.trim();
  if (required && !trimmed) throw new Error(`${field} is required.`);
  return trimmed;
}

export function validateStudentInput(body: Record<string, unknown>) {
  const fullName = getString(body.fullName, "Full name");
  const email = getString(body.email, "Email address").toLowerCase();
  const password = getString(body.password, "Password");
  const photoUrl = getString(body.photoUrl, "Photo URL", false);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (photoUrl && !/^https?:\/\//i.test(photoUrl)) throw new Error("Photo URL must start with http:// or https://.");
  return { fullName, email, password, photoUrl };
}

export function validateStudentUpdate(body: Record<string, unknown>) {
  const fullName = getString(body.fullName, "Full name");
  const photoUrl = getString(body.photoUrl, "Photo URL", false);
  const password = getString(body.password, "New password", false);
  const status = body.status as StudentStatus;
  if (photoUrl && !/^https?:\/\//i.test(photoUrl)) throw new Error("Photo URL must start with http:// or https://.");
  if (status !== "active" && status !== "inactive") throw new Error("Student status is invalid.");
  if (password && password.length < 6) throw new Error("New password must be at least 6 characters.");
  return { fullName, photoUrl, password, status };
}

export function validateSettingsInput(body: Record<string, unknown>): Omit<ExamSettings, "updatedAt"> {
  const name = getString(body.name, "Examination name");
  const durationMinutes = Number(body.durationMinutes);
  const cutoffMarks = Number(body.cutoffMarks);
  const enabled = body.enabled === true;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 180) throw new Error("Duration must be a whole number from 1 to 180 minutes.");
  if (!Number.isInteger(cutoffMarks) || cutoffMarks < 0 || cutoffMarks > 100) throw new Error("Cutoff marks must be a whole number from 0 to 100.");
  return { name, durationMinutes, totalMarks: 100, cutoffMarks, enabled };
}
