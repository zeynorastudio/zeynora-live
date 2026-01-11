"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { Eye, Save, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import VariantTable from "./VariantTable";
import { ImageGalleryManager } from "./ImageGalleryManager";

// ============================================================
// TYPES
// ============================================================

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface ProductVariant {
  sku: string;
  stock: number;
  price: number;
  active: boolean;
  color_id: number;
  size_id: number;
  colors?: { name: string };
  sizes?: { code: string };
}

interface Product {
  uid: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  subcategory: string | null;
  super_category: string | null;
  active: boolean;
  featured: boolean;
  best_selling: boolean;
  new_launch: boolean;
  on_sale: boolean;
  price: number;
  strike_price: number | null;
  sort_order: number | null;
  style: string | null;
  occasion: string | null;
  product_variants: ProductVariant[];
}

interface ProductEditorFormProps {
  product: Product;
  role: string;
  leafCategories: Category[];
  parentCategories: Category[];
}

// Form data structure matching ONLY valid DB columns
interface FormData {
  name: string;
  slug: string;
  description: string;
  subcategory: string; // Free text: "Name" or "Name (Category)"
  category_override: string; // Optional manual category override
  active: boolean;
  featured: boolean;
  best_selling: boolean;
  new_launch: boolean;
  on_sale: boolean;
  price: number;
  strike_price: number | null;
  sort_order: number;
  style: string;
  occasion: string;
  season: string;
}

// ============================================================
// COMPONENT
// ============================================================

export default function ProductEditorForm({
  product,
  role,
  leafCategories,
  parentCategories,
}: ProductEditorFormProps) {
  const router = useRouter();
  const { addToast } = useToastWithCompat();

  // Permissions
  const isSuperAdmin = role === "super_admin";
  const isReadOnly = !isSuperAdmin;

  // ============================================================
  // FORM STATE - Initialize from product
  // ============================================================
  const [formData, setFormData] = useState<FormData>({
    name: product.name || "",
    slug: product.slug || "",
    description: product.description || "",
    subcategory: product.subcategory || "",
    category_override: (product as any).category_override || "",
    active: product.active ?? false,
    featured: product.featured ?? false,
    best_selling: product.best_selling ?? false,
    new_launch: product.new_launch ?? false,
    on_sale: product.on_sale ?? false,
    price: product.price ?? 0,
    strike_price: product.strike_price ?? null,
    sort_order: product.sort_order ?? 999,
    style: product.style || "",
    occasion: product.occasion || "",
    season: (product as any).season || "",
  });

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variant generator state
  const [variantColors, setVariantColors] = useState<string>("");
  const [variantSizes, setVariantSizes] = useState<string>("S:0|M:0|L:0");

  // ============================================================
  // DERIVED VALUES - Parse subcategory to show derived category
  // ============================================================

  // Parse subcategory format: "Name (Category)"
  const parseSubcategory = (input: string): { name: string; category: string | null } => {
    const match = input.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      return { name: match[1].trim(), category: match[2].trim() };
    }
    return { name: input.trim(), category: null };
  };

  const parsedSubcategory = parseSubcategory(formData.subcategory);
  const derivedCategory = parsedSubcategory.category;
  const effectiveCategory = formData.category_override || derivedCategory || product.super_category;

  // Preview URL - only valid if slug exists (from saved data)
  const canPreview = Boolean(product.slug && product.slug.trim().length > 0);
  const previewUrl = canPreview ? `/product/${product.slug}` : null;

  // ============================================================
  // FIELD CHANGE HANDLERS
  // ============================================================

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;

      if (type === "checkbox") {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({ ...prev, [name]: checked }));
      } else if (type === "number") {
        const numValue = value === "" ? 0 : parseFloat(value);
        setFormData((prev) => ({ ...prev, [name]: numValue }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    },
    []
  );

  const handleStrikePriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const numValue = value === "" ? null : parseFloat(value);
      setFormData((prev) => ({ ...prev, strike_price: numValue }));
    },
    []
  );

  // ============================================================
  // FORM SUBMIT - SAVE CHANGES
  // ============================================================

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    // Validate required fields
    if (!formData.name || formData.name.trim().length < 3) {
      addToast("Product name must be at least 3 characters", "error");
      return;
    }

    if (!formData.slug || formData.slug.trim().length < 3) {
      addToast("Product slug must be at least 3 characters", "error");
      return;
    }

    if (!formData.subcategory || formData.subcategory.trim().length < 2) {
      addToast("Please enter a subcategory", "error");
      return;
    }

    // Validate sale pricing
    if (formData.on_sale && formData.strike_price !== null) {
      if (formData.strike_price <= formData.price) {
        addToast("Strike price must be greater than selling price when on sale", "error");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Build payload with ONLY valid DB columns
      // Category and tags will be auto-derived by the API
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        subcategory: formData.subcategory.trim(), // Format: "Name" or "Name (Category)"
        category_override: formData.category_override.trim() || null,
        active: formData.active,
        featured: formData.featured,
        best_selling: formData.best_selling,
        new_launch: formData.new_launch,
        on_sale: formData.on_sale,
        price: formData.price,
        strike_price: formData.on_sale ? formData.strike_price : null,
        sort_order: formData.sort_order,
        style: formData.style.trim() || null,
        occasion: formData.occasion.trim() || null,
        season: formData.season.trim() || null,
      };

      const response = await fetch(`/api/admin/products/${product.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      // Check for HTTP errors
      if (!response.ok) {
        const errorMsg = result.error || result.message || `Save failed (HTTP ${response.status})`;
        addToast(errorMsg, "error");
        return;
      }

      // Check for zero rows updated
      if (result.rowsAffected === 0) {
        addToast("No changes were saved. Product may not exist.", "error");
        return;
      }

      // Success
      addToast("Product saved successfully", "success");

      // Refresh to show updated data from server
      router.refresh();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred";
      addToast(`Save failed: ${errorMsg}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // PREVIEW BUTTON HANDLER
  // ============================================================

  const handlePreview = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission
    e.preventDefault();
    e.stopPropagation();

    if (!previewUrl) {
      addToast("Save product before previewing", "info");
      return;
    }

    window.open(previewUrl, "_blank");
  };

  // ============================================================
  // VARIANT GENERATOR
  // ============================================================

  const handleGenerateVariants = async () => {
    if (!confirm("This will generate/overwrite variants based on Colors and Sizes. Continue?")) {
      return;
    }

    try {
      const colors = variantColors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/admin/products/${product.uid}/variants/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colors,
          sizes_with_stock: variantSizes,
          price: formData.price,
          cost_price: 0,
          single_color: colors.length === 1,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      addToast(`Generated ${data.count} variants`, "success");
      router.refresh();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to generate variants";
      addToast(errorMsg, "error");
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20">
      {/* ========== TOP BAR ========== */}
      <div className="flex justify-between items-center sticky top-0 bg-offwhite/90 backdrop-blur z-20 py-4 border-b border-silver-light -mx-6 px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-night">
            {formData.name || product.name || "Edit Product"}
          </h2>
          <StatusBadge active={formData.active} />
        </div>
        <div className="flex gap-3">
          {/* Preview Button */}
          <AdminButton
            type="button"
            variant="outline"
            icon={Eye}
            onClick={handlePreview}
            disabled={!canPreview}
            title={canPreview ? "Open product page" : "Save product to enable preview"}
          >
            Preview
          </AdminButton>

          {/* Save Button */}
          <AdminButton
            type="submit"
            disabled={isSubmitting || isReadOnly}
            isLoading={isSubmitting}
            icon={isSubmitting ? Loader2 : Save}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </AdminButton>
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ===== LEFT COLUMN (2/3) ===== */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Information */}
          <AdminCard title="Basic Information">
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Product Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  className="w-full p-2 border rounded"
                  required
                  minLength={3}
                />
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium mb-1">
                  Slug *
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={formData.slug}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  className="w-full p-2 border rounded font-mono text-sm"
                  required
                  minLength={3}
                />
              </div>

              {/* Subcategory (with category parsing) */}
              <div>
                <label htmlFor="subcategory" className="block text-sm font-medium mb-1">
                  Subcategory *
                </label>
                <input
                  id="subcategory"
                  name="subcategory"
                  type="text"
                  value={formData.subcategory}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  className="w-full p-2 border rounded"
                  required
                  placeholder="e.g. Anarkali (Wedding & Bridal)"
                />
                <p className="text-xs text-silver-dark mt-1">
                  Format: &quot;Subcategory Name&quot; or &quot;Subcategory Name (Category Name)&quot;
                </p>
              </div>

              {/* Derived Category (Read-only preview) */}
              {derivedCategory && (
                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                  <p className="text-xs font-medium text-blue-800 mb-1">Auto-Derived Category</p>
                  <p className="text-sm text-blue-900 font-bold">{derivedCategory}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Parsed from subcategory. Use override below to change.
                  </p>
                </div>
              )}

              {/* Category Override */}
              <div>
                <label htmlFor="category_override" className="block text-sm font-medium mb-1">
                  Category Override (Optional)
                </label>
                <input
                  id="category_override"
                  name="category_override"
                  type="text"
                  value={formData.category_override}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  className="w-full p-2 border rounded"
                  placeholder="Leave empty to use auto-derived category"
                />
                <p className="text-xs text-silver-dark mt-1">
                  Manually override the category. Leave blank to use derived category.
                </p>
              </div>

              {/* Style + Occasion + Season */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="style" className="block text-sm font-medium mb-1">
                    Style
                  </label>
                  <input
                    id="style"
                    name="style"
                    type="text"
                    value={formData.style}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className="w-full p-2 border rounded"
                    placeholder="e.g. Semi-Formal"
                  />
                </div>
                <div>
                  <label htmlFor="occasion" className="block text-sm font-medium mb-1">
                    Occasion
                  </label>
                  <input
                    id="occasion"
                    name="occasion"
                    type="text"
                    value={formData.occasion}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className="w-full p-2 border rounded"
                    placeholder="e.g. Party Night"
                  />
                </div>
                <div>
                  <label htmlFor="season" className="block text-sm font-medium mb-1">
                    Season
                  </label>
                  <input
                    id="season"
                    name="season"
                    type="text"
                    value={formData.season}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className="w-full p-2 border rounded"
                    placeholder="e.g. Winter"
                  />
                </div>
              </div>

              {/* Sort Order */}
              <div className="w-1/2">
                <label htmlFor="sort_order" className="block text-sm font-medium mb-1">
                  Sort Order
                </label>
                <input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  className="w-full p-2 border rounded"
                  min={0}
                />
                <p className="text-xs text-silver-dark mt-1">
                  Lower numbers appear first
                </p>
              </div>
            </div>
          </AdminCard>

          {/* Description */}
          <AdminCard title="Description">
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Product Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={isReadOnly}
                rows={6}
                className="w-full p-2 border rounded"
                placeholder="Enter product description..."
              />
            </div>
          </AdminCard>

          {/* Pricing */}
          <AdminCard title="Pricing">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                {/* Selling Price */}
                <div>
                  <label htmlFor="price" className="block text-sm font-medium mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className="w-full p-2 border rounded text-lg font-bold"
                    min={0}
                    step="0.01"
                    required
                  />
                </div>

                {/* Sale Toggle */}
                <div className="pt-4 border-t border-silver-light">
                  <label className="flex items-center justify-between p-2 border rounded hover:bg-offwhite cursor-pointer">
                    <span className="font-medium">On Sale</span>
                    <input
                      type="checkbox"
                      name="on_sale"
                      checked={formData.on_sale}
                      onChange={handleInputChange}
                      disabled={isReadOnly}
                      className="w-5 h-5 accent-gold"
                    />
                  </label>
                </div>

                {/* Strike Price (only visible when on_sale) */}
                {formData.on_sale && (
                  <div>
                    <label htmlFor="strike_price" className="block text-sm font-medium mb-1">
                      Strike Price (₹) - Original Price
                    </label>
                    <input
                      id="strike_price"
                      name="strike_price"
                      type="number"
                      value={formData.strike_price ?? ""}
                      onChange={handleStrikePriceChange}
                      disabled={isReadOnly}
                      className="w-full p-2 border rounded"
                      min={0}
                      step="0.01"
                      placeholder="Enter original price..."
                    />
                    {formData.strike_price !== null && formData.strike_price > formData.price && (
                      <p className="text-xs text-green-600 mt-1">
                        Sale: ₹{formData.price.toLocaleString()} (was ₹
                        {formData.strike_price.toLocaleString()})
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Price Summary */}
              <div className="bg-blue-50 p-4 rounded border border-blue-100 h-fit">
                <h4 className="text-sm font-bold text-blue-800 mb-2">Price Summary</h4>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Selling Price:</span>
                  <span className="font-mono font-bold">₹{formData.price.toLocaleString()}</span>
                </div>
                {formData.on_sale && formData.strike_price !== null && (
                  <div className="flex justify-between">
                    <span className="text-sm">Original Price:</span>
                    <span className="font-mono line-through text-silver-dark">
                      ₹{formData.strike_price.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </AdminCard>

          {/* Media Gallery */}
          <AdminCard title="Media Gallery">
            <ImageGalleryManager uid={product.uid} role={role} />
          </AdminCard>

          {/* Variants */}
          <AdminCard title="Variants">
            {/* Variant Generator */}
            <div className="mb-6 bg-offwhite p-4 rounded border border-silver-light">
              <h4 className="font-bold text-sm mb-2">Generator Settings</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-silver-dark uppercase mb-1">
                    Colors (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Red, Blue, Green"
                    className="w-full p-2 border rounded text-sm"
                    value={variantColors}
                    onChange={(e) => setVariantColors(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-silver-dark uppercase mb-1">
                    Sizes & Stock Seed
                  </label>
                  <input
                    type="text"
                    placeholder="S:10|M:5|L:3"
                    className="w-full p-2 border rounded text-sm"
                    value={variantSizes}
                    onChange={(e) => setVariantSizes(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
              {isSuperAdmin && (
                <AdminButton
                  type="button"
                  onClick={handleGenerateVariants}
                  size="sm"
                  variant="outline"
                  icon={RefreshCw}
                >
                  Generate / Reset Variants
                </AdminButton>
              )}
            </div>

            {/* Variants Table */}
            <VariantTable
              uid={product.uid}
              variants={product.product_variants || []}
              role={role}
            />
          </AdminCard>
        </div>

        {/* ===== RIGHT COLUMN (1/3) ===== */}
        <div className="space-y-8">
          {/* Visibility Toggles */}
          <AdminCard title="Visibility">
            <div className="space-y-4">
              <ToggleField
                label="Active"
                name="active"
                checked={formData.active}
                onChange={handleInputChange}
                disabled={isReadOnly}
              />
              <ToggleField
                label="Featured"
                name="featured"
                checked={formData.featured}
                onChange={handleInputChange}
                disabled={isReadOnly}
              />
              <ToggleField
                label="Best Selling"
                name="best_selling"
                checked={formData.best_selling}
                onChange={handleInputChange}
                disabled={isReadOnly}
              />
              <ToggleField
                label="New Launch"
                name="new_launch"
                checked={formData.new_launch}
                onChange={handleInputChange}
                disabled={isReadOnly}
              />
            </div>
          </AdminCard>

          {/* Product Info Summary */}
          <AdminCard title="Product Info">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-silver-dark">UID:</span>
                <span className="font-mono">{product.uid}</span>
              </div>
              {effectiveCategory && (
                <div className="flex justify-between">
                  <span className="text-silver-dark">Category:</span>
                  <span className="font-medium">{effectiveCategory}</span>
                </div>
              )}
              {formData.subcategory && (
                <div className="flex justify-between">
                  <span className="text-silver-dark">Subcategory:</span>
                  <span>{parsedSubcategory.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-silver-dark">Variants:</span>
                <span>{product.product_variants?.length || 0}</span>
              </div>
              <div className="pt-2 border-t border-silver-light">
                <p className="text-xs text-silver-dark mb-1">Tags (Auto-Generated)</p>
                <p className="text-xs text-blue-600 italic">
                  Tags are automatically generated on save
                </p>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>
    </form>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider",
        active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
      )}
    >
      {active ? "Active" : "Draft"}
    </span>
  );
}

interface ToggleFieldProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

function ToggleField({ label, name, checked, onChange, disabled }: ToggleFieldProps) {
  return (
    <label className="flex items-center justify-between p-2 border rounded hover:bg-offwhite cursor-pointer">
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="w-5 h-5 accent-gold"
      />
    </label>
  );
}
