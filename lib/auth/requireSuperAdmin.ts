import { getAdminSession } from "./getAdminSession";
import { redirect } from "next/navigation";

export async function requireSuperAdmin() {
  const sessionData = await getAdminSession();

  if (!sessionData) {
    redirect("/admin/login");
  }

  const { role } = sessionData;

  if (role !== "super_admin") {
    redirect("/admin/dashboard");
  }

  return sessionData;
}


