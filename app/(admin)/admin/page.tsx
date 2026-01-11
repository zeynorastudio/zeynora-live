// DB Source: aggregated stats from orders, users, products tables

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4" role="alert">
        <strong className="font-bold">TODO: </strong>
        <span className="block sm:inline">Dashboard</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="h-32 bg-white rounded shadow p-4 flex items-center justify-center text-gray-400 border border-dashed border-gray-300">Stat 1 Placeholder</div>
         <div className="h-32 bg-white rounded shadow p-4 flex items-center justify-center text-gray-400 border border-dashed border-gray-300">Stat 2 Placeholder</div>
         <div className="h-32 bg-white rounded shadow p-4 flex items-center justify-center text-gray-400 border border-dashed border-gray-300">Stat 3 Placeholder</div>
      </div>
    </div>
  );
}
