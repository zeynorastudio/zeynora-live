"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { AdminToastProvider } from "@/components/ui/ToastProviderWrapper";
import { createProductAction } from "./actions";
import { Save, Loader2, AlertCircle } from "lucide-react";

interface FormData {
  superCategories: Array<{ id: string; name: string; slug: string }>;
  allCategories: Array<{ id: string; name: string; slug: string; parent_id: string | null }>;
  occasions: string[];
  seasons: string[];
}

interface AddProductClientProps {
  initialFormData: FormData;
}

export function AddProductClient({ initialFormData }: AddProductClientProps) {
  const router = useRouter();
  const { addToast } = useToastWithCompat();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formState, setFormState] = useState({
    name: "",
    price: "",
    costPrice: "",
    subcategory: "", // Format: "Name" or "Name (Category)"
    categoryOverride: "",
    style: "",
    occasion: "",
    season: "",
    description: "",
    sortOrder: "999",
    colors: "",
    sizesWithStock: "",
    seoTitle: "",
    seoDescription: "",
    active: true,
    featured: false,
    bestSelling: false,
    newLaunch: false,
  });

  // Parse subcategory to show derived category preview
  const parseSubcategory = (input: string): { name: string; category: string | null } => {
    const match = input.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      return { name: match[1].trim(), category: match[2].trim() };
    }
    return { name: input.trim(), category: null };
  };

  const parsedSubcategory = parseSubcategory(formState.subcategory);
  const derivedCategory = parsedSubcategory.category;
  const effectiveCategory = formState.categoryOverride || derivedCategory;

  const handleChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formState.name.trim()) {
      newErrors.name = "Product name is required";
    }

    const price = parseFloat(formState.price);
    if (!formState.price || isNaN(price) || price <= 0) {
      newErrors.price = "Price must be a number greater than 0";
    }

    if (formState.costPrice && isNaN(parseFloat(formState.costPrice))) {
      newErrors.costPrice = "Cost price must be a valid number";
    }

    // Validate subcategory
    if (!formState.subcategory || !formState.subcategory.trim()) {
      newErrors.subcategory = "Subcategory is required";
    }

    // Validate color is provided
    if (!formState.colors || !formState.colors.trim()) {
      newErrors.colors = "Color is required";
    }

    // Validate sizes format: M-9,L-4,XL-12
    if (formState.sizesWithStock && !/^([A-Z0-9]+-\d+,?)+$/.test(formState.sizesWithStock.replace(/\s/g, ""))) {
      newErrors.sizesWithStock = "Invalid format. Use: M-9,L-4,XL-12";
    }

    // Validate sort order
    const sortOrder = parseInt(formState.sortOrder);
    if (isNaN(sortOrder) || sortOrder < 0) {
      newErrors.sortOrder = "Sort order must be 0 or greater";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      addToast("Please fix the errors in the form", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(formState).forEach(([key, value]) => {
        if (typeof value === "boolean") {
          formData.append(key, value.toString());
        } else if (value) {
          formData.append(key, value.toString());
        }
      });

      const result = await createProductAction(formData);

      if (result.success) {
        addToast("Product created successfully", "success");
        router.push(`/admin/super/products/${result.productUid}`);
      } else {
        addToast(result.error || "Failed to create product", "error");
      }
    } catch (error: any) {
      addToast(error.message || "Failed to create product", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-generate SEO fields based on effective category
  React.useEffect(() => {
    if (formState.name && effectiveCategory) {
      const seoTitle = `${formState.name} | ${effectiveCategory}`;
      if (!formState.seoTitle || formState.seoTitle === `${formState.name} | Zeynora` || formState.seoTitle.startsWith(`${formState.name} |`)) {
        setFormState((prev) => ({ ...prev, seoTitle }));
      }
    }

    if (formState.name) {
      const seoDesc = `Buy ${formState.name} — premium quality. Fast delivery.`;
      if (!formState.seoDescription || formState.seoDescription === `Buy ${formState.name} — premium quality. Fast shipping.`) {
        setFormState((prev) => ({ ...prev, seoDescription: seoDesc }));
      }
    }
  }, [formState.name, effectiveCategory]);

  return (
    <AdminToastProvider>
      <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg border border-silver-light p-6 space-y-6">
        {/* Basic Info */}
        <div>
          <h2 className="text-lg font-semibold text-night mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-night mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-gold/50 outline-none ${
                  errors.name ? "border-red-500" : "border-silver-light"
                }`}
                required
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-night mb-1">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formState.price}
                onChange={(e) => handleChange("price", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-gold/50 outline-none ${
                  errors.price ? "border-red-500" : "border-silver-light"
                }`}
                required
              />
              {errors.price && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.price}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-night mb-1">Cost Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formState.costPrice}
                onChange={(e) => handleChange("costPrice", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-gold/50 outline-none ${
                  errors.costPrice ? "border-red-500" : "border-silver-light"
                }`}
              />
              {errors.costPrice && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.costPrice}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-night mb-1">
                Subcategory <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formState.subcategory}
                onChange={(e) => handleChange("subcategory", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-gold/50 outline-none ${
                  errors.subcategory ? "border-red-500" : "border-silver-light"
                }`}
                placeholder="e.g. Anarkali (Wedding & Bridal)"
                required
              />
              {errors.subcategory && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.subcategory}
                </p>
              )}
              <p className="mt-1 text-xs text-silver-dark">
                Format: &quot;Subcategory Name&quot; or &quot;Subcategory Name (Category Name)&quot;
              </p>
            </div>

            {/* Derived Category Preview */}
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
              <label className="block text-sm font-medium text-night mb-1">
                Category Override (Optional)
              </label>
              <input
                type="text"
                value={formState.categoryOverride}
                onChange={(e) => handleChange("categoryOverride", e.target.value)}
                className="w-full px-3 py-2 border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none"
                placeholder="Leave empty to use auto-derived category"
              />
              <p className="mt-1 text-xs text-silver-dark">
                Manually override the category. Leave blank to use derived category.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-night mb-1">Style</label>
              <input
                type="text"
                value={formState.style}
                onChange={(e) => handleChange("style", e.target.value)}
                className="w-full px-3 py-2 border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-night mb-1">Occasion</label>
              <select
                value={formState.occasion}
                onChange={(e) => handleChange("occasion", e.target.value)}
                className="w-full px-3 py-2 border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none"
              >
                <option value="">Select occasion</option>
                {initialFormData.occasions.map((occ) => (
                  <option key={occ} value={occ}>
                    {occ.charAt(0).toUpperCase() + occ.slice(1).replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-night mb-1">Season</label>
              <input
                type="text"
                value={formState.season}
                onChange={(e) => handleChange("season", e.target.value)}
                className="w-full px-3 py-2 border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none"
                placeholder="e.g. Winter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-night mb-1">
                Sort Order <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formState.sortOrder}
                onChange={(e) => handleChange("sortOrder", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-gold/50 outline-none ${
                  errors.sortOrder ? "border-red-500" : "border-silver-light"
                }`}
                required
              />
              {errors.sortOrder && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.sortOrder}
                </p>
              )}
              <p className="mt-1 text-xs text-silver-dark">
                Lower numbers appear first (default: 999)
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-night mb-1">Description</label>
            <textarea
              value={formState.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none"
            />
          </div>
        </div>

        {/* Variants */}
        <div>
          <h2 className="text-lg font-semibold text-night mb-4">Variants & Stock</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-night mb-1">
                Colors (comma-separated)
              </label>
              <input
                type="text"
                value={formState.colors}
                onChange={(e) => handleChange("colors", e.target.value)}
                placeholder="Red, Blue, Green"
                className="w-full px-3 py-2 border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none"
              />
              <p className="mt-1 text-xs text-silver-dark">
                Separate multiple colors with commas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-night mb-1">
                Sizes with Stock <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formState.sizesWithStock}
                onChange={(e) => handleChange("sizesWithStock", e.target.value)}
                placeholder="M-9,L-4,XL-12"
                className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-gold/50 outline-none ${
                  errors.sizesWithStock ? "border-red-500" : "border-silver-light"
                }`}
              />
              {errors.sizesWithStock ? (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.sizesWithStock}
                </p>
              ) : (
                <p className="mt-1 text-xs text-silver-dark">
                  Format: SIZE-QUANTITY (e.g., M-2,L-1,XL-3)
                </p>
              )}
              {errors.colors && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.colors}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SEO */}
        <div>
          <h2 className="text-lg font-semibold text-night mb-4">SEO</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-night mb-1">SEO Title</label>
              <input
                type="text"
                value={formState.seoTitle}
                onChange={(e) => handleChange("seoTitle", e.target.value)}
                className="w-full px-3 py-2 border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-night mb-1">SEO Description</label>
              <textarea
                value={formState.seoDescription}
                onChange={(e) => handleChange("seoDescription", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tags - Auto-generated notification */}
        <div className="bg-blue-50 p-4 rounded border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Auto-Generated Tags</h3>
          <p className="text-xs text-blue-700">
            Tags will be automatically generated from category, subcategory, style, occasion, season, and visibility flags. 
            Manual tag entry is not supported.
          </p>
        </div>

        {/* Status */}
        <div>
          <h2 className="text-lg font-semibold text-night mb-4">Status</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.active}
                onChange={(e) => handleChange("active", e.target.checked)}
                className="rounded border-silver-light"
              />
              <span className="text-sm text-night">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.featured}
                onChange={(e) => handleChange("featured", e.target.checked)}
                className="rounded border-silver-light"
              />
              <span className="text-sm text-night">Featured</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.bestSelling}
                onChange={(e) => handleChange("bestSelling", e.target.checked)}
                className="rounded border-silver-light"
              />
              <span className="text-sm text-night">Best Selling</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.newLaunch}
                onChange={(e) => handleChange("newLaunch", e.target.checked)}
                className="rounded border-silver-light"
              />
              <span className="text-sm text-night">New Launch</span>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <AdminButton
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </AdminButton>
        <AdminButton
          type="submit"
          variant="secondary"
          icon={isSubmitting ? Loader2 : Save}
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Product"}
        </AdminButton>
      </div>
    </form>
    </AdminToastProvider>
  );
}


