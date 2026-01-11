import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.role !== "super_admin") {
    redirect("/admin/dashboard");
  }

  return <>{children}</>;
}


