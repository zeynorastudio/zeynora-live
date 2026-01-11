import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCustomerByAuthUid } from "@/lib/auth/customers";

// Force dynamic rendering for pages that use authentication
export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account");
  }

  // Verify customer exists (not just admin user)
  const customer = await getCustomerByAuthUid(supabase, user.id);
  if (!customer) {
    // User is authenticated but not a customer (might be admin)
    // Redirect to login with message
    redirect("/login?redirect=/account&error=not_customer");
  }

  return <>{children}</>;
}
