import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">Z</span>
            <span><span className="block text-sm font-black tracking-[0.25em] text-slate-900">ZIGZEX</span><span className="block text-xs text-slate-500">IT Services Private Limited</span></span>
          </Link>
          <div className="flex items-center gap-2"><Link href="/student/login" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">Student login</Link><Link href="/admin/login" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">Admin sign in</Link></div>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">Internship entrance examination</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl">A structured assessment for emerging technology talent.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">ZIGZEX provides a secure and focused examination experience for internship applicants.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/student/login" className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700">Student exam login</Link><Link href="/admin/login" className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">Open admin console</Link></div>
        </div>
        <div className="rounded-3xl bg-slate-950 p-7 text-white shadow-2xl shadow-blue-950/10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Assessment structure</p>
          <p className="mt-5 text-4xl font-bold">Clear. Focused. Fair.</p>
          <p className="mt-4 max-w-sm leading-7 text-slate-300">A consistent examination format supports a reliable internship selection process.</p>
          <div className="mt-10 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-sm"><div><p className="text-2xl font-bold">50</p><p className="mt-1 text-slate-400">Questions</p></div><div><p className="text-2xl font-bold">100</p><p className="mt-1 text-slate-400">Marks</p></div><div><p className="text-2xl font-bold">1</p><p className="mt-1 text-slate-400">Attempt</p></div></div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-6"><p className="text-sm font-semibold text-blue-700">01</p><h2 className="mt-4 font-bold text-slate-950">Controlled access</h2><p className="mt-2 text-sm leading-6 text-slate-500">Candidate access and examination settings are managed through a protected administration console.</p></div>
        <div className="rounded-2xl border border-slate-200 p-6"><p className="text-sm font-semibold text-blue-700">02</p><h2 className="mt-4 font-bold text-slate-950">Structured assessment</h2><p className="mt-2 text-sm leading-6 text-slate-500">A balanced multiple-choice format evaluates technical, aptitude and programming logic skills.</p></div>
        <div className="rounded-2xl border border-slate-200 p-6"><p className="text-sm font-semibold text-blue-700">03</p><h2 className="mt-4 font-bold text-slate-950">Secure administration</h2><p className="mt-2 text-sm leading-6 text-slate-500">Authentication, examination records and evaluation data are managed in one secure workflow.</p></div>
      </section>
    </main>
  );
}
