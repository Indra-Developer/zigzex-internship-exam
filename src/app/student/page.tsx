import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/auth/student-session";
import { StudentPortal } from "@/components/student/StudentPortal";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const session = await getStudentSession();
  if (!session) redirect("/student/login");
  return <StudentPortal />;
}
