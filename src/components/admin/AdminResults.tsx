"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StudentResult } from "@/types/result";

async function readResults() {
  const response = await fetch("/api/admin/results", { cache: "no-store" });
  const data = (await response.json()) as { results?: StudentResult[]; error?: string };
  if (!response.ok) throw new Error(data.error || "Unable to load results.");
  return data.results || [];
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadCsv(results: StudentResult[]) {
  const headers = ["Student", "Email", "Language", "Status", "Technical", "Aptitude", "Programming", "Total", "Percentage", "Cutoff", "Qualification", "Submitted", "Violations"];
  const rows = results.map((result) => [result.studentName, result.email, result.language, "Evaluated", result.technicalMarks, result.aptitudeMarks, result.programmingMarks, result.totalMarks, result.percentage, result.cutoffMarks, result.qualification, result.submittedAt, result.recordedViolations]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "zigzex-results.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminResults() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "qualified" | "not-qualified">("all");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [selected, setSelected] = useState<StudentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setResults(await readResults()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load results."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    return results.filter((result) => {
      const matchesSearch = !query || `${result.studentName} ${result.email}`.toLowerCase().includes(query);
      const matchesFilter = filter === "all" || (filter === "qualified" ? result.qualification === "QUALIFIED" : result.qualification === "NOT QUALIFIED");
      return matchesSearch && matchesFilter;
    }).sort((a, b) => (sort === "desc" ? b.totalMarks - a.totalMarks : a.totalMarks - b.totalMarks));
  }, [filter, results, search, sort]);

  return <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/30 ring-1 ring-slate-100"><div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-5 lg:flex-row lg:items-center"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Evaluation records</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Examination results</h2><p className="mt-1 text-sm text-slate-500">Automatic evaluation, qualification status and monitoring events.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => downloadCsv(visibleResults)} disabled={!visibleResults.length} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">Download CSV</button><button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-300">Refresh</button></div></div><div className="p-6"><div className="flex flex-col gap-3 md:flex-row"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student name or email" className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"><option value="all">All results</option><option value="qualified">Qualified</option><option value="not-qualified">Not qualified</option></select><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"><option value="desc">Highest marks first</option><option value="asc">Lowest marks first</option></select></div>{error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<div className="mt-6 overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3 pr-4">Student</th><th className="pb-3 pr-4">Language</th><th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4">Marks</th><th className="pb-3 pr-4">Qualification</th><th className="pb-3 pr-4">Submitted</th><th className="pb-3 text-right">View</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={7} className="py-10 text-center text-slate-500">Loading results…</td></tr> : visibleResults.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-slate-500">No evaluated results found.</td></tr> : visibleResults.map((result) => <tr key={result.id}><td className="py-4 pr-4"><p className="font-semibold text-slate-900">{result.studentName}</p><p className="text-xs text-slate-500">{result.email}</p></td><td className="py-4 pr-4 capitalize text-slate-600">{result.language}</td><td className="py-4 pr-4 text-slate-600">Evaluated</td><td className="py-4 pr-4 font-bold text-slate-900">{result.totalMarks}<span className="font-normal text-slate-400"> / 100</span></td><td className="py-4 pr-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${result.qualification === "QUALIFIED" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{result.qualification}</span></td><td className="py-4 pr-4 text-xs text-slate-500">{new Date(result.submittedAt).toLocaleString()}</td><td className="py-4 text-right"><button type="button" onClick={() => setSelected(result)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">View result</button></td></tr>)}</tbody></table></div>{selected && <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold text-slate-950">{selected.studentName}</h3><p className="mt-1 text-sm text-slate-500">{selected.email} · {selected.qualification}</p></div><button type="button" onClick={() => setSelected(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">Close</button></div><div className="mt-5 grid gap-4 text-sm sm:grid-cols-4"><div><p className="text-slate-500">Technical</p><p className="mt-1 font-bold text-slate-900">{selected.technicalMarks} / 40</p></div><div><p className="text-slate-500">Aptitude</p><p className="mt-1 font-bold text-slate-900">{selected.aptitudeMarks} / 20</p></div><div><p className="text-slate-500">Programming</p><p className="mt-1 font-bold text-slate-900">{selected.programmingMarks} / 40</p></div><div><p className="text-slate-500">Violations</p><p className="mt-1 font-bold text-slate-900">{selected.recordedViolations}</p></div></div></div>}</div></section>;
}
