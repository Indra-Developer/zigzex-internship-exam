import type { QuestionCategory } from "@/lib/questions/validation";

export type ExamLanguage = "python" | "java";
export type AttemptStatus = "in-progress" | "submitted" | "expired";
export type ViolationKind =
  | "tab-hidden"
  | "fullscreen-exit"
  | "webcam-permission-denied"
  | "webcam-interrupted"
  | "webcam-unavailable"
  | "microphone-interrupted";

export type StudentQuestion = {
  id: string;
  category: Exclude<QuestionCategory, "java" | "python"> | "python" | "java";
  question: string;
  options: { id: string; text: string }[];
  marks: number;
};

export type StudentAttempt = {
  id: string;
  studentUid: string;
  language: ExamLanguage;
  status: AttemptStatus;
  questions: StudentQuestion[];
  answers: Record<string, string>;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  violationCount: number;
  cutoffMarksAtStart: number;
};

export type StudentMe = {
  student: {
    uid: string;
    fullName: string;
    email: string;
    photoUrl: string;
    status: "active" | "inactive";
    examStatus: "not-started" | "in-progress" | "completed";
  };
  settings: {
    name: string;
    durationMinutes: number;
    totalMarks: number;
    cutoffMarks: number;
    enabled: boolean;
  };
  attempt: Pick<StudentAttempt, "id" | "language" | "status" | "startedAt" | "deadlineAt" | "submittedAt" | "violationCount"> | null;
  canStart: boolean;
};
