"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { TagInput } from "./TagInput";
import { ProductImageGrid } from "./ProductImageGrid";
import { VariantTable, VariantItem } from "./VariantTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { UploadCloud, Save, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import "@/styles/super-product-editor.css";

// Types based on existing data structure + form needs
interface ProductFormData {
  uid: string;
  name: string;
  slug: string;
  price: number;
  cost_price?: number;
  category: string;
  subcategory?: string;
  super_category?: string;
  description?: string;
  style?: string;
  occasion?: string;
  season?: string;
  fabric?: string;
  work?: string;
  tags: string[];
  active: boolean;
  featured: boolean;
  best_selling: boolean;
  variants: VariantItem[];
  images: any[]; // simplified for form state
  metadata: any;
}

interface SuperProductFormProps {
  mode: "create" | "edit";
  initialData?: Partial<ProductFormData> | null; // Nullable for create mode
  readOnly?: boolean; // Admin vs Super Admin check passed down
}

const TABS = [
  { id: "basic", label: "Basic Info" },
  { id: "fabric", label: "Fabric & Work" },
  { id: "tags", label: "Tags" },
  { id: "variants", label: "Variants" },
  { id: "images", label: "Images" },
  { id: "status", label: "Status & Visibility" },
];

export function SuperProductForm({ mode, initialData, readOnly = false }: SuperProductFormProps) {
  const router = useRouter();
  const { addToast } = useToastWithCompat();
  const [activeTab, setActiveTab] = useState("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial State
  const [formData, setFormData] = useState<ProductFormData>({
    uid: initialData?.uid || crypto.randomUUID(),
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    price: initialData?.price || 0,
    cost_price: initialData?.cost_price || 0,
    category: initialData?.category || "",
    subcategory: initialData?.subcategory || "",
    super_category: initialData?.super_category || "",
    description: initialData?.description || "",
    style: initialData?.style || "",
    occasion: initialData?.occasion || "",
    season: initialData?.season || "",
    fabric: initialData?.metadata?.fabric || "",
    work: initialData?.metadata?.work || "",
    tags: initialData?.tags || [],
    active: initialData?.active ?? false,
    featured: initialData?.featured ?? false,
    best_selling: initialData?.best_selling ?? false,
    variants: initialData?.variants || [],
    images: initialData?.images || [],
    metadata: initialData?.metadata || {},
  });

  // Handlers
  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    if (readOnly) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMetadataChange = (key: string, value: any) => {
    if (readOnly) return;
    setFormData(prev => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value }
    }));
  };

  const validateForm = () => {
    if (!formData.name) return "Product Name is required";
    if (!formData.slug) return "Slug is required";
    if (formData.price < 0) return "Price cannot be negative";
    // Category is optional in schema but required in UI rules? "Required fields: ... category"
    if (!formData.category) return "Category is required"; 
    return null;
  };

  const handleSave = async () => {
    if (readOnly) return;
    const error = validateForm();
    if (error) {
      addToast(error, "error");
      return;
    }

    setIsSaving(true);
    try {
      const endpoint = mode === "create" ? "/api/admin/products" : `/api/admin/products/${formData.uid}`;
      const method = mode === "create" ? "POST" : "PUT";

      // Prepare payload matching API expectations
      const payload = {
        ...formData,
        metadata: {
          ...formData.metadata,
          fabric: formData.fabric,
          work: formData.work,
          description: formData.description // If description is not a column, put in metadata
        }
      };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save product");
      }

      const data = await response.json();
      
      addToast(mode === "create" ? "Product created successfully" : "Product updated successfully", "success");
      
      if (mode === "create") {
        router.push(`/admin/super/products/${data.product.uid}`);
      } else {
        router.refresh();
      }
    } catch (error: any) {
      console.error("Save error:", error);
      addToast(error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateVariants = async () => {
    if (readOnly) return;
    setIsSaving(true); // Reuse saving state for loading
    try {
        const response = await fetch(`/api/admin/products/${formData.uid}/variants/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Minimal stub payload for generation logic (Phase 3.6 requirement says "Generate Variants button -> calls API")
            // The API usually needs color/size config. Assuming default logic or simple stub for now as UI doesn't have complex config yet.
            body: JSON.stringify({ colors: ["Red", "Blue"], sizes_with_stock: "S-10,M-10,L-10" }) 
        });
        
        if (!response.ok) throw new Error("Failed to generate variants");
        
        addToast("Variants generated", "success");
        router.refresh(); // Reload to get new variants
    } catch (error: any) {
        addToast(error.message, "error");
    } finally {
        setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly || !e.target.files?.length) return;
    setIsUploading(true);

    const files = Array.from(e.target.files);
    const uploadFormData = new FormData();
    uploadFormData.append("product_uid", formData.uid);
    uploadFormData.append("type", "gallery");
    files.forEach(f => uploadFormData.append("files[]", f));

    try {
        const response = await fetch("/api/admin/uploads/batch", {
            method: "POST",
            body: uploadFormData,
        });

        if (!response.ok) throw new Error("Upload failed");
        
        const result = await response.json();
        addToast(`Uploaded ${result.uploaded?.length || 0} images`, "success");
        
        // Optimistically add to local state or refresh
        // For simplicity, let's just refresh or we'd need to know the public URLs returned
        if (result.uploaded) {
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...result.uploaded.map((u: any) => ({
                    path: u.path,
                    publicUrl: u.public_url,
                    type: "gallery"
                }))]
            }));
        }
    } catch (error: any) {
        addToast(error.message, "error");
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = (path: string) => {
      if (readOnly) return;
      // UI removal only for now, real deletion might need separate API call if not handling on "Save"
      // Ideally we call an API to detach/delete.
      setFormData(prev => ({
          ...prev,
          images: prev.images.filter(img => img.path !== path)
      }));
      addToast("Image removed (save to persist)", "info");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <AdminButton variant="outline" size="icon" className="w-10 h-10 p-0">
              <ChevronLeft className="w-4 h-4" />
            </AdminButton>
          </Link>
          <div>
            <h1 className="serif-display text-2xl text-night">
              {mode === "create" ? "Create Product" : "Edit Product"}
            </h1>
            <p className="text-sm text-silver-dark">
              {mode === "create" ? "Add a new item to catalog" : `UID: ${formData.uid}`}
            </p>
          </div>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-3">
            <AdminButton onClick={handleSave} isLoading={isSaving} icon={Save}>
              {mode === "create" ? "Create Product" : "Save Changes"}
            </AdminButton>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="product-editor-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`product-editor-tab ${activeTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* BASIC INFO */}
          {activeTab === "basic" && (
            <AdminCard title="Basic Information">
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input 
                    className="form-input" 
                    value={formData.name} 
                    onChange={e => handleInputChange("name", e.target.value)} 
                    disabled={readOnly}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Slug *</label>
                    <input 
                      className="form-input font-mono" 
                      value={formData.slug} 
                      onChange={e => handleInputChange("slug", e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    {/* Select UI wrapper needed or native select for simplicity now */}
                    <select 
                        className="form-input" 
                        value={formData.category} 
                        onChange={e => handleInputChange("category", e.target.value)}
                        disabled={readOnly}
                    >
                        <option value="">Select Category...</option>
                        <option value="Sarees">Sarees</option>
                        <option value="Lehengas">Lehengas</option>
                        <option value="Suits">Suits</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Price (₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={formData.price} 
                      onChange={e => handleInputChange("price", parseFloat(e.target.value))}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cost Price (₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={formData.cost_price || 0} 
                      onChange={e => handleInputChange("cost_price", parseFloat(e.target.value))}
                      disabled={readOnly}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    className="form-textarea" 
                    value={formData.description} 
                    onChange={e => handleInputChange("description", e.target.value)}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </AdminCard>
          )}

          {/* FABRIC & WORK */}
          {activeTab === "fabric" && (
            <AdminCard title="Fabric & Work Details">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="form-group">
                    <label className="form-label">Fabric Type</label>
                    <input 
                        className="form-input" 
                        value={formData.fabric || ""} 
                        onChange={e => handleInputChange("fabric", e.target.value)}
                        disabled={readOnly}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Season</label>
                    <input 
                        className="form-input" 
                        value={formData.season || ""} 
                        onChange={e => handleInputChange("season", e.target.value)}
                        disabled={readOnly}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="form-group">
                    <label className="form-label">Work Type</label>
                    <input 
                        className="form-input" 
                        value={formData.work || ""} 
                        onChange={e => handleInputChange("work", e.target.value)}
                        disabled={readOnly}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Occasion</label>
                    <input 
                        className="form-input" 
                        value={formData.occasion || ""} 
                        onChange={e => handleInputChange("occasion", e.target.value)}
                        disabled={readOnly}
                    />
                  </div>
                </div>
              </div>
            </AdminCard>
          )}

          {/* TAGS */}
          {activeTab === "tags" && (
            <AdminCard title="Tags">
              <div className="form-group">
                <label className="form-label mb-2">Product Tags</label>
                <TagInput 
                  value={formData.tags} 
                  onChange={tags => handleInputChange("tags", tags)} 
                  disabled={readOnly}
                />
                <p className="text-xs text-silver-dark mt-2">Press Enter to add tags.</p>
              </div>
            </AdminCard>
          )}

          {/* VARIANTS */}
          {activeTab === "variants" && (
            <AdminCard title="Product Variants">
              <VariantTable 
                variants={formData.variants} 
                onGenerate={handleGenerateVariants}
                isGenerating={isSaving}
                readOnly={readOnly}
              />
            </AdminCard>
          )}

          {/* IMAGES */}
          {activeTab === "images" && (
            <AdminCard title="Image Gallery">
              <div className="space-y-6">
                {!readOnly && (
                    <div 
                        className={cn("image-upload-zone", isUploading && "active opacity-50")}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload}
                            disabled={isUploading}
                        />
                        <UploadCloud className="w-8 h-8 text-silver-dark mb-2" />
                        <p className="text-sm font-medium text-night">Click to upload images</p>
                        <p className="text-xs text-silver-dark">Drag & drop supported</p>
                    </div>
                )}
                
                <ProductImageGrid 
                    images={formData.images} 
                    onDelete={handleDeleteImage} 
                    readOnly={readOnly}
                />
              </div>
            </AdminCard>
          )}

          {/* STATUS */}
          {activeTab === "status" && (
            <AdminCard title="Status & Visibility">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-silver-light rounded-lg bg-white">
                    <div>
                        <label className="font-medium text-night text-sm block">Active Status</label>
                        <p className="text-xs text-silver-dark">Product is visible on the storefront</p>
                    </div>
                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            checked={formData.active} 
                            onChange={e => handleInputChange("active", e.target.checked)}
                            disabled={readOnly}
                            className="h-5 w-5 text-gold focus:ring-gold border-gray-300 rounded"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-silver-light rounded-lg bg-white">
                    <div>
                        <label className="font-medium text-night text-sm block">Featured Product</label>
                        <p className="text-xs text-silver-dark">Show in featured sections</p>
                    </div>
                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            checked={formData.featured} 
                            onChange={e => handleInputChange("featured", e.target.checked)}
                            disabled={readOnly}
                            className="h-5 w-5 text-gold focus:ring-gold border-gray-300 rounded"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-silver-light rounded-lg bg-white">
                    <div>
                        <label className="font-medium text-night text-sm block">Best Seller</label>
                        <p className="text-xs text-silver-dark">Mark as best selling item</p>
                    </div>
                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            checked={formData.best_selling} 
                            onChange={e => handleInputChange("best_selling", e.target.checked)}
                            disabled={readOnly}
                            className="h-5 w-5 text-gold focus:ring-gold border-gray-300 rounded"
                        />
                    </div>
                </div>
              </div>
            </AdminCard>
          )}

        </div>

        {/* Sidebar / Quick Info */}
        <div className="space-y-6">
            <AdminCard>
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-night uppercase tracking-wide">Summary</h3>
                    <div className="flex justify-between text-sm">
                        <span className="text-silver-dark">UID</span>
                        <span className="font-mono text-xs text-night">{formData.uid.slice(0,8)}...</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-silver-dark">Status</span>
                        <Badge variant={formData.active ? "success" : "secondary"}>
                            {formData.active ? "Active" : "Draft"}
                        </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-silver-dark">Variants</span>
                        <span className="font-medium text-night">{formData.variants.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-silver-dark">Images</span>
                        <span className="font-medium text-night">{formData.images.length}</span>
                    </div>
                </div>
            </AdminCard>
        </div>
      </div>
    </div>
  );
}


