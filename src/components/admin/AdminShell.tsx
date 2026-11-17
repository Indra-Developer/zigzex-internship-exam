import Link from "next/link";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";

export function AdminShell({ email, children }: Readonly<{ email: string | undefined; children: React.ReactNode }>) {
  return <div className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><Link href="/admin" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">Z</span><span><span className="block text-sm font-black tracking-[0.25em] text-slate-900">ZIGZEX</span><span className="block text-xs text-slate-500">Admin Console</span></span></Link><div className="flex items-center gap-4"><span className="hidden text-sm text-slate-500 sm:block">{email}</span><AdminSignOutButton /></div></div></header><main className="mx-auto max-w-7xl px-6 py-8">{children}</main></div>;
}
