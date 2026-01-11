"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import CategoryImageSelector from "./CategoryImageSelector";
import { Save, Loader2 } from "lucide-react";

interface CategoryImageEditorProps {
  categoryId: string;
  initialTilePath?: string;
  initialBannerPath?: string;
  readOnly: boolean;
}

export default function CategoryImageEditor({ categoryId, initialTilePath, initialBannerPath, readOnly }: CategoryImageEditorProps) {
  const [tilePath, setTilePath] = useState(initialTilePath);
  const [bannerPath, setBannerPath] = useState(initialBannerPath);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToastWithCompat();

  const handleSave = async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/images/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tile_image_path: tilePath,
          banner_image_path: bannerPath
        })
      });
      
      if (!res.ok) throw new Error("Save failed");
      addToast("Category images updated", "success");
    } catch (e) {
      addToast("Error saving changes", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryImageSelector 
          categoryId={categoryId} 
          type="tile" 
          currentPath={tilePath} 
          readOnly={readOnly} 
          onUpdate={setTilePath}
        />
        <CategoryImageSelector 
          categoryId={categoryId} 
          type="banner" 
          currentPath={bannerPath} 
          readOnly={readOnly} 
          onUpdate={setBannerPath}
        />
      </div>

      {!readOnly && (
        <div className="flex justify-end border-t border-silver-light pt-4">
          <AdminButton onClick={handleSave} disabled={saving} icon={saving ? Loader2 : Save}>
            {saving ? "Saving..." : "Save Changes"}
          </AdminButton>
        </div>
      )}
    </div>
  );
}

