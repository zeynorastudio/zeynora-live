"use client";

import React, { useState, useEffect } from "react";
import { HomepageSection, HomepageSectionProduct } from "@/lib/homepage/types";
import { 
  getHomepageSections, 
  createHomepageSection, 
  updateHomepageSection, 
  deleteHomepageSection, 
  reorderHomepageSections,
  addProductToSection,
  removeProductFromSection,
  searchProducts
} from "./actions";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle } from "@/components/admin/DragHandle";
import { Trash2, Eye, EyeOff, Loader2, Plus, Search, X } from "lucide-react";
import { getPublicUrl } from "@/lib/utils/images";

// --- Manual Product Picker ---
function ProductPicker({ sectionId, onAdd }: { sectionId: string, onAdd: (product: any) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setSearching(true);
        try {
          const data = await searchProducts(query);
          setResults(data);
        } finally {
          setSearching(false);
        }
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (product: any) => {
    try {
      await addProductToSection(sectionId, product.uid);
      onAdd(product); // Refresh parent
      setQuery("");
      setResults([]);
    } catch (err) {
      console.error(err);
      alert("Failed to add product");
    }
  };

  return (
    <div className="relative mt-2">
      <div className="flex items-center border border-silver rounded px-3 py-2 bg-white">
        <Search size={14} className="text-silver-dark mr-2" />
        <input 
          className="flex-grow outline-none text-sm"
          placeholder="Search products to add..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {searching && <Loader2 size={14} className="animate-spin text-silver-dark" />}
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-silver shadow-lg rounded mt-1 max-h-48 overflow-y-auto">
          {results.map(p => (
            <button 
              key={p.uid}
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 hover:bg-offwhite flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-offwhite rounded overflow-hidden">
                 {p.main_image_path && <img src={getPublicUrl("products", p.main_image_path)} className="w-full h-full object-cover" />}
              </div>
              <div className="text-sm truncate">{p.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Section Item ---
function SectionItem({ 
  section, 
  onDelete, 
  onUpdate,
  onRefresh
}: { 
  section: HomepageSection; 
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<HomepageSection>) => void;
  onRefresh: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-silver rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="mt-2"><DragHandle id={section.id} /></div>
        
        <div className="flex-grow space-y-4">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Section Title (e.g. Best Sellers)"
              value={section.title}
              onChange={e => onUpdate(section.id, { title: e.target.value })}
              className="border border-silver rounded px-3 py-2 text-sm font-medium"
            />
             <input
              type="text"
              placeholder="Subtitle (optional)"
              value={section.subtitle || ""}
              onChange={e => onUpdate(section.id, { subtitle: e.target.value })}
              className="border border-silver rounded px-3 py-2 text-sm"
            />
          </div>

          {/* Configuration */}
          <div className="flex flex-wrap gap-4 items-center bg-offwhite p-3 rounded text-sm">
             <div className="flex items-center gap-2">
               <span className="text-silver-dark font-medium">Source:</span>
               <span className={`px-2 py-0.5 rounded text-xs uppercase ${section.source_type === 'automatic' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                 {section.source_type}
               </span>
             </div>

             {section.source_type === 'automatic' && (
                <select
                  value={section.source_meta.automatic_type || 'best_selling'}
                  onChange={e => onUpdate(section.id, { source_meta: { ...section.source_meta, automatic_type: e.target.value as any } })}
                  className="border border-silver rounded px-2 py-1 text-sm"
                >
                  <option value="best_selling">Best Selling</option>
                  <option value="newest">New Arrivals</option>
                  <option value="featured">Featured</option>
                  <option value="on_sale">On Sale</option>
                </select>
             )}

             <div className="flex items-center gap-2">
                <span className="text-silver-dark">Count:</span>
                <input 
                  type="number"
                  min="4" max="24"
                  value={section.product_count}
                  onChange={e => onUpdate(section.id, { product_count: parseInt(e.target.value) })}
                  className="w-16 border border-silver rounded px-2 py-1"
                />
             </div>
          </div>

          {/* Manual Product List */}
          {section.source_type === 'manual' && (
            <div className="mt-2 border-t border-silver-light pt-2">
               <div className="text-xs font-medium text-silver-dark mb-2">Selected Products ({section.products?.length || 0})</div>
               
               <div className="flex flex-wrap gap-2 mb-2">
                  {section.products?.map(sp => (
                    <div key={sp.id} className="flex items-center gap-1 bg-offwhite border border-silver px-2 py-1 rounded text-xs">
                      <span className="truncate max-w-[100px]">{sp.product?.name}</span>
                      <button 
                        onClick={async () => {
                          await removeProductFromSection(sp.id);
                          onRefresh();
                        }}
                        className="text-silver-dark hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
               </div>
               <ProductPicker sectionId={section.id} onAdd={onRefresh} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button onClick={() => onUpdate(section.id, { visible: !section.visible })} className={`p-2 rounded ${section.visible ? "text-emerald-600" : "text-silver-dark"}`}>
             {section.visible ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          <button onClick={() => onDelete(section.id)} className="p-2 rounded hover:bg-red-50 text-red-500">
             <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SectionsManagerClient() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const loadData = async () => {
    try {
      const data = await getHomepageSections();
      setSections(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSections((current) => {
        const oldIndex = current.findIndex((i) => i.id === active.id);
        const newIndex = current.findIndex((i) => i.id === over?.id);
        const newItems = arrayMove(current, oldIndex, newIndex);
        reorderHomepageSections(newItems.map((item, index) => ({ id: item.id, order_index: index }))).catch(console.error);
        return newItems;
      });
    }
  };

  const handleCreate = async (type: 'automatic' | 'manual') => {
    const newSection = await createHomepageSection({
      title: type === 'automatic' ? "New Product List" : "Curated Collection",
      source_type: type,
      source_meta: type === 'automatic' ? { automatic_type: 'best_selling' } : {},
      product_count: 8
    });
    setSections(prev => [...prev, newSection]);
  };

  const handleUpdate = async (id: string, data: Partial<HomepageSection>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    await updateHomepageSection(id, data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete section?")) return;
    setSections(prev => prev.filter(s => s.id !== id));
    await deleteHomepageSection(id);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 justify-end">
        <button onClick={() => handleCreate('automatic')} className="px-4 py-2 bg-white border border-silver rounded text-sm hover:bg-offwhite flex items-center gap-2">
          <Plus size={16} /> Auto Section
        </button>
        <button onClick={() => handleCreate('manual')} className="px-4 py-2 bg-night text-white rounded text-sm hover:bg-night/90 flex items-center gap-2">
          <Plus size={16} /> Manual Section
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {sections.map((section) => (
              <SectionItem 
                key={section.id} 
                section={section} 
                onDelete={handleDelete} 
                onUpdate={handleUpdate}
                onRefresh={loadData}
              />
            ))}
            {sections.length === 0 && <div className="text-center py-8 text-silver-dark">No product sections yet.</div>}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

