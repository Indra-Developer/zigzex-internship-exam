import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { serializeStudent } from "@/lib/admin/serializers";
import { validateStudentUpdate } from "@/lib/admin/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await requireAdminSession();
    const { uid } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const update = validateStudentUpdate(body);
    const auth = getFirebaseAdminAuth();
    const firestore = getFirebaseAdminFirestore();

    await auth.updateUser(uid, {
      displayName: update.fullName,
      photoURL: update.photoUrl || undefined,
      disabled: update.status === "inactive",
      ...(update.password ? { password: update.password } : {}),
    });
    await firestore.collection("students").doc(uid).update({
      fullName: update.fullName,
      photoUrl: update.photoUrl,
      status: update.status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updated = await firestore.collection("students").doc(uid).get();
    return NextResponse.json({ student: serializeStudent(uid, updated.data() || {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update student.";
    const unauthorized = message === "ADMIN_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : message }, { status: unauthorized ? 401 : 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  try {
    await requireAdminSession();
    const { uid } = await params;
    const auth = getFirebaseAdminAuth();
    const firestore = getFirebaseAdminFirestore();
    const profileRef = firestore.collection("students").doc(uid);
    const profile = await profileRef.get();

    if (!profile.exists) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    if (profile.data()?.examStatus !== "not-started") {
      return NextResponse.json({ error: "Students cannot be deleted after an examination has started. Deactivate the account instead." }, { status: 409 });
    }

    const profileData = profile.data() || {};
    await profileRef.delete();
    try {
      await auth.deleteUser(uid);
    } catch (authError) {
      await profileRef.set(profileData);
      throw authError;
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete student.";
    const unauthorized = message === "ADMIN_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : message }, { status: unauthorized ? 401 : 400 });
  }
}
