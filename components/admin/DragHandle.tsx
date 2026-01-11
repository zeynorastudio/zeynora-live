"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface DragHandleProps {
  id: string;
  className?: string;
}

export function DragHandle({ id, className = "" }: DragHandleProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-none cursor-grab active:cursor-grabbing text-silver-dark hover:text-night p-2 rounded-md hover:bg-offwhite ${className}`}
      type="button"
      aria-label="Reorder"
    >
      <GripVertical size={20} />
    </button>
  );
}




















