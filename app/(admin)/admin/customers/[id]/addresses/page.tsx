import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";

export default async function CustomerAddressesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const supabase = createServiceRoleClient();

  // Fetch customer
  const { data: customer } = await supabase
    .from("users")
    .select("id, email, full_name")
    .eq("id", resolvedParams.id)
    .single();

  const typedCustomer = customer as {
    id: string;
    email: string;
    full_name: string | null;
  } | null;

  if (!typedCustomer) {
    return (
      <div className="p-6">
        <p>Customer not found</p>
      </div>
    );
  }

  // Fetch addresses
  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, full_name, phone, line1, line2, city, state, pincode, country, is_default, created_at")
    .eq("user_id", resolvedParams.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  // Type assertion for addresses
  const typedAddresses = (addresses || []) as Array<{
    id: string;
    full_name: string | null;
    phone: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    country: string | null;
    is_default: boolean | null;
    created_at: string;
  }>;

  // Fetch audit logs for address changes
  const { data: auditLogs } = await supabase
    .from("admin_audit_logs")
    .select("action, target_id, performed_by, details, created_at")
    .eq("target_resource", "addresses")
    .in(
      "target_id",
      typedAddresses.map((a) => a.id)
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="serif-display text-3xl mb-2">
          Addresses - {typedCustomer.full_name || typedCustomer.email}
        </h1>
        <p className="text-silver-dark">Customer ID: {typedCustomer.id}</p>
      </div>

      {/* Addresses List */}
      <div className="space-y-4 mb-8">
        <h2 className="serif-display text-xl mb-4">Saved Addresses</h2>
        {!typedAddresses || typedAddresses.length === 0 ? (
          <Card className="p-6" shadowVariant="warm-sm">
            <p className="text-silver-dark">No addresses found</p>
          </Card>
        ) : (
          typedAddresses.map((address) => (
            <Card key={address.id} className="p-6" shadowVariant="warm-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-night">{address.full_name}</h3>
                    {address.is_default && (
                      <Badge variant="gold" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-silver-dark mb-2">{address.phone}</p>
                  <div className="text-sm text-night">
                    <p>{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    <p>
                      {address.city}, {address.state} - {address.pincode}
                    </p>
                    <p>{address.country}</p>
                  </div>
                  <p className="text-xs text-silver-dark mt-2">
                    Created: {format(new Date(address.created_at), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Audit Logs */}
      {auditLogs && auditLogs.length > 0 && (
        <div>
          <h2 className="serif-display text-xl mb-4">Address Change History</h2>
          <div className="space-y-2">
            {auditLogs.map((log: any, index: number) => (
              <Card key={index} className="p-4" shadowVariant="warm-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-night">
                      {log.action.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-silver-dark mt-1">
                      {format(new Date(log.created_at), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                    {log.details && typeof log.details === "object" && (
                      <div className="text-xs text-silver-dark mt-1">
                        {log.details.pincode && <p>Pincode: {log.details.pincode}</p>}
                        {log.details.fields_updated && (
                          <p>Fields updated: {log.details.fields_updated.join(", ")}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}






