"use client";

import React, { useState, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { GripVertical, Save, Loader2 } from "lucide-react";
import { getPublicUrl } from "@/lib/utils/images";

interface Product {
  uid: string;
  name: string;
  main_image_path: string;
  sort_order: number;
}

// Sortable Item Component
function SortableItem({ id, product }: { id: string; product: Product }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center bg-white p-3 mb-2 border border-silver-light rounded-lg shadow-sm hover:shadow-md transition-shadow group">
      <div {...attributes} {...listeners} className="cursor-grab p-2 mr-3 text-silver-dark hover:text-gold">
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="w-12 h-12 bg-offwhite rounded border border-silver-light overflow-hidden flex-shrink-0 mr-4">
        {product.main_image_path ? (
          <img src={getPublicUrl("products", product.main_image_path)} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-silver-dark">IMG</div>
        )}
      </div>

      <div className="flex-1">
        <p className="font-medium text-night">{product.name}</p>
        <p className="text-xs text-silver-dark font-mono">{product.uid}</p>
      </div>

      <div className="px-4 font-mono text-sm text-silver-dark">
        #{product.sort_order}
      </div>
    </div>
  );
}

// Main List Component
export function ProductReorderList({ initialProducts }: { initialProducts: Product[] }) {
  const [items, setItems] = useState(initialProducts);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToastWithCompat();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.uid === active.id);
        const newIndex = items.findIndex((i) => i.uid === over?.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Update sort_order locally to reflect visual order
        return newOrder.map((item, index) => ({ ...item, sort_order: index + 1 }));
      });
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = items.map((p, index) => ({
        product_uid: p.uid,
        sort_order: index + 1
      }));

      const res = await fetch("/api/admin/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");
      
      addToast("Order saved successfully", "success");
      setHasChanges(false);
    } catch (e) {
      addToast("Failed to save order", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6 sticky top-4 z-10 bg-offwhite/90 p-4 rounded-lg border border-silver-light backdrop-blur">
        <div>
          <h3 className="font-bold text-night">Product Order</h3>
          <p className="text-xs text-silver-dark">Drag to reorder. Top appears first on storefront.</p>
        </div>
        <AdminButton onClick={handleSave} disabled={!hasChanges || saving} icon={saving ? Loader2 : Save}>
          {saving ? "Saving..." : "Save Order"}
        </AdminButton>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.uid)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItem key={item.uid} id={item.uid} product={item} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
