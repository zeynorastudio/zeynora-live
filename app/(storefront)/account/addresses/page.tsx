import React from "react";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AddressBookClient from "@/components/address/AddressBookClient";
import Card from "@/components/ui/Card";
import { getCustomerByAuthUid } from "@/lib/auth/customers";

export default async function AddressesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account/addresses");
  }

  // Get customer
  const customer = await getCustomerByAuthUid(supabase, user.id);
  if (!customer) {
    redirect("/login?redirect=/account/addresses&error=not_customer");
  }

  // Get user_id for addresses (via customer -> users mapping)
  // Since addresses.user_id references users.id, we need to find the users.id
  const { data: userRecord } = await supabase
    .from("users")
    .select("id")
    .eq("auth_uid", user.id)
    .single();

  const typedUserRecord = userRecord as { id: string } | null;
  if (!typedUserRecord) {
    // User doesn't have a users table record yet
    // This shouldn't happen for customers, but handle gracefully
    return (
      <div className="min-h-screen bg-offwhite">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="p-8 text-center" shadowVariant="warm-sm">
            <p className="text-silver-dark">
              Unable to load addresses. Please contact support.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Fetch addresses using user_id
  const { data: addresses, error } = await supabase
    .from("addresses")
    .select("id, full_name, phone, line1, line2, city, state, pincode, country, is_default, created_at")
    .eq("user_id", typedUserRecord.id)
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

  // Map to consistent format
  const formattedAddresses = typedAddresses.map((addr) => ({
    id: addr.id,
    label: null, // Not stored in DB currently
    recipient_name: addr.full_name || "",
    phone: addr.phone || "",
    address_line_1: addr.line1 || "",
    address_line_2: addr.line2 || undefined,
    city: addr.city || "",
    state: addr.state || "",
    pincode: addr.pincode || "",
    country: addr.country || "India",
    is_default: addr.is_default || false,
    created_at: addr.created_at,
  }));

  return (
    <div className="min-h-screen bg-offwhite">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="serif-display text-3xl text-night mb-2">Address Book</h1>
          <p className="text-silver-dark">Manage your shipping addresses</p>
        </div>

        <AddressBookClient initialAddresses={formattedAddresses} />
      </div>
    </div>
  );
}
