import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminResults } from "@/components/admin/AdminResults";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminShell email={session.email}><AdminDashboard /><AdminResults /></AdminShell>;
}
