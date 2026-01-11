"use client";

import React, { useState, useCallback } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { AdminToastProvider } from "@/components/ui/ToastProviderWrapper";
import { reorderProductsAction, updateProductPriceAction, assignProductToHomepageSectionAction, getHomepageSectionsAction, bulkUpdateProductsAction } from "./actions";
import { getPublicUrl } from "@/lib/utils/images";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save, Loader2, Search, Image as ImageIcon, Edit2, Check, X, Link as LinkIcon, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductListItem } from "@/lib/products/list";

interface ProductsListClientProps {
  initialProducts: ProductListItem[];
  initialTotal: number;
  initialPage: number;
  initialHasMore: boolean;
}

// Inline Editable Price Cell
function EditablePriceCell({ product, onSave }: { product: ProductListItem; onSave: (updates: any) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    price: product.price.toString(),
    strike_price: product.strike_price?.toString() || "",
    sale_price: product.sale_price?.toString() || "",
    on_sale: product.on_sale,
  });
  const { addToast } = useToastWithCompat();

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        price: parseFloat(values.price) || product.price,
      };

      if (values.on_sale) {
        if (values.strike_price) updates.strike_price = parseFloat(values.strike_price);
        if (values.sale_price) updates.sale_price = parseFloat(values.sale_price);
        updates.on_sale = true;
      } else {
        updates.on_sale = false;
        updates.strike_price = null;
        updates.sale_price = null;
      }

      await onSave(updates);
      setIsEditing(false);
      addToast("Price updated successfully", "success");
    } catch (error: any) {
      addToast(error.message || "Failed to update price", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-night">
          {product.on_sale && product.strike_price ? (
            <div>
              <span className="line-through text-silver-dark text-sm">₹{product.strike_price.toFixed(2)}</span>
              <span className="ml-2 text-red-600 font-medium">₹{(product.sale_price || product.price).toFixed(2)}</span>
            </div>
          ) : (
            <span>₹{product.price.toFixed(2)}</span>
          )}
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 hover:bg-offwhite rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="w-3 h-3 text-silver-dark" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 min-w-[200px]">
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          value={values.price}
          onChange={(e) => setValues({ ...values, price: e.target.value })}
          className="w-20 px-2 py-1 text-sm border border-silver-light rounded"
          placeholder="Price"
        />
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={values.on_sale}
            onChange={(e) => setValues({ ...values, on_sale: e.target.checked })}
          />
          On Sale
        </label>
      </div>
      {values.on_sale && (
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            value={values.strike_price}
            onChange={(e) => setValues({ ...values, strike_price: e.target.value })}
            className="w-20 px-2 py-1 text-sm border border-silver-light rounded"
            placeholder="Strike"
          />
          <input
            type="number"
            step="0.01"
            value={values.sale_price}
            onChange={(e) => setValues({ ...values, sale_price: e.target.value })}
            className="w-20 px-2 py-1 text-sm border border-silver-light rounded"
            placeholder="Sale"
          />
        </div>
      )}
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={() => {
            setIsEditing(false);
            setValues({
              price: product.price.toString(),
              strike_price: product.strike_price?.toString() || "",
              sale_price: product.sale_price?.toString() || "",
              on_sale: product.on_sale,
            });
          }}
          className="p-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Homepage Assignment Modal
function HomepageAssignmentModal({ productUid, isOpen, onClose }: { productUid: string; isOpen: boolean; onClose: () => void }) {
  const [sections, setSections] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { addToast } = useToastWithCompat();

  React.useEffect(() => {
    if (isOpen) {
      loadSections();
    }
  }, [isOpen]);

  const loadSections = async () => {
    setLoading(true);
    try {
      const result = await getHomepageSectionsAction();
      if (result.success && result.sections) {
        setSections(result.sections);
      }
    } catch (error: any) {
      addToast(error.message || "Failed to load sections", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (sectionId: string) => {
    setAssigning(true);
    try {
      const result = await assignProductToHomepageSectionAction(productUid, sectionId);
      if (result.success) {
        addToast("Product assigned to section", "success");
        onClose();
      } else {
        addToast(result.error || "Failed to assign", "error");
      }
    } catch (error: any) {
      addToast(error.message || "Failed to assign", "error");
    } finally {
      setAssigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-night">Assign to Homepage Section</h2>
          <button onClick={onClose} className="text-silver-dark hover:text-night">
            <X className="w-5 h-5" />
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-silver-dark" />
          </div>
        ) : sections.length === 0 ? (
          <p className="text-silver-dark text-sm">No manual sections available. Create one in Homepage Builder first.</p>
        ) : (
          <div className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleAssign(section.id)}
                disabled={assigning}
                className="w-full text-left px-4 py-2 border border-silver-light rounded hover:bg-offwhite transition-colors"
              >
                {section.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Sortable Product Row
function SortableProductRow({ 
  product, 
  onPriceUpdate,
  onHomepageAssign,
  isSelected,
  onSelect,
}: { 
  product: ProductListItem;
  onPriceUpdate: (productUid: string, updates: any) => Promise<void>;
  onHomepageAssign: (productUid: string) => void;
  isSelected: boolean;
  onSelect: (productUid: string, checked: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.uid,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={cn("group hover:bg-offwhite/50 transition-colors", isDragging && "bg-offwhite", isSelected && "bg-gold/5")}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(product.uid, e.target.checked)}
          className="w-4 h-4 rounded border-silver-light text-gold focus:ring-gold"
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className="px-4 py-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-offwhite"
        >
          <GripVertical className="w-5 h-5 text-silver-dark" />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="w-16 h-16 rounded border border-silver-light overflow-hidden bg-offwhite flex items-center justify-center">
          {product.thumbnail_url && !product.thumbnail_url.includes("placeholder") ? (
            <img
              src={product.thumbnail_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-silver-dark" />
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-night">{product.name}</div>
        <div className="text-sm text-silver-dark font-mono">{product.uid}</div>
      </td>
      <td className="px-4 py-3">
        <EditablePriceCell 
          product={product} 
          onSave={(updates) => onPriceUpdate(product.uid, updates)}
        />
      </td>
      <td className="px-4 py-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={product.active}
            onChange={async (e) => {
              await onPriceUpdate(product.uid, { active: e.target.checked });
            }}
            className="w-4 h-4 rounded border-silver-light text-gold focus:ring-gold"
            onClick={(e) => e.stopPropagation()}
          />
          <span
            className={cn(
              "px-2 py-1 rounded text-xs font-medium",
              product.active
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-gray-50 text-gray-700 border border-gray-200"
            )}
          >
            {product.active ? "Active" : "Inactive"}
          </span>
        </label>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <a
            href={`/admin/super/products/${product.uid}`}
            className="text-gold hover:text-gold-dark font-medium text-sm"
          >
            Edit
          </a>
          <button
            onClick={() => onHomepageAssign(product.uid)}
            className="p-1 hover:bg-offwhite rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Assign to Homepage Section"
          >
            <LinkIcon className="w-4 h-4 text-silver-dark" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ProductsListClient({
  initialProducts,
  initialTotal,
  initialPage,
  initialHasMore,
}: ProductsListClientProps) {
  const [products, setProducts] = useState(initialProducts);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [homepageModal, setHomepageModal] = useState<{ productUid: string } | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"enable" | "disable" | "on_sale" | "featured" | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const { addToast } = useToastWithCompat();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setProducts((items) => {
        const oldIndex = items.findIndex((p) => p.uid === active.id);
        const newIndex = items.findIndex((p) => p.uid === over?.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update sort_order locally
        return reordered.map((product, index) => ({
          ...product,
          sort_order: index + 1,
        }));
      });
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const orders = products.map((product, index) => ({
        product_uid: product.uid,
        sort_order: index + 1,
      }));

      const result = await reorderProductsAction(orders);

      if (result.success) {
        addToast("Product order saved successfully", "success");
        setHasChanges(false);
        // Reload page to reflect changes
        window.location.reload();
      } else {
        addToast(result.error || "Failed to save order", "error");
      }
    } catch (error: any) {
      addToast(error.message || "Failed to save order", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePriceUpdate = async (productUid: string, updates: any) => {
    const result = await updateProductPriceAction(productUid, updates);
    if (result.success) {
      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.uid === productUid
            ? {
                ...p,
                price: updates.price ?? p.price,
                strike_price: updates.strike_price ?? p.strike_price,
                sale_price: updates.sale_price ?? p.sale_price,
                on_sale: updates.on_sale ?? p.on_sale,
              }
            : p
        )
      );
    } else {
      throw new Error(result.error || "Failed to update price");
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", "1");
    window.location.href = `/admin/super/products?${params.toString()}`;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(products.map(p => p.uid)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productUid: string, checked: boolean) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(productUid);
      } else {
        next.delete(productUid);
      }
      return next;
    });
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedProducts.size === 0) return;
    
    setBulkProcessing(true);
    try {
      const updates: { active?: boolean; on_sale?: boolean; featured?: boolean } = {};
      
      if (bulkAction === "enable") {
        updates.active = true;
      } else if (bulkAction === "disable") {
        updates.active = false;
      } else if (bulkAction === "on_sale") {
        updates.on_sale = true;
      } else if (bulkAction === "featured") {
        updates.featured = true;
      }

      const result = await bulkUpdateProductsAction(Array.from(selectedProducts), updates);
      
      if (result.success) {
        addToast(`Updated ${result.updated} product(s)`, "success");
        setSelectedProducts(new Set());
        setBulkAction(null);
        // Refresh page to show changes
        window.location.reload();
      } else {
        addToast(result.error || "Failed to update products", "error");
      }
    } catch (error: any) {
      addToast(error.message || "Failed to update products", "error");
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <AdminToastProvider>
      <div className="space-y-6">
      {/* Search & Bulk Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-dark" />
          <input
            type="text"
            placeholder="Search products by UID or name..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
        </div>
        <AdminButton variant="outline" onClick={handleSearch}>
          Search
        </AdminButton>
        
        {/* Bulk Actions Bar */}
        {selectedProducts.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-silver-dark">
              {selectedProducts.size} selected
            </span>
            <select
              value={bulkAction || ""}
              onChange={(e) => setBulkAction(e.target.value as any || null)}
              className="px-3 py-2 text-sm border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none"
            >
              <option value="">Select action...</option>
              <option value="enable">Enable</option>
              <option value="disable">Disable</option>
              <option value="on_sale">Mark On Sale</option>
              <option value="featured">Set Featured</option>
            </select>
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={handleBulkAction}
              disabled={!bulkAction || bulkProcessing}
              icon={bulkProcessing ? Loader2 : undefined}
            >
              {bulkProcessing ? "Processing..." : "Apply"}
            </AdminButton>
            <AdminButton
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedProducts(new Set());
                setBulkAction(null);
              }}
            >
              Clear
            </AdminButton>
          </div>
        )}
      </div>

      {/* Reorder Controls */}
      {hasChanges && (
        <div className="bg-gold/10 border border-gold/20 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-night">Order changed</p>
            <p className="text-sm text-silver-dark">Click Save to apply the new order</p>
          </div>
          <AdminButton
            variant="secondary"
            onClick={handleSave}
            disabled={saving}
            icon={saving ? Loader2 : Save}
          >
            {saving ? "Saving..." : "Save Order"}
          </AdminButton>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-silver-light overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={products.map((p) => p.uid)} strategy={verticalListSortingStrategy}>
            <table className="w-full">
              <thead className="bg-offwhite border-b border-silver-light">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-night w-12">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === products.length && products.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-silver-light text-gold focus:ring-gold"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-night w-12"></th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-night">Thumbnail</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-night">Product</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-night">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-night">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-night">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-light">
                {products.map((product) => (
                  <SortableProductRow
                    key={product.uid}
                    product={product}
                    onPriceUpdate={handlePriceUpdate}
                    onHomepageAssign={(uid) => setHomepageModal({ productUid: uid })}
                    isSelected={selectedProducts.has(product.uid)}
                    onSelect={handleSelectProduct}
                  />
                ))}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>

        {/* Pagination */}
        {initialTotal > 20 && (
          <div className="px-4 py-3 border-t border-silver-light flex items-center justify-between">
            <div className="text-sm text-silver-dark">
              Showing {(initialPage - 1) * 20 + 1} to {Math.min(initialPage * 20, initialTotal)} of {initialTotal}
            </div>
            <div className="flex gap-2">
              <AdminButton
                variant="outline"
                size="sm"
                disabled={initialPage === 1}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("page", String(initialPage - 1));
                  window.location.href = `/admin/super/products?${params.toString()}`;
                }}
              >
                Previous
              </AdminButton>
              <AdminButton
                variant="outline"
                size="sm"
                disabled={!initialHasMore}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("page", String(initialPage + 1));
                  window.location.href = `/admin/super/products?${params.toString()}`;
                }}
              >
                Next
              </AdminButton>
            </div>
          </div>
        )}
      </div>

      {/* Homepage Assignment Modal */}
      {homepageModal && (
        <HomepageAssignmentModal
          productUid={homepageModal.productUid}
          isOpen={!!homepageModal}
          onClose={() => setHomepageModal(null)}
        />
      )}
      </div>
    </AdminToastProvider>
  );
}
