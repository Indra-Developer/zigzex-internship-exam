import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { serializeStudent } from "@/lib/admin/serializers";
import { validateStudentInput } from "@/lib/admin/validation";

export async function GET() {
  try {
    await requireAdminSession();
    const snapshot = await getFirebaseAdminFirestore().collection("students").get();
    const students = snapshot.docs
      .map((document) => serializeStudent(document.id, document.data()))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return NextResponse.json({ students });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "ADMIN_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : "Unable to load students." }, { status: unauthorized ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = (await request.json()) as Record<string, unknown>;
    const student = validateStudentInput(body);
    const auth = getFirebaseAdminAuth();
    const firestore = getFirebaseAdminFirestore();
    const user = await auth.createUser({
      email: student.email,
      password: student.password,
      displayName: student.fullName,
      ...(student.photoUrl ? { photoURL: student.photoUrl } : {}),
      disabled: false,
    });

    try {
      await firestore.collection("students").doc(user.uid).set({
        uid: user.uid,
        fullName: student.fullName,
        email: student.email,
        photoUrl: student.photoUrl,
        status: "active",
        examStatus: "not-started",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (firestoreError) {
      await auth.deleteUser(user.uid);
      throw firestoreError;
    }

    return NextResponse.json({
      student: {
        uid: user.uid,
        fullName: student.fullName,
        email: student.email,
        photoUrl: student.photoUrl,
        status: "active",
        examStatus: "not-started",
        createdAt: null,
        updatedAt: null,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create student.";
    const unauthorized = message === "ADMIN_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : message }, { status: unauthorized ? 401 : 400 });
  }
}
