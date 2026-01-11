"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { Search, Check, X, Edit2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Variant {
  sku: string;
  stock: number;
  price: number;
  active: boolean;
  products: { uid: string; name: string };
  colors: { name: string };
  sizes: { code: string };
}

interface VariantTableProps {
  role: string;
}

export function VariantTable({ role }: VariantTableProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // Editing state
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Variant>>({});
  
  // Batch editing state (Super Admin only)
  const [selectedSKUs, setSelectedSKUs] = useState<Set<string>>(new Set());
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchForm, setBatchForm] = useState<{ stock?: number; price?: number; active?: boolean }>({});
  const [batchSaving, setBatchSaving] = useState(false);
  
  const { addToast } = useToastWithCompat();
  const isSuperAdmin = role === "super_admin";

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/variants/list?page=${page}&search=${search}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (page === 1) setVariants(data.data);
      else setVariants(prev => [...prev, ...data.data]);
      setHasMore(data.meta.has_next);
    } catch (e) {
      addToast("Failed to load variants", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, addToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) fetchVariants();
      else setPage(1); // Reset to page 1 on search change handled by effect dependency
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchVariants();
  }, [page]);

  const startEdit = (v: Variant) => {
    setEditingSku(v.sku);
    setEditForm({ stock: v.stock, price: v.price, active: v.active });
  };

  const cancelEdit = () => {
    setEditingSku(null);
    setEditForm({});
  };

  const saveEdit = async (sku: string) => {
    try {
      const payload: any = { sku, stock: editForm.stock };
      if (isSuperAdmin) {
        payload.price = editForm.price;
        payload.active = editForm.active;
      }

      const res = await fetch("/api/admin/variants/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }

      addToast("Variant updated", "success");
      setEditingSku(null);
      // Optimistic update
      setVariants(prev => prev.map(v => v.sku === sku ? { ...v, ...editForm } : v));
    } catch (e: any) {
      addToast(e.message, "error");
    }
  };

  const handleBatchSave = async () => {
    if (selectedSKUs.size === 0) {
      addToast("Please select variants to update", "error");
      return;
    }

    setBatchSaving(true);
    try {
      const updates = Array.from(selectedSKUs).map(sku => ({
        sku,
        ...batchForm,
      }));

      const res = await fetch("/api/admin/variants/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Batch update failed");
      }

      const result = await res.json();
      addToast(`Updated ${result.summary.successful} variants`, "success");
      
      // Refresh data
      setPage(1);
      fetchVariants();
      setBatchEditMode(false);
      setSelectedSKUs(new Set());
      setBatchForm({});
    } catch (e: any) {
      addToast(e.message, "error");
    } finally {
      setBatchSaving(false);
    }
  };

  const toggleSelectSKU = (sku: string) => {
    const newSelected = new Set(selectedSKUs);
    if (newSelected.has(sku)) {
      newSelected.delete(sku);
    } else {
      newSelected.add(sku);
    }
    setSelectedSKUs(newSelected);
  };

  return (
    <div className="space-y-4">
      {/* Search and Batch Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-dark" />
          <input 
            placeholder="Search SKU, Product Name..." 
            className="w-full pl-10 pr-4 py-2 border border-silver-light rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-gold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {isSuperAdmin && (
          <div className="flex gap-2">
            {!batchEditMode ? (
              <AdminButton
                onClick={() => setBatchEditMode(true)}
                variant="outline"
                disabled={variants.length === 0}
              >
                Batch Edit
              </AdminButton>
            ) : (
              <>
                <AdminButton
                  onClick={handleBatchSave}
                  disabled={selectedSKUs.size === 0 || batchSaving}
                  icon={batchSaving ? Loader2 : Check}
                >
                  Save {selectedSKUs.size > 0 ? `(${selectedSKUs.size})` : ""}
                </AdminButton>
                <AdminButton
                  onClick={() => {
                    setBatchEditMode(false);
                    setSelectedSKUs(new Set());
                    setBatchForm({});
                  }}
                  variant="outline"
                  icon={X}
                >
                  Cancel
                </AdminButton>
              </>
            )}
          </div>
        )}
      </div>

      {/* Batch Edit Form */}
      {batchEditMode && isSuperAdmin && (
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
          <p className="text-sm font-medium text-night mb-3">
            Batch Update ({selectedSKUs.size} selected)
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-silver-dark mb-1">Stock</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="Leave empty to skip"
                value={batchForm.stock ?? ""}
                onChange={(e) => setBatchForm({ ...batchForm, stock: e.target.value ? parseInt(e.target.value) : undefined })}
              />
            </div>
            <div>
              <label className="block text-xs text-silver-dark mb-1">Price</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="Leave empty to skip"
                value={batchForm.price ?? ""}
                onChange={(e) => setBatchForm({ ...batchForm, price: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>
            <div>
              <label className="block text-xs text-silver-dark mb-1">Active</label>
              <select
                className="w-full px-3 py-2 border rounded text-sm"
                value={batchForm.active === undefined ? "" : batchForm.active ? "true" : "false"}
                onChange={(e) => setBatchForm({ ...batchForm, active: e.target.value === "" ? undefined : e.target.value === "true" })}
              >
                <option value="">Leave unchanged</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-silver-light rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-offwhite text-silver-darker uppercase text-xs font-bold border-b border-silver-light">
            <tr>
              {batchEditMode && isSuperAdmin && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedSKUs.size === variants.length && variants.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSKUs(new Set(variants.map(v => v.sku)));
                      } else {
                        setSelectedSKUs(new Set());
                      }
                    }}
                    className="rounded border-silver-light"
                  />
                </th>
              )}
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Variant</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-light">
            {variants.map((v) => {
              const isEditing = editingSku === v.sku;
              
              return (
                <tr key={v.sku} className={`hover:bg-offwhite/30 transition-colors ${selectedSKUs.has(v.sku) ? "bg-gold/10" : ""}`}>
                  {batchEditMode && isSuperAdmin && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSKUs.has(v.sku)}
                        onChange={() => toggleSelectSKU(v.sku)}
                        className="rounded border-silver-light"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="font-medium text-night">{v.products?.name}</div>
                    <div className="text-xs text-silver-dark font-mono">{v.products?.uid}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{v.sku}</td>
                  <td className="px-4 py-3 text-silver-dark">
                    {v.colors?.name} / {v.sizes?.code}
                  </td>
                  
                  {/* Editable Fields */}
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input 
                        type="number" 
                        className="w-20 p-1 border rounded text-right"
                        value={editForm.stock}
                        onChange={(e) => setEditForm({...editForm, stock: parseInt(e.target.value) || 0})}
                      />
                    ) : (
                      <span className={v.stock < 5 ? "text-red-600 font-bold" : "text-green-600"}>{v.stock}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {isEditing && isSuperAdmin ? (
                      <input 
                        type="number" 
                        className="w-20 p-1 border rounded text-right"
                        value={editForm.price}
                        onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})}
                      />
                    ) : (
                      <span>₹{v.price}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {isEditing && isSuperAdmin ? (
                      <button 
                        onClick={() => setEditForm({...editForm, active: !editForm.active})}
                        className={`px-2 py-1 rounded text-xs font-bold uppercase ${editForm.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                      >
                        {editForm.active ? "Active" : "Inactive"}
                      </button>
                    ) : (
                      <Badge variant={v.active ? "vine" : "secondary"}>
                        {v.active ? "Active" : "Inactive"}
                      </Badge>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => saveEdit(v.sku)} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4" /></button>
                        <button onClick={cancelEdit} className="text-red-600 hover:text-red-800"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(v)} className="text-silver-dark hover:text-gold">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {variants.length === 0 && !loading && (
          <div className="p-8 text-center text-silver-dark italic">No variants found.</div>
        )}
        {loading && <div className="p-8 text-center text-silver-dark"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}
      </div>

      {hasMore && !loading && (
        <div className="text-center">
          <AdminButton onClick={() => setPage(p => p + 1)} variant="outline">Load More</AdminButton>
        </div>
      )}
    </div>
  );
}
