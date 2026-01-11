import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { QueriesPageClient } from "@/components/admin/queries/QueriesPageClient";
import { Query } from "@/components/admin/queries/QueriesList";

export const metadata = {
  title: "Customer Queries | Admin Dashboard",
};

export default async function QueriesPage() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  // TODO: Replace with real data fetch: const queries = await getQueries({ limit: 50 });
  const mockQueries: Query[] = [
    {
      id: "qry_123456",
      subject: "Wrong size received for Silk Saree",
      customer_name: "Priya Sharma",
      customer_email: "priya.sharma@example.com",
      order_id: "ord_987654",
      status: "open",
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      is_read: false,
    },
    {
      id: "qry_789012",
      subject: "When will my order ship?",
      customer_name: "Rahul Verma",
      customer_email: "rahul.v@example.com",
      order_id: "ord_555123",
      status: "resolved",
      assigned_to: session.user.id, // Assigned to current user
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      is_read: true,
    },
    {
      id: "qry_345678",
      subject: "Inquiry about bulk orders",
      customer_name: "Anjali Gupta",
      customer_email: "anjali.g@example.com",
      status: "pending",
      created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      is_read: true,
    }
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="serif-display text-3xl text-night">Customer Queries</h1>
          <p className="text-silver-dark mt-1">Manage support tickets and customer messages.</p>
        </div>
        {/* Optional: Add "New Ticket" button if manual creation is allowed */}
      </div>

      <QueriesPageClient 
        initialQueries={mockQueries} 
        userRole={session.role}
        currentUserId={session.user.id}
      />
    </div>
  );
}
