"use client";

import React, { useState, useEffect, useRef } from "react";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/Drawer";
import { X, Upload, Trash2, GripVertical, Image as ImageIcon, Loader2 } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { getPublicUrl } from "@/lib/utils/images";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { AdminToastProvider } from "@/components/ui/ToastProviderWrapper";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface ProductMedia {
  uid: string;
  name: string;
  main_image_path: string | null;
}

interface GalleryImage {
  id: string;
  image_path: string;
  display_order: number;
}

interface MediaPanelProps {
  productUid: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

// Sortable Gallery Image Item
function SortableGalleryImage({
  image,
  onDelete,
}: {
  image: { id: string; image_path: string; display_order: number };
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const imageUrl = getPublicUrl("products", image.image_path);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group bg-white rounded-lg border border-silver-light overflow-hidden",
        isDragging && "z-50"
      )}
    >
      <div className="aspect-square relative">
        <img src={imageUrl} alt="Gallery" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="p-2 bg-white/20 rounded cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4 text-white" />
          </div>
          <button
            onClick={() => {
              if (confirm("Delete this image?")) onDelete(image.id);
            }}
            className="p-2 bg-red-500/80 hover:bg-red-600 rounded text-white"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function MediaPanel({ productUid, isOpen, onClose, onRefresh }: MediaPanelProps) {
  const [product, setProduct] = useState<ProductMedia | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const { addToast } = useToastWithCompat();
  
  // Refs for file inputs
  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch product media
  useEffect(() => {
    if (isOpen && productUid) {
      fetchProductMedia();
    }
  }, [isOpen, productUid]);

  const [gallery, setGallery] = useState<GalleryImage[]>([]);

  const fetchProductMedia = async () => {
    if (!productUid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media/get?uid=${productUid}`);
      if (!res.ok) throw new Error("Failed to load product");
      const data = await res.json();
      setProduct(data.product);
      setGallery(data.gallery || []);
    } catch (error: any) {
      addToast(error.message || "Failed to load product", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadMain = async (file: File) => {
    if (!productUid) return;
    setUploadingMain(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("product_uid", productUid);

      const res = await fetch("/api/admin/media/upload-main", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      addToast("Main image uploaded successfully", "success");
      await fetchProductMedia();
      onRefresh();
    } catch (error: any) {
      addToast(error.message || "Failed to upload main image", "error");
    } finally {
      setUploadingMain(false);
    }
  };

  const handleUploadGallery = async (files: FileList) => {
    if (!productUid) return;
    setUploadingGallery(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });
      formData.append("product_uid", productUid);

      const res = await fetch("/api/admin/media/upload-gallery", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      addToast(`Uploaded ${files.length} image(s)`, "success");
      await fetchProductMedia();
      onRefresh();
    } catch (error: any) {
      addToast(error.message || "Failed to upload images", "error");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleDeleteGallery = async (imageId: string) => {
    try {
      const res = await fetch("/api/admin/media/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Delete failed");
      }

      addToast("Image deleted successfully", "success");
      await fetchProductMedia(); // This will refresh both product and gallery
      onRefresh();
    } catch (error: any) {
      addToast(error.message || "Failed to delete image", "error");
    }
  };

  const handleReorderGallery = async (imageIds: string[]) => {
    try {
      const res = await fetch("/api/admin/media/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_ids: imageIds }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Reorder failed");
      }

      await fetchProductMedia();
    } catch (error: any) {
      addToast(error.message || "Failed to reorder images", "error");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = gallery.findIndex((img) => img.id === active.id);
    const newIndex = gallery.findIndex((img) => img.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(gallery, oldIndex, newIndex);
    const imageIds = reordered.map((img) => img.id);

    // Update local state immediately
    setGallery(reordered.map((img, idx) => ({ ...img, display_order: idx })));

    // Save to server
    handleReorderGallery(imageIds);
  };

  if (!isOpen || !productUid) return null;

  return (
    <AdminToastProvider>
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
        <DrawerContent className="h-full w-full sm:max-w-2xl ml-auto rounded-none border-l border-silver-light bg-white overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-silver-light px-6 py-4 flex items-center justify-between shadow-sm">
            <div>
              <h2 className="serif-display text-lg text-night">
                {loading ? "Loading..." : product?.name || "Product Media"}
              </h2>
              {product && (
                <p className="text-xs text-silver-dark font-mono mt-1">{product.uid}</p>
              )}
            </div>
            <DrawerClose asChild>
              <button className="p-2 hover:bg-offwhite rounded-full transition-colors">
                <X className="w-5 h-5 text-silver-darker" />
              </button>
            </DrawerClose>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-silver-dark" />
            </div>
          ) : product ? (
            <div className="p-6 space-y-8">
              {/* Product Metadata (Read-only) */}
              <div className="grid grid-cols-2 gap-4 text-sm border-b border-silver-light pb-6">
                <div>
                  <span className="block text-xs font-bold text-silver-dark uppercase mb-1">
                    Product UID
                  </span>
                  <p className="font-mono text-night">{product.uid}</p>
                </div>
                <div>
                  <span className="block text-xs font-bold text-silver-dark uppercase mb-1">
                    Product Name
                  </span>
                  <p className="text-night">{product.name}</p>
                </div>
                <div>
                  <span className="block text-xs font-bold text-silver-dark uppercase mb-1">
                    Gallery Images
                  </span>
                  <p className="text-night">{gallery.length}</p>
                </div>
              </div>

              {/* Main Image Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-night">Main Image</h3>
                  {product.main_image_path && (
                    <Badge variant="secondary" className="text-xs">
                      Set
                    </Badge>
                  )}
                </div>

                <div className="bg-offwhite rounded-lg border border-silver-light p-4 min-h-[300px] flex items-center justify-center">
                  {product.main_image_path ? (
                    <img
                      src={getPublicUrl("products", product.main_image_path)}
                      alt="Main"
                      className="max-h-[400px] w-auto object-contain rounded shadow-sm"
                    />
                  ) : (
                    <div className="text-center text-silver-dark">
                      <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="font-medium mb-2">Missing Main Image</p>
                      <p className="text-sm">Upload a main image for this product</p>
                    </div>
                  )}
                </div>

                <div className="block">
                  <input
                    ref={mainInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadMain(file);
                        // Reset input so same file can be selected again
                        e.target.value = "";
                      }
                    }}
                    disabled={uploadingMain}
                  />
                  <AdminButton
                    variant="secondary"
                    icon={uploadingMain ? Loader2 : Upload}
                    disabled={uploadingMain}
                    className="w-full"
                    onClick={() => {
                      mainInputRef.current?.click();
                    }}
                  >
                    {uploadingMain ? "Uploading..." : "Upload Main Image"}
                  </AdminButton>
                </div>
              </div>

              {/* Gallery Images Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-night">Gallery Images</h3>
                  <Badge variant="outline" className="text-xs">
                    {gallery.length} image{gallery.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={gallery.map((img) => img.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                      {gallery.map((image) => (
                        <SortableGalleryImage
                          key={image.id}
                          image={image}
                          onDelete={handleDeleteGallery}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                <div className="block">
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleUploadGallery(files);
                        // Reset input so same files can be selected again
                        e.target.value = "";
                      }
                    }}
                    disabled={uploadingGallery}
                  />
                  <AdminButton
                    variant="outline"
                    icon={uploadingGallery ? Loader2 : Upload}
                    disabled={uploadingGallery}
                    className="w-full"
                    onClick={() => {
                      galleryInputRef.current?.click();
                    }}
                  >
                    {uploadingGallery ? "Uploading..." : "Upload Additional Images"}
                  </AdminButton>
                </div>

                {gallery.length === 0 && (
                  <p className="text-sm text-silver-dark text-center py-8">
                    No gallery images yet. Upload images to get started.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-silver-dark">
              <p>Product not found</p>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </AdminToastProvider>
  );
}










