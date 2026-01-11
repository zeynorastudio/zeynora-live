import AdminContainer from "@/components/admin/AdminContainer";

export default function AdminUploadsPage() {
  return (
    <AdminContainer
      title="Batch Upload"
      description="Upload multiple product images at once"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Product Selection Placeholder */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Product Target</label>
          <select className="block w-full rounded-md border-gray-300 shadow-sm opacity-50" disabled>
            <option>Select a product...</option>
          </select>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-white hover:bg-gray-50 transition-colors cursor-pointer">
           <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>
           <p className="mt-4 text-sm text-gray-600">
             Drag and drop batch files here
           </p>
        </div>
        
        <div className="text-center">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gold opacity-50 cursor-not-allowed">
            Start Upload
          </button>
        </div>
      </div>
    </AdminContainer>
  );
}


