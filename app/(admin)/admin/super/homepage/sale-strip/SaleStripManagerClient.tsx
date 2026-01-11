"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  Package,
} from "lucide-react";
import type { HomepageSaleStrip } from "@/lib/homepage/types";
import {
  getSaleStrips,
  createSaleStrip,
  updateSaleStrip,
  publishSaleStrip,
  unpublishSaleStrip,
  deleteSaleStrip,
  getProducts,
  updateSaleStripProducts,
  getSaleStripProducts,
} from "./actions";

const MAX_LENGTH = 180;

interface Product {
  uid: string;
  name: string;
  slug: string;
  price: number;
  main_image_path: string | null;
}

export default function SaleStripManagerClient() {
  const [strips, setStrips] = useState<HomepageSaleStrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showProductSelector, setShowProductSelector] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getSaleStrips();
      setStrips(data);
    } catch (error) {
      console.error("Failed to load sale strips", error);
    } finally {
      setLoading(false);
      setActionId(null);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const newStrip = await createSaleStrip({
        sale_text: "LIMITED RELEASE · COMPLIMENTARY SHIPPING ON PREPAID ORDERS",
      });
      setStrips((prev) => [newStrip, ...prev]);
    } catch (error) {
      console.error("Failed to create sale strip", error);
    } finally {
      setCreating(false);
    }
  }

  async function handleTextSave(id: string, sale_text: string) {
    setActionId(id);
    try {
      await updateSaleStrip(id, { sale_text });
    } catch (error) {
      console.error("Failed to update sale strip", error);
    } finally {
      setActionId(null);
    }
  }

  async function handleToggleVisibility(id: string, visible: boolean) {
    setActionId(id);
    try {
      await updateSaleStrip(id, { visible });
      setStrips((prev) =>
        prev.map((strip) => (strip.id === id ? { ...strip, visible } : strip)),
      );
    } catch (error) {
      console.error("Failed to toggle sale strip visibility", error);
      setActionId(null);
    }
  }

  async function handlePublish(id: string) {
    setActionId(id);
    try {
      await publishSaleStrip(id);
      await loadData();
    } catch (error) {
      console.error("Failed to publish sale strip", error);
      setActionId(null);
    }
  }

  async function handleUnpublish(id: string) {
    setActionId(id);
    try {
      await unpublishSaleStrip(id);
      await loadData();
    } catch (error) {
      console.error("Failed to unpublish sale strip", error);
      setActionId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this sale strip?")) return;
    setActionId(id);
    try {
      await deleteSaleStrip(id);
      setStrips((prev) => prev.filter((strip) => strip.id !== id));
    } catch (error) {
      console.error("Failed to delete sale strip", error);
    } finally {
      setActionId(null);
    }
  }

  async function handleOpenProductSelector(id: string) {
    setShowProductSelector(id);
    setLoadingProducts(true);
    try {
      const [allProducts, currentProductIds] = await Promise.all([
        getProducts(),
        getSaleStripProducts(id),
      ]);
      setProducts(allProducts);
      setSelectedProductIds(new Set(currentProductIds));
    } catch (error) {
      console.error("Failed to load products", error);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function handleSaveProducts(id: string) {
    setActionId(id);
    try {
      await updateSaleStripProducts(id, Array.from(selectedProductIds));
      setShowProductSelector(null);
      setSelectedProductIds(new Set());
    } catch (error) {
      console.error("Failed to save products", error);
    } finally {
      setActionId(null);
    }
  }

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-night animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="serif-display text-2xl text-night">Sale Strip</h2>
          <p className="text-sm text-silver-dark">
            Configure the marquee that appears below the navbar (drafts stay
            hidden until published).
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-lg border border-silver-light bg-night px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-night/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={creating}
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Add Sale Strip
        </button>
      </div>

      {strips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-silver-light bg-offwhite/60 p-12 text-center text-silver-dark">
          No sale strip announcements yet.
        </div>
      ) : (
        <div className="space-y-4">
          {strips.map((strip) => {
            const isPublished = strip.status === "published";
            const isBusy = actionId === strip.id;

            return (
              <div
                key={strip.id}
                className="rounded-xl border border-silver-light bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-silver-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                    {isPublished ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Published
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-silver-dark" />
                        Draft
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isPublished ? (
                      <button
                        type="button"
                        onClick={() => handleUnpublish(strip.id)}
                        className="rounded-md border border-silver-light px-3 py-1.5 text-xs font-medium text-night hover:bg-offwhite disabled:opacity-60"
                        disabled={isBusy}
                      >
                        {isBusy ? "Saving..." : "Unpublish"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePublish(strip.id)}
                        className="rounded-md bg-night px-3 py-1.5 text-xs font-medium text-white hover:bg-night/90 disabled:opacity-60"
                        disabled={isBusy || strip.sale_text.trim().length === 0}
                      >
                        {isBusy ? "Publishing..." : "Publish"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(strip.id)}
                      className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      disabled={isBusy}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-silver-dark">
                    Announcement Text
                  </label>
                  <textarea
                    value={strip.sale_text}
                    maxLength={MAX_LENGTH}
                    onChange={(event) => {
                      const value = event.target.value;
                      setStrips((prev) =>
                        prev.map((item) =>
                          item.id === strip.id
                            ? { ...item, sale_text: value }
                            : item,
                        ),
                      );
                    }}
                    onBlur={(event) =>
                      handleTextSave(strip.id, event.target.value)
                    }
                    className="w-full rounded-lg border border-silver-light bg-offwhite px-4 py-3 text-sm font-medium uppercase tracking-[0.3em] text-night focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                    rows={2}
                  />
                  <div className="flex items-center justify-between text-xs text-silver-dark">
                    <span>{strip.sale_text.length}/{MAX_LENGTH}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(strip.id, !strip.visible)}
                      className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.2em] text-night"
                      disabled={isBusy}
                    >
                      {strip.visible ? (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Hidden
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Product Selection */}
                <div className="mt-4 pt-4 border-t border-silver-light">
                  <button
                    type="button"
                    onClick={() => handleOpenProductSelector(strip.id)}
                    className="inline-flex items-center gap-2 rounded-md border border-silver-light px-3 py-1.5 text-xs font-medium text-night hover:bg-offwhite disabled:opacity-60"
                    disabled={isBusy}
                  >
                    <Package className="w-3.5 h-3.5" />
                    Select Products (Optional)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Selector Modal */}
      {showProductSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-silver-light">
              <h3 className="text-lg font-semibold text-night">Select Products for Sale</h3>
              <p className="text-sm text-silver-dark mt-1">
                Choose products to feature in this sale collection
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-night animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => {
                    const isSelected = selectedProductIds.has(product.uid);
                    return (
                      <button
                        key={product.uid}
                        type="button"
                        onClick={() => toggleProductSelection(product.uid)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? "border-gold bg-cream"
                            : "border-silver-light hover:border-silver"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProductSelection(product.uid)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-night truncate">
                              {product.name}
                            </div>
                            <div className="text-xs text-silver-dark mt-1">
                              ₹{product.price.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-silver-light flex items-center justify-between">
              <span className="text-sm text-silver-dark">
                {selectedProductIds.size} product{selectedProductIds.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductSelector(null);
                    setSelectedProductIds(new Set());
                  }}
                  className="px-4 py-2 text-sm font-medium text-night border border-silver-light rounded-md hover:bg-offwhite"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveProducts(showProductSelector)}
                  className="px-4 py-2 text-sm font-medium text-white bg-night rounded-md hover:bg-night/90 disabled:opacity-60"
                  disabled={actionId === showProductSelector}
                >
                  {actionId === showProductSelector ? "Saving..." : "Save Products"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



