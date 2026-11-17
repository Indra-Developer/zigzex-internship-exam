import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

export async function GET() {
  try {
    await requireAdminSession();
    const snapshot = await getFirebaseAdminFirestore().collection("students").get();
    let activeStudents = 0;
    let completedExaminations = 0;

    snapshot.forEach((document) => {
      const data = document.data();
      if (data.status !== "inactive") activeStudents += 1;
      if (data.examStatus === "completed") completedExaminations += 1;
    });

    return NextResponse.json({
      totalStudents: snapshot.size,
      activeStudents,
      inactiveStudents: snapshot.size - activeStudents,
      completedExaminations,
    });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "ADMIN_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : "Unable to load dashboard." }, { status: unauthorized ? 401 : 500 });
  }
}
