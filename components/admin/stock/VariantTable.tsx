"use client";

import { useEditStock } from "@/hooks/useEditStock";
import EditStockModal from "./EditStockModal";
import { useRouter } from "next/navigation";

type Variant = {
  sku: string;
  color: string;
  size: string;
  stock: number;
};

interface VariantTableProps {
  product_uid: string;
  variants: Variant[];
}

export default function VariantTable({ product_uid, variants }: VariantTableProps) {
  const { modalState, openModal, closeModal } = useEditStock();
  const router = useRouter();

  const handleSuccess = () => {
    // Refresh the page to show updated data
    router.refresh();
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-serif">
              Color
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-serif">
              Size
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-serif">
              SKU
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-serif">
              Stock
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 sans-base">
          {variants.length === 0 ? (
             <tr>
                 <td colSpan={5} className="px-6 py-4 text-center text-gray-500 text-sm">No variants found.</td>
             </tr>
          ) : (
            variants.map((variant) => (
                <tr key={variant.sku} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {variant.color}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {variant.size}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {variant.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        variant.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                    {variant.stock}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                    onClick={() => openModal(product_uid, variant.sku, variant.color, variant.size, variant.stock)}
                    className="text-gold hover:text-gold/80 transition-colors"
                    >
                    Edit Stock
                    </button>
                </td>
                </tr>
            ))
          )}
        </tbody>
      </table>

      <EditStockModal 
        state={modalState} 
        onClose={closeModal} 
        onSuccess={handleSuccess} 
      />
    </div>
  );
}



