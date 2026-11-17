"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import Link from "next/link";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import { PasswordInput } from "@/components/common/PasswordInput";

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const credentials = await signInWithEmailAndPassword(getFirebaseClientAuth(), email, password);
      const idToken = await credentials.user.getIdToken();
      const response = await fetch("/api/auth/student/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to create candidate session.");
      router.replace("/student"); router.refresh();
    } catch (caught) {
      await signOut(getFirebaseClientAuth()).catch(() => undefined);
      const message = caught instanceof Error ? caught.message : "Unable to sign in.";
      setError(message.includes("auth/invalid-credential") ? "The email or password is incorrect." : message);
    } finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-blue-950/5 md:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-slate-950 p-10 text-white md:block"><div className="w-fit rounded-2xl bg-white p-3 shadow-sm"><Image src="/zigzex-logo.png" alt="ZIGZEX IT Services Private Limited" width={260} height={108} priority className="h-12 w-auto object-contain" /></div><p className="mt-16 text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">ZIGZEX IT Services</p><h1 className="mt-4 text-4xl font-bold leading-tight">ZIGZEX Internship Entrance Examination</h1><p className="mt-5 max-w-sm leading-7 text-slate-300">Sign in with the credentials issued by the examination administrator.</p></section>
        <section className="p-8 sm:p-10"><Link href="/" className="text-sm font-semibold text-blue-700 hover:text-blue-800">← Back to home</Link><div className="mt-12"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Candidate access</p><h2 className="mt-3 text-3xl font-bold text-slate-950">Sign in to your examination</h2><p className="mt-3 text-sm leading-6 text-slate-500">Enter the email address and password provided by the examination administrator.</p></div><form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-sm font-semibold text-slate-700">Email address<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="username" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label><label className="block text-sm font-semibold text-slate-700">Password<PasswordInput value={password} onChange={setPassword} required autoComplete="current-password" /></label>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button></form><p className="mt-6 text-xs leading-5 text-slate-400">For access assistance, contact the examination administrator.</p></section>
      </div>
    </main>
  );
}
