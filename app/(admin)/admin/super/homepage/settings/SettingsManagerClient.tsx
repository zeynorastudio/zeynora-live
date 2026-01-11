"use client";

import React, { useState, useEffect } from "react";
import { HomepageSettings } from "@/lib/homepage/types";
import { getHomepageSettings, updateHomepageSettings } from "./actions";
import { Loader2, Save } from "lucide-react";

export default function SettingsManagerClient() {
  const [settings, setSettings] = useState<Partial<HomepageSettings>>({
    hero_max_height_desktop: 800,
    hero_max_height_mobile: 600,
    page_padding: 24,
    bg_color: "white",
    lazy_load_enabled: true,
    section_dividers_enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHomepageSettings().then(data => {
      if (data) setSettings(data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateHomepageSettings(settings);
      alert("Settings saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hero Settings */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg text-night">Hero Section Dimensions</h3>
          <div>
            <label className="block text-xs text-silver-dark mb-1">Max Height (Desktop) - px</label>
            <input 
              type="number" 
              value={settings.hero_max_height_desktop}
              onChange={e => setSettings(s => ({ ...s, hero_max_height_desktop: parseInt(e.target.value) }))}
              className="w-full border border-silver rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-silver-dark mb-1">Max Height (Mobile) - px</label>
            <input 
              type="number" 
              value={settings.hero_max_height_mobile}
              onChange={e => setSettings(s => ({ ...s, hero_max_height_mobile: parseInt(e.target.value) }))}
              className="w-full border border-silver rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Global Layout */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg text-night">Layout & Performance</h3>
          <div>
            <label className="block text-xs text-silver-dark mb-1">Page Padding (Horizontal) - px</label>
            <input 
              type="number" 
              value={settings.page_padding}
              onChange={e => setSettings(s => ({ ...s, page_padding: parseInt(e.target.value) }))}
              className="w-full border border-silver rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-silver-dark mb-1">Background Color</label>
            <select 
              value={settings.bg_color}
              onChange={e => setSettings(s => ({ ...s, bg_color: e.target.value }))}
              className="w-full border border-silver rounded px-3 py-2"
            >
              <option value="white">White</option>
              <option value="#F9F8F6">Off-white (Cream)</option>
              <option value="#F2F2F2">Light Grey</option>
            </select>
          </div>
          
          <div className="pt-4 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.lazy_load_enabled}
                onChange={e => setSettings(s => ({ ...s, lazy_load_enabled: e.target.checked }))}
                className="rounded border-silver text-gold focus:ring-gold"
              />
              <span className="text-sm text-night">Enable Lazy Loading</span>
            </label>
             <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.section_dividers_enabled}
                onChange={e => setSettings(s => ({ ...s, section_dividers_enabled: e.target.checked }))}
                className="rounded border-silver text-gold focus:ring-gold"
              />
              <span className="text-sm text-night">Show Section Dividers</span>
            </label>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-silver-light flex justify-end">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-night text-white rounded hover:bg-night/90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Settings
        </button>
      </div>
    </div>
  );
}




















