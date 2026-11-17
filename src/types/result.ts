export type QualificationStatus = "QUALIFIED" | "NOT QUALIFIED";

export type StudentResult = {
  id: string;
  studentUid: string;
  studentName: string;
  email: string;
  photoUrl: string;
  language: "python" | "java";
  status: "complete";
  technicalMarks: number;
  aptitudeMarks: number;
  programmingMarks: number;
  totalMarks: number;
  totalPossible: number;
  percentage: number;
  cutoffMarks: number;
  qualification: QualificationStatus;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  submittedAt: string;
  evaluatedAt: string;
  recordedViolations: number;
};
