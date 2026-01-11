import { requireAdmin } from "@/lib/auth/requireAdmin";

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif-display text-night text-2xl">Analytics</h1>
        <p className="sans-base text-silver-dark mt-2">Detailed store performance reports</p>
      </div>
      
      <div className="h-64 bg-white rounded-xl border border-silver-light flex items-center justify-center text-silver-dark">
        TODO: Analytics charts implementation
      </div>
    </div>
  );
}
