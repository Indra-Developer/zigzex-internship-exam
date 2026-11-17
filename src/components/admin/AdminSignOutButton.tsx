"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminSignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }
  return <button type="button" onClick={signOut} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50">{busy ? "Signing out…" : "Sign out"}</button>;
}
