"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import "@/styles/super-product-editor.css";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({ value = [], onChange, placeholder = "Add a tag...", disabled = false }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (disabled) return;
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={`flex flex-wrap items-center p-2 bg-white border border-silver-light rounded-lg ${disabled ? "bg-offwhite opacity-70" : "focus-within:ring-1 focus-within:ring-gold/50 focus-within:border-gold"}`}>
      {value.map((tag) => (
        <span key={tag} className="tag-chip">
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="tag-chip-remove"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 min-w-[120px] outline-none bg-transparent text-sm py-1 px-1"
        placeholder={value.length === 0 ? placeholder : ""}
        disabled={disabled}
      />
    </div>
  );
}


