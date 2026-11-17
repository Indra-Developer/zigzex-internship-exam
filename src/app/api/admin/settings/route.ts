import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { serializeSettings } from "@/lib/admin/serializers";
import { validateSettingsInput } from "@/lib/admin/validation";

const settingsRef = () => getFirebaseAdminFirestore().collection("examSettings").doc("main");
const defaultSettings = {
  name: "ZIGZEX Internship Entrance Examination",
  durationMinutes: 60,
  totalMarks: 100,
  cutoffMarks: 60,
  enabled: false,
};

export async function GET() {
  try {
    await requireAdminSession();
    const reference = settingsRef();
    const document = await reference.get();
    if (!document.exists) {
      await reference.set({ ...defaultSettings, updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ settings: { ...defaultSettings, updatedAt: null } });
    }
    return NextResponse.json({ settings: serializeSettings(document.data() || {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load settings.";
    const unauthorized = message === "ADMIN_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : "Unable to load settings." }, { status: unauthorized ? 401 : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
    const body = (await request.json()) as Record<string, unknown>;
    const settings = validateSettingsInput(body);
    await settingsRef().set({ ...settings, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ settings: { ...settings, updatedAt: null } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save settings.";
    const unauthorized = message === "ADMIN_UNAUTHORIZED";
    return NextResponse.json({ error: unauthorized ? "Unauthorized." : message }, { status: unauthorized ? 401 : 400 });
  }
}
