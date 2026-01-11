"use client";

import React, { useState, useEffect } from "react";
import { HomepageCategory } from "@/lib/homepage/types";
import { 
  getHomepageCategories, 
  getAvailableCategories, 
  createHomepageCategory, 
  updateHomepageCategory, 
  deleteHomepageCategory, 
  reorderHomepageCategories 
} from "./actions";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "@/components/admin/DragHandle";
import { Upload, Trash2, Eye, EyeOff, Loader2, Plus } from "lucide-react";
import { getPublicUrl } from "@/lib/utils/images";

const isVideoAsset = (path?: string | null) =>
  !!path && /\.(mp4|webm)$/i.test(path);

function SortableCategoryItem({ 
  item, 
  onDelete, 
  onUpdate 
}: { 
  item: HomepageCategory; 
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<HomepageCategory>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const mediaUrl = getPublicUrl("banners", item.image);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="bg-white border border-silver rounded-lg p-4 mb-4 flex flex-col md:flex-row gap-4 items-center shadow-sm"
    >
      <DragHandle id={item.id} />

      <div className="flex-shrink-0 w-28 h-20 bg-offwhite relative rounded overflow-hidden border border-silver-light">
        {isVideoAsset(item.image) ? (
          <video
            src={mediaUrl}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img src={mediaUrl} alt="Tile" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div>
           <p className="text-xs text-silver-dark mb-1">Linked Category</p>
           <div className="font-medium text-night">{item.category?.name || "Unknown Category"}</div>
        </div>
        
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Title Override (optional)"
            value={item.title_override || ""}
            onChange={(e) => onUpdate(item.id, { title_override: e.target.value })}
            className="w-full border border-silver rounded px-3 py-1 text-sm"
          />
          <div className="text-xs text-silver-dark">
            Links automatically to /collections/{item.category?.slug || "slug"}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onUpdate(item.id, { visible: !item.visible })}
          className={`p-2 rounded hover:bg-offwhite ${item.visible ? "text-emerald-600" : "text-silver-dark"}`}
        >
          {item.visible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 rounded hover:bg-red-50 text-red-500"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

export default function CategoriesManagerClient() {
  const [items, setItems] = useState<HomepageCategory[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  
  // New item state
  const [selectedCatId, setSelectedCatId] = useState("");
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    Promise.all([getHomepageCategories(), getAvailableCategories()])
      .then(([homepageCats, allCats]) => {
        setItems(homepageCats);
        setCategories(allCats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setItems((current) => {
        const oldIndex = current.findIndex((i) => i.id === active.id);
        const newIndex = current.findIndex((i) => i.id === over?.id);
        const newItems = arrayMove(current, oldIndex, newIndex);
        
        const reorderPayload = newItems.map((item, index) => ({
          id: item.id,
          order_index: index
        }));
        reorderHomepageCategories(reorderPayload).catch(console.error);
        
        return newItems;
      });
    }
  };

  const handleAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCatId) {
      alert("Please select a category first");
      e.target.value = "";
      return;
    }
    if (!e.target.files?.[0]) return;
    
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("section", "categories"); // separate folder in banners bucket

    try {
      const res = await fetch("/api/homepage/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { path } = await res.json();

      const newItem = await createHomepageCategory({
        category_id: selectedCatId,
        image: path,
      });

      const typedNewItem = newItem as Record<string, any>;
      const foundCategory = categories.find(c => c.id === selectedCatId);
      setItems(prev => [...prev, { ...typedNewItem, category: foundCategory } as HomepageCategory]);
      setSelectedCatId(""); // Reset
      setAdding(false);
    } catch (error) {
      console.error(error);
      alert("Failed to create category tile");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this category tile?")) return;
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await deleteHomepageCategory(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id: string, data: Partial<HomepageCategory>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    try {
      await updateHomepageCategory(id, data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      {/* Add New Bar */}
      <div className="bg-offwhite p-4 rounded-lg border border-silver-light flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-grow">
          <label className="block text-xs text-silver-dark mb-1">Select Category to Add</label>
          <select 
            className="w-full border border-silver rounded px-3 py-2 text-sm"
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
          >
            <option value="">-- Choose Category --</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <input
            type="file"
            accept="image/*,video/mp4,video/webm"
            onChange={handleAdd}
            className="hidden"
            id="cat-upload"
            disabled={!selectedCatId || uploading}
          />
          <label
            htmlFor="cat-upload"
            className={`flex items-center gap-2 px-4 py-2 bg-night text-white rounded hover:bg-night/90 cursor-pointer ${(!selectedCatId || uploading) ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span>Upload Visual &amp; Add</span>
          </label>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <SortableCategoryItem 
                key={item.id} 
                item={item} 
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
             {items.length === 0 && (
              <div className="text-center py-8 text-silver-dark">
                No categories featured yet. Select one above to start.
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}


