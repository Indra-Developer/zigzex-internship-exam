"use client";

/* Admin-provided photo URLs are arbitrary Firebase/user-hosted URLs. */
/* eslint-disable @next/next/no-img-element */

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/common/PasswordInput";
import type { DashboardSummary, ExamSettings, StudentProfile, StudentStatus } from "@/types/admin";

const emptySummary: DashboardSummary = {
  totalStudents: 0,
  activeStudents: 0,
  inactiveStudents: 0,
  completedExaminations: 0,
};

const emptySettings: ExamSettings = {
  name: "ZIGZEX Internship Entrance Examination",
  durationMinutes: 60,
  totalMarks: 100,
  cutoffMarks: 60,
  enabled: false,
  updatedAt: null,
};

async function readJson<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 h-2 w-12 rounded-full ${tone}`} />
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState(emptySummary);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [settings, setSettings] = useState(emptySettings);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<StudentProfile | null>(null);
  const [studentForm, setStudentForm] = useState({ fullName: "", email: "", password: "", photoUrl: "" });
  const [settingsForm, setSettingsForm] = useState(emptySettings);
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboard, studentData, settingsData] = await Promise.all([
        readJson<DashboardSummary>("/api/admin/dashboard"),
        readJson<{ students: StudentProfile[] }>("/api/admin/students"),
        readJson<{ settings: ExamSettings }>("/api/admin/settings"),
      ]);
      setSummary(dashboard);
      setStudents(studentData.students);
      setSettings(settingsData.settings);
      setSettingsForm(settingsData.settings);
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Unable to load admin data.";
      if (text === "Unauthorized.") router.replace("/admin/login");
      setError(text);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => `${student.fullName} ${student.email}`.toLowerCase().includes(query));
  }, [search, students]);

  function clearStudentForm() {
    setEditing(null);
    setStudentForm({ fullName: "", email: "", password: "", photoUrl: "" });
  }

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await readJson("/api/admin/students", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(studentForm),
      });
      clearStudentForm();
      setMessage("Student account created.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create student.");
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(student: StudentProfile) {
    setEditing(student);
    setStudentForm({ fullName: student.fullName, email: student.email, password: "", photoUrl: student.photoUrl });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await readJson(`/api/admin/students/${editing.uid}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: studentForm.fullName,
          photoUrl: studentForm.photoUrl,
          password: studentForm.password,
          status: editing.status,
        }),
      });
      clearStudentForm();
      setMessage("Student profile and password updated.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update student.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(student: StudentProfile) {
    const nextStatus: StudentStatus = student.status === "active" ? "inactive" : "active";
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await readJson(`/api/admin/students/${student.uid}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName: student.fullName, photoUrl: student.photoUrl, status: nextStatus }),
      });
      setMessage(nextStatus === "active" ? "Student reactivated." : "Student deactivated.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to change student status.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteStudent(student: StudentProfile) {
    if (student.examStatus !== "not-started") return;
    if (!window.confirm(`Permanently delete ${student.fullName}'s account? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await readJson(`/api/admin/students/${student.uid}`, { method: "DELETE" });
      if (editing?.uid === student.uid) clearStudentForm();
      setMessage("Student account deleted.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete student.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await readJson<{ settings: ExamSettings }>("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      setSettings(response.settings);
      setSettingsForm(response.settings);
      setMessage("Examination settings saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save settings.");
    } finally {
      setBusy(false);
    }
  }

  async function importQuestionBank() {
    setImportBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await readJson<{ imported: number }>("/api/admin/questions/import", { method: "POST" });
      setMessage(`${response.imported} questions imported into Firestore.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to import question bank.");
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Overview</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Admin dashboard</h1>
          <p className="mt-2 text-slate-500">Manage access and prepare the examination from one place.</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${settings.enabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          <span className={`h-2 w-2 rounded-full ${settings.enabled ? "bg-emerald-500" : "bg-amber-500"}`} />
          {settings.enabled ? "Exam enabled" : "Exam disabled"}
        </span>
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total students" value={summary.totalStudents} tone="bg-blue-600" />
        <StatCard label="Active students" value={summary.activeStudents} tone="bg-emerald-500" />
        <StatCard label="Deactivated" value={summary.inactiveStudents} tone="bg-amber-500" />
        <StatCard label="Completed exams" value={summary.completedExaminations} tone="bg-violet-500" />
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30 ring-1 ring-slate-100">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Student accounts</h2>
              <p className="mt-1 text-sm text-slate-500">Create access without storing passwords in Firestore.</p>
            </div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="pb-3 pr-4">Student</th><th className="pb-3 pr-4">Access</th><th className="pb-3 pr-4">Exam</th><th className="pb-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={4} className="py-10 text-center text-slate-500">Loading students…</td></tr> : visibleStudents.length === 0 ? <tr><td colSpan={4} className="py-10 text-center text-slate-500">No students found.</td></tr> : visibleStudents.map((student) => (
                  <tr key={student.uid}>
                    <td className="py-4 pr-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 font-bold text-blue-700">{student.photoUrl ? <img src={student.photoUrl} alt="" className="h-full w-full object-cover" /> : student.fullName.charAt(0).toUpperCase()}</div><div><p className="font-semibold text-slate-900">{student.fullName}</p><p className="text-xs text-slate-500">{student.email}</p></div></div></td>
                    <td className="py-4 pr-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${student.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{student.status === "active" ? "Active" : "Inactive"}</span></td>
                    <td className="py-4 pr-4 text-slate-600">{student.examStatus === "not-started" ? "Not started" : student.examStatus === "in-progress" ? "In progress" : "Completed"}</td>
                    <td className="py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => beginEdit(student)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">Edit</button><button type="button" disabled={busy} onClick={() => void toggleStatus(student)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">{student.status === "active" ? "Deactivate" : "Activate"}</button><button type="button" disabled={busy || student.examStatus !== "not-started"} title={student.examStatus === "not-started" ? "Delete student" : "Deactivate students after an exam has started"} onClick={() => void deleteStudent(student)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35">Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-400">Delete is available only before an examination starts. Use Deactivate to preserve examination history.</p>
        </section>

        <div className="space-y-8">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30 ring-1 ring-slate-100">
            <h2 className="text-lg font-bold text-slate-950">{editing ? "Edit student" : "Create student"}</h2>
            <p className="mt-1 text-sm text-slate-500">{editing ? "Update the profile or set a new password." : "Create secure access credentials for the candidate."}</p>
            <form onSubmit={editing ? saveStudent : createStudent} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Full name<input required value={studentForm.fullName} onChange={(event) => setStudentForm({ ...studentForm, fullName: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
              {!editing && <>
                <label className="block text-sm font-semibold text-slate-700">Email<input required type="email" value={studentForm.email} onChange={(event) => setStudentForm({ ...studentForm, email: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
                <label className="block text-sm font-semibold text-slate-700">Temporary password<PasswordInput value={studentForm.password} onChange={(value) => setStudentForm({ ...studentForm, password: value })} required minLength={6} autoComplete="new-password" /></label>
              </>}
              {editing && <label className="block text-sm font-semibold text-slate-700">New password <span className="font-normal text-slate-400">(optional)</span><PasswordInput value={studentForm.password} onChange={(value) => setStudentForm({ ...studentForm, password: value })} minLength={6} autoComplete="new-password" /></label>}
              <label className="block text-sm font-semibold text-slate-700">Photo URL <span className="font-normal text-slate-400">(optional)</span><input type="url" value={studentForm.photoUrl} onChange={(event) => setStudentForm({ ...studentForm, photoUrl: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
              <div className="flex gap-2"><button disabled={busy} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "Saving…" : editing ? "Save changes" : "Create account"}</button>{editing && <button type="button" onClick={clearStudentForm} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600">Cancel</button>}</div>
            </form>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30 ring-1 ring-slate-100">
            <h2 className="text-lg font-bold text-slate-950">Exam settings</h2>
            <p className="mt-1 text-sm text-slate-500">These settings apply to each new examination attempt.</p>
            <form onSubmit={saveSettings} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Examination name<input required value={settingsForm.name} onChange={(event) => setSettingsForm({ ...settingsForm, name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
              <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold text-slate-700">Duration (min)<input required type="number" min={1} max={180} value={settingsForm.durationMinutes} onChange={(event) => setSettingsForm({ ...settingsForm, durationMinutes: Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label><label className="block text-sm font-semibold text-slate-700">Cutoff marks<input required type="number" min={0} max={100} value={settingsForm.cutoffMarks} onChange={(event) => setSettingsForm({ ...settingsForm, cutoffMarks: Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label></div>
              <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-500">Total marks are fixed at <strong className="text-slate-700">100</strong> for the 50-question exam.</p>
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={settingsForm.enabled} onChange={(event) => setSettingsForm({ ...settingsForm, enabled: event.target.checked })} className="h-4 w-4 accent-blue-600" /> Enable examination access</label>
              <button disabled={busy} className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">Save settings</button>
            </form>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/30 ring-1 ring-slate-100"><div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5"><h2 className="text-lg font-bold text-slate-950">Question bank</h2><p className="mt-1 text-sm leading-6 text-slate-500">The predefined bank contains 30 technical, 15 aptitude, 30 Python and 30 Java questions.</p></div><div className="p-6"><button type="button" disabled={importBusy} onClick={() => void importQuestionBank()} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50">{importBusy ? "Importing…" : "Import 105 questions"}</button><p className="mt-3 text-xs leading-5 text-slate-400">Import can be repeated safely because each question uses its stable ID.</p></div></section>
        </div>
      </div>
    </div>
  );
}
