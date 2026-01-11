import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminClientShell } from "./AdminClientShell";
import { headers } from "next/headers";

// Force dynamic rendering for admin routes that use cookies/session
export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Read pathname from headers (set by middleware)
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Skip session check for login page to avoid redirect loop
  if (pathname === "/admin/login") {
    return (
      <AdminClientShell>
        {children}
      </AdminClientShell>
    );
  }

  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  // TODO: Fetch real unread count
  // const unreadCount = await getUnreadNotificationCount(session.user.id);
  const unreadCount = 3; // Mock default matching notifications page mock

  return (
    <AdminClientShell>
      <AdminLayout role={session.role} unreadCount={unreadCount}>
        {children}
      </AdminLayout>
    </AdminClientShell>
  );
}
