"use client";

import React, { useState, useEffect } from "react";
import { HomepageHero } from "@/lib/homepage/types";
import { createHeroSlide, deleteHeroSlide, updateHeroSlide, reorderHeroSlides, getHeroSlides } from "./actions";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "@/components/admin/DragHandle";
import { Upload, Trash2, Eye, EyeOff, Loader2, Monitor, Smartphone } from "lucide-react";
import { getPublicUrl } from "@/lib/utils/images";

const isVideoAsset = (path?: string | null) =>
  !!path && /\.(mp4|webm)$/i.test(path);

// --- Sortable Item Component ---
function SortableHeroItem({ 
  slide, 
  onDelete, 
  onUpdate 
}: { 
  slide: HomepageHero; 
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<HomepageHero>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slide.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const desktopImageUrl = slide.desktop_image ? getPublicUrl("banners", slide.desktop_image) : null;
  const desktopVideoUrl = slide.desktop_video ? getPublicUrl("banners", slide.desktop_video) : null;
  const mobileImageUrl = slide.mobile_image ? getPublicUrl("banners", slide.mobile_image) : null;
  const mobileVideoUrl = slide.mobile_video ? getPublicUrl("banners", slide.mobile_video) : null;

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>, variant: 'desktop' | 'mobile', type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("section", "hero");
    formData.append("variant", variant);

    try {
      const res = await fetch("/api/homepage/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      const { path } = await res.json();
      
      const updateData: Partial<HomepageHero> = {};
      if (type === 'image') {
        updateData[`${variant}_image` as keyof HomepageHero] = path as any;
      } else {
        updateData[`${variant}_video` as keyof HomepageHero] = path as any;
      }
      
      onUpdate(slide.id, updateData);
    } catch (error) {
      alert(`Error uploading ${variant} ${type}`);
      console.error(error);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="bg-white border border-silver rounded-lg p-4 mb-4 flex flex-col gap-4 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="mt-2">
          <DragHandle id={slide.id} />
        </div>

        {/* Desktop Preview & Upload */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-silver-dark mb-2">
            Desktop Hero (21:9) <span className="text-xs text-silver">Recommended: 2100×900px</span>
          </label>
          <div className="flex gap-2">
            <div className="flex-shrink-0 w-32 h-18 bg-offwhite relative rounded overflow-hidden border border-silver-light aspect-video">
              {desktopVideoUrl ? (
                <video
                  src={desktopVideoUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : desktopImageUrl ? (
                <img src={desktopImageUrl} alt="Desktop" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-silver text-xs">No asset</div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAssetUpload(e, 'desktop', 'image')}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-offwhite hover:bg-silver-light rounded border border-silver">
                  <Upload size={12} /> Image
                </span>
              </label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={(e) => handleAssetUpload(e, 'desktop', 'video')}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-offwhite hover:bg-silver-light rounded border border-silver">
                  <Upload size={12} /> Video
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Mobile Preview & Upload */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-silver-dark mb-2">
            Mobile Hero (4:5) <span className="text-xs text-silver">Recommended: 1080×1350px</span>
          </label>
          <div className="flex gap-2">
            <div className="flex-shrink-0 w-16 h-20 bg-offwhite relative rounded overflow-hidden border border-silver-light" style={{ aspectRatio: '4/5' }}>
              {mobileVideoUrl ? (
                <video
                  src={mobileVideoUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : mobileImageUrl ? (
                <img src={mobileImageUrl} alt="Mobile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-silver text-xs text-center">No asset</div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAssetUpload(e, 'mobile', 'image')}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-offwhite hover:bg-silver-light rounded border border-silver">
                  <Upload size={12} /> Image
                </span>
              </label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={(e) => handleAssetUpload(e, 'mobile', 'video')}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-offwhite hover:bg-silver-light rounded border border-silver">
                  <Upload size={12} /> Video
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 items-center">
          <button
            onClick={() => onUpdate(slide.id, { visible: !slide.visible })}
            className={`p-2 rounded hover:bg-offwhite ${slide.visible ? "text-emerald-600" : "text-silver-dark"}`}
            title={slide.visible ? "Visible" : "Hidden"}
          >
            {slide.visible ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          <button
            onClick={() => onDelete(slide.id)}
            className="p-2 rounded hover:bg-red-50 text-red-500"
            title="Delete Slide"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* CTA URL Input */}
      <div className="flex gap-2 items-center">
        <label className="text-xs font-medium text-silver-dark w-20">CTA URL:</label>
        <input
          type="text"
          placeholder="/collections/all"
          value={slide.cta_url || ""}
          onChange={(e) => onUpdate(slide.id, { cta_url: e.target.value })}
          className="flex-1 border border-silver rounded px-3 py-2 text-sm focus:ring-gold focus:border-gold"
        />
      </div>
    </div>
  );
}

// --- Main Client Component ---
export default function HeroManagerClient() {
  const [slides, setSlides] = useState<HomepageHero[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);

  // Sensors for DND
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadSlides();
  }, []);

  async function loadSlides() {
    try {
      const data = await getHeroSlides();
      setSlides(data);
    } catch (error) {
      console.error("Failed to load slides", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSlides((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Trigger server reorder
        const reorderPayload = newItems.map((item, index) => ({
          id: item.id,
          order_index: index
        }));
        reorderHeroSlides(reorderPayload).catch(console.error);
        
        return newItems;
      });
    }
  };

  const handleNewSlide = async (variant: 'desktop' | 'mobile', type: 'image' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/mp4,video/webm';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (variant === 'desktop') setUploadingDesktop(true);
      else setUploadingMobile(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("section", "hero");
      formData.append("variant", variant);

      try {
        const res = await fetch("/api/homepage/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) throw new Error("Upload failed");
        
        const { path } = await res.json();
        
        const slideData: Partial<HomepageHero> = {
          title: "New Slide",
        };
        
        if (type === 'image') {
          slideData[`${variant}_image` as keyof HomepageHero] = path as any;
        } else {
          slideData[`${variant}_video` as keyof HomepageHero] = path as any;
        }
        
        await createHeroSlide(slideData as any);
        await loadSlides();
      } catch (error) {
        alert(`Error uploading ${variant} ${type}`);
        console.error(error);
      } finally {
        if (variant === 'desktop') setUploadingDesktop(false);
        else setUploadingMobile(false);
      }
    };
    
    input.click();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    setSlides(prev => prev.filter(s => s.id !== id));
    try {
      await deleteHeroSlide(id);
    } catch (err) {
      console.error(err);
      loadSlides();
    }
  };

  const handleUpdate = async (id: string, data: Partial<HomepageHero>) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    try {
      await updateHeroSlide(id, data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-serif text-night">Hero Slides ({slides.length})</h2>
          <p className="text-xs text-silver-dark">Upload separate desktop (21:9) and mobile (4:5) assets. Images or videos supported for each variant.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleNewSlide('desktop', 'image')}
            disabled={uploadingDesktop}
            className="flex items-center gap-2 px-4 py-2 bg-night text-white rounded hover:bg-night/90 disabled:opacity-50"
          >
            {uploadingDesktop ? <Loader2 size={16} className="animate-spin" /> : <Monitor size={16} />}
            <span>Add Desktop</span>
          </button>
          <button
            onClick={() => handleNewSlide('mobile', 'image')}
            disabled={uploadingMobile}
            className="flex items-center gap-2 px-4 py-2 bg-night text-white rounded hover:bg-night/90 disabled:opacity-50"
          >
            {uploadingMobile ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
            <span>Add Mobile</span>
          </button>
        </div>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={slides.map(s => s.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {slides.map((slide) => (
              <SortableHeroItem 
                key={slide.id} 
                slide={slide} 
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
            {slides.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-silver-light rounded-lg text-silver-dark">
                No slides yet. Upload desktop or mobile assets to start.
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
