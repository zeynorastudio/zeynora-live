// FilterSidebar: Desktop-only filter sidebar
// DB Sources:
//   - Price Range: products.price (decimal)
//   - Fabric: products.fabric_type (text)
//   - Work: products.work_type (text)
//   - Color: variants.color (text)
//   - Size: variants.size (text)
//   - Occasion: products.occasion (text)
//   - Season: products.season (text)
//   - Availability: products.in_stock (bool)

import FilterAccordion from "./FilterAccordion";
import "@/styles/product-card.css";

export default function FilterSidebar() {
  return (
    <aside className="hidden lg:block w-[260px] xl:w-[280px] bg-offwhite border-r border-silver h-full">
      <div className="sticky top-0 py-6 px-4">
        <h2 className="serif-display text-lg text-night mb-6">Filters</h2>

        <div className="space-y-6">
          {/* Price Range Filter */}
          <FilterAccordion title="Price Range" defaultOpen={true}>
            <div className="space-y-3">
              {/* DB: products.price - Price range filter */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Price range: Under ₹5,000"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Under ₹5,000
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Price range: ₹5,000 - ₹10,000"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  ₹5,000 - ₹10,000
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Price range: ₹10,000 - ₹20,000"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  ₹10,000 - ₹20,000
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Price range: Over ₹20,000"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Over ₹20,000
                </span>
              </label>
            </div>
          </FilterAccordion>

          {/* Fabric Filter */}
          <FilterAccordion title="Fabric">
            <div className="space-y-3">
              {/* DB: products.fabric_type - Fabric filter */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Fabric: Silk"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Silk
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Fabric: Cotton"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Cotton
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Fabric: Linen"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Linen
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Fabric: Chiffon"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Chiffon
                </span>
              </label>
            </div>
          </FilterAccordion>

          {/* Work Filter */}
          <FilterAccordion title="Work">
            <div className="space-y-3">
              {/* DB: products.work_type - Work filter */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Work: Handwoven"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Handwoven
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Work: Embroidered"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Embroidered
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Work: Printed"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Printed
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Work: Block Print"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Block Print
                </span>
              </label>
            </div>
          </FilterAccordion>

          {/* Color Filter */}
          <FilterAccordion title="Color">
            <div className="space-y-3">
              {/* DB: variants.color - Color filter */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Color: Gold"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Gold
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Color: Bronze"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Bronze
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Color: Vine Red"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Vine Red
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Color: Silver"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Silver
                </span>
              </label>
            </div>
          </FilterAccordion>

          {/* Size Filter */}
          <FilterAccordion title="Size">
            <div className="space-y-3">
              {/* DB: variants.size - Size filter */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Size: XS"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  XS
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Size: S"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  S
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Size: M"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  M
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Size: L"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  L
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Size: XL"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  XL
                </span>
              </label>
            </div>
          </FilterAccordion>

          {/* Occasion Filter */}
          <FilterAccordion title="Occasion">
            <div className="space-y-3">
              {/* DB: products.occasion - Occasion filter */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Occasion: Wedding"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Wedding
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Occasion: Festive"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Festive
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Occasion: Casual"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Casual
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Occasion: Formal"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Formal
                </span>
              </label>
            </div>
          </FilterAccordion>

          {/* Season Filter */}
          <FilterAccordion title="Season">
            <div className="space-y-3">
              {/* DB: products.season - Season filter */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Season: Spring"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Spring
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Season: Summer"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Summer
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Season: Autumn"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Autumn
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Season: Winter"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Winter
                </span>
              </label>
            </div>
          </FilterAccordion>

          {/* Availability Filter */}
          <FilterAccordion title="Availability">
            <div className="space-y-3">
              {/* DB: products.in_stock - Availability filter */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Availability: In Stock"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  In Stock
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                  aria-label="Availability: Pre-order"
                />
                <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                  Pre-order
                </span>
              </label>
            </div>
          </FilterAccordion>
        </div>
      </div>
    </aside>
  );
}

