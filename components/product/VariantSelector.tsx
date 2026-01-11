// VariantSelector: Product variant selection component
// DB Sources:
//   - product_variants.color (text) - Color name
//   - product_variants.hex_color (text) - Hex color code
//   - product_variants.size (text) - Size value
//   - product_variants.in_stock (bool) - Availability
// Structure-only: No logic for selections

// Accessibility:
// - Color swatches: aria-label with color name
// - Size buttons: aria-label with size and availability
// - Out of stock: aria-disabled="true"

export default function VariantSelector() {
  // Placeholder variants - DB: product_variants table
  const placeholderColors = [
    { name: "Gold", hex: "#D4AF37" }, // DB: product_variants.color, hex_color
    { name: "Bronze", hex: "#CD7F32" },
    { name: "Vine Red", hex: "#8B2635" },
    { name: "Silver", hex: "#C0C0C0" },
  ];

  const placeholderSizes = ["XS", "S", "M", "L", "XL"]; // DB: product_variants.size

  return (
    <div className="w-full space-y-6 pt-6 border-t border-silver/30">
      {/* Color Selection */}
      <div>
        <label className="sans-base text-sm font-medium text-night mb-3 block">
          Color
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          {/* DB: product_variants.color, hex_color */}
          {placeholderColors.map((color, index) => (
            <button
              key={index}
              type="button"
              className="w-7 h-7 rounded-full border-2 border-silver hover:border-gold transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
              style={{ backgroundColor: color.hex }}
              aria-label={`Select color: ${color.name}`}
            >
              <span className="sr-only">{color.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Size Selection */}
      <div>
        <label className="sans-base text-sm font-medium text-night mb-3 block">
          Size
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {/* DB: product_variants.size, in_stock */}
          {placeholderSizes.map((size, index) => {
            const isOutOfStock = index === 4; // Placeholder: DB: product_variants.in_stock
            const isSelected = index === 1; // Placeholder: No logic yet

            return (
              <button
                key={index}
                type="button"
                disabled={isOutOfStock}
                className={`px-4 py-2 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 ${
                  isSelected
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-silver text-night hover:border-gold"
                } ${
                  isOutOfStock
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                aria-label={`Select size: ${size}${isOutOfStock ? " (Out of stock)" : ""}`}
                aria-disabled={isOutOfStock}
              >
                {size}
              </button>
            );
          })}
        </div>
        {/* Out of Stock Indicator */}
        <p className="sans-base text-xs text-silver-dark mt-2">
          {/* DB: product_variants.in_stock - Show availability message */}
          Some sizes may be out of stock
        </p>
      </div>
    </div>
  );
}
