import { NextResponse } from "next/server";
import { requireStudentSession } from "@/lib/auth/student-session";
import { serializeSettings } from "@/lib/admin/serializers";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { expireAttemptIfNeeded } from "@/lib/student/attempts";
import { serializeAttemptSummary } from "@/lib/student/serializers";

export async function GET() {
  try {
    const session = await requireStudentSession();
    const firestore = getFirebaseAdminFirestore();
    const [profileSnapshot, settingsSnapshot, attemptSnapshot] = await Promise.all([
      firestore.collection("students").doc(session.uid).get(),
      firestore.collection("examSettings").doc("main").get(),
      firestore.collection("attempts").doc(session.uid).get(),
    ]);

    if (!profileSnapshot.exists) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    const profile = profileSnapshot.data() || {};
    const settings = settingsSnapshot.exists ? serializeSettings(settingsSnapshot.data() || {}) : serializeSettings({});
    let attempt = null;
    if (attemptSnapshot.exists) {
      const data = await expireAttemptIfNeeded(firestore, session.uid, attemptSnapshot.data() || {});
      attempt = serializeAttemptSummary(session.uid, data);
    }

    return NextResponse.json({
      student: {
        uid: session.uid,
        fullName: String(profile.fullName || "Student"),
        email: String(profile.email || session.email),
        photoUrl: String(profile.photoUrl || ""),
        status: profile.status === "inactive" ? "inactive" : "active",
        examStatus: profile.examStatus === "completed" ? "completed" : profile.examStatus === "in-progress" ? "in-progress" : "not-started",
      },
      settings: {
        name: settings.name,
        durationMinutes: settings.durationMinutes,
        totalMarks: settings.totalMarks,
        cutoffMarks: settings.cutoffMarks,
        enabled: settings.enabled,
      },
      attempt,
      canStart: profile.status === "active" && settings.enabled === true && !attempt,
    });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "STUDENT_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : "Unable to load student profile." }, { status: unauthorized ? 401 : 500 });
  }
}
