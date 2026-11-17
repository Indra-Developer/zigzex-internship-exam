import Image from "next/image";
import Link from "next/link";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";

export function AdminShell({ email, children }: Readonly<{ email: string | undefined; children: React.ReactNode }>) {
  return <div className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><Link href="/admin" className="flex items-center gap-3"><Image src="/zigzex-logo.png" alt="ZIGZEX IT Services Private Limited" width={260} height={108} priority className="h-10 w-auto object-contain" /><span className="sr-only">Admin Console</span></Link><div className="flex items-center gap-4"><span className="hidden text-sm text-slate-500 sm:block">{email}</span><AdminSignOutButton /></div></div></header><main className="mx-auto max-w-7xl px-6 py-8">{children}</main></div>;
}
