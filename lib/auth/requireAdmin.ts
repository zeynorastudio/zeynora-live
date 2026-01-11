import { getAdminSession } from "./getAdminSession";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const sessionData = await getAdminSession();

  if (!sessionData) {
    redirect("/admin/login");
  }

  const { role } = sessionData;

  if (role !== "admin" && role !== "super_admin") {
    redirect("/admin/login");
  }

  return sessionData;
}


