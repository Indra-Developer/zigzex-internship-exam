export type StudentStatus = "active" | "inactive";
export type ExamStatus = "not-started" | "in-progress" | "completed";

export type StudentProfile = {
  uid: string;
  fullName: string;
  email: string;
  photoUrl: string;
  status: StudentStatus;
  examStatus: ExamStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ExamSettings = {
  name: string;
  durationMinutes: number;
  totalMarks: number;
  cutoffMarks: number;
  enabled: boolean;
  updatedAt: string | null;
};

export type DashboardSummary = {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  completedExaminations: number;
};
