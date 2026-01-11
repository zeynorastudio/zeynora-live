import { AdminSkeleton } from "@/components/admin/AdminSkeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <AdminSkeleton className="h-10 w-48 mb-2" />
          <AdminSkeleton className="h-4 w-64" />
        </div>
      </div>

      <div className="h-16 w-full bg-offwhite rounded-xl animate-pulse" />

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <AdminSkeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}


