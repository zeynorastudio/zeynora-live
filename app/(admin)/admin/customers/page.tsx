import { requireAdmin } from "@/lib/auth/requireAdmin";

export default async function AdminCustomersPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif-display text-night text-2xl">Customers</h1>
        <p className="sans-base text-silver-dark mt-2">View and manage customer accounts</p>
      </div>
      
      <div className="h-64 bg-white rounded-xl border border-silver-light flex items-center justify-center text-silver-dark">
        TODO: Customer list implementation
      </div>
    </div>
  );
}


