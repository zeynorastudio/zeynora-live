"use client";

import React, { useState, useEffect } from "react";
import { HomepageBanner } from "@/lib/homepage/types";
import { getHomepageBanners, createHomepageBanner, updateHomepageBanner, deleteHomepageBanner, reorderHomepageBanners } from "./actions";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "@/components/admin/DragHandle";
import { Upload, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { getPublicUrl } from "@/lib/utils/images";

function SortableBannerItem({ item, onDelete, onUpdate }: { item: HomepageBanner; onDelete: (id: string) => void; onUpdate: (id: string, data: Partial<HomepageBanner>) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const desktopUrl = getPublicUrl("banners", item.desktop_image);
  const mobileUrl = item.mobile_image ? getPublicUrl("banners", item.mobile_image) : null;

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-silver rounded-lg p-4 mb-4 flex flex-col md:flex-row gap-4 items-start shadow-sm">
      <div className="mt-2"><DragHandle id={item.id} /></div>
      
      <div className="space-y-2">
         <div className="w-48 h-24 bg-offwhite relative rounded overflow-hidden border border-silver-light">
            <img src={desktopUrl} alt="Desktop" className="w-full h-full object-cover" />
            <span className="absolute bottom-0 left-0 bg-black/50 text-white text-[10px] px-1">Desktop</span>
         </div>
         {mobileUrl && (
           <div className="w-24 h-24 bg-offwhite relative rounded overflow-hidden border border-silver-light hidden sm:block">
             <img src={mobileUrl} alt="Mobile" className="w-full h-full object-cover" />
             <span className="absolute bottom-0 left-0 bg-black/50 text-white text-[10px] px-1">Mobile</span>
           </div>
         )}
      </div>

      <div className="flex-grow space-y-3 w-full">
        <input
          type="text"
          placeholder="Banner Title (Internal or Display)"
          value={item.title || ""}
          onChange={(e) => onUpdate(item.id, { title: e.target.value })}
          className="w-full border border-silver rounded px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Link URL (e.g. /collections/festive)"
          value={item.link || ""}
          onChange={(e) => onUpdate(item.id, { link: e.target.value })}
          className="w-full border border-silver rounded px-3 py-2 text-sm font-mono text-silver-dark"
        />
      </div>

      <div className="flex flex-col gap-2">
        <button onClick={() => onUpdate(item.id, { visible: !item.visible })} className={`p-2 rounded ${item.visible ? "text-emerald-600" : "text-silver-dark"}`}>
          {item.visible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <button onClick={() => onDelete(item.id)} className="p-2 rounded hover:bg-red-50 text-red-500">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

export default function BannersManagerClient() {
  const [items, setItems] = useState<HomepageBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    getHomepageBanners().then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setItems((current) => {
        const oldIndex = current.findIndex((i) => i.id === active.id);
        const newIndex = current.findIndex((i) => i.id === over?.id);
        const newItems = arrayMove(current, oldIndex, newIndex);
        reorderHomepageBanners(newItems.map((item, index) => ({ id: item.id, order_index: index }))).catch(console.error);
        return newItems;
      });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    formData.append("section", "banners");

    try {
      const res = await fetch("/api/homepage/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { path } = await res.json();
      const newItem = await createHomepageBanner({ desktop_image: path, title: "New Banner" });
      setItems(prev => [...prev, newItem]);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUpdate = async (id: string, data: Partial<HomepageBanner>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    try {
      await updateHomepageBanner(id, data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete banner?")) return;
    setItems(prev => prev.filter(i => i.id !== id));
    await deleteHomepageBanner(id);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="relative">
           <input type="file" accept="image/*" onChange={handleUpload} className="hidden" id="banner-upload" disabled={uploading} />
           <label htmlFor="banner-upload" className={`flex items-center gap-2 px-4 py-2 bg-night text-white rounded hover:bg-night/90 cursor-pointer ${uploading ? "opacity-50" : ""}`}>
             {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
             <span>Add Banner</span>
           </label>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map(item => (
              <SortableBannerItem key={item.id} item={item} onDelete={handleDelete} onUpdate={handleUpdate} />
            ))}
            {items.length === 0 && <div className="text-center py-8 text-silver-dark">No banners yet.</div>}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}


