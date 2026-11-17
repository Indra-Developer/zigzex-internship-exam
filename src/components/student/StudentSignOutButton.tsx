"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

export function StudentSignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOutStudent() {
    setBusy(true);
    await Promise.allSettled([
      fetch("/api/auth/student/session", { method: "DELETE" }),
      signOut(getFirebaseClientAuth()),
    ]);
    router.replace("/student/login");
    router.refresh();
  }

  return <button type="button" onClick={signOutStudent} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50">{busy ? "Signing out…" : "Sign out"}</button>;
}
