// MiniCart: Mini cart preview component
// DB Sources:
//   - cart_items table (product_uid, quantity)
//   - products.name (text)
//   - products.price (decimal)
//   - products.main_image_path (text)
// Structure-only: Placeholder structure, click to open full cart
// Images: supabase://products/{product_uid}/thumbnail.jpg

export interface MiniCartProps {
  onOpen?: () => void;
}

export default function MiniCart({ onOpen }: MiniCartProps) {
  // Placeholder product data - DB: cart_items, products
  const placeholderItem = {
    productUid: "placeholder",
    productName: "Product Name", // DB: products.name
    thumbnail: "", // supabase://products/{product_uid}/thumbnail.jpg
    price: 0, // DB: products.price
    quantity: 1, // DB: cart_items.quantity
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full bg-cream rounded-xl border border-silver shadow-warm-sm p-4 hover:shadow-warm-md transition-shadow focus:outline-none focus:ring-2 focus:ring-gold"
      aria-label="Open cart"
    >
      <div className="flex items-center gap-4">
        {/* Thumbnail - supabase://products/{product_uid}/thumbnail.jpg */}
        <div className="w-16 h-20 rounded-lg overflow-hidden bg-silver/20 border border-silver flex-shrink-0">
          <div
            className="w-full h-full bg-silver/30"
            role="img"
            aria-label={`${placeholderItem.productName} thumbnail`}
          >
            {/* Image will be rendered here from Supabase Storage */}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0 text-left">
          {/* Product Name - DB: products.name */}
          <h3 className="serif-display text-sm text-night mb-1 line-clamp-2">
            {placeholderItem.productName}
          </h3>

          {/* Price - DB: products.price */}
          <p className="sans-base text-sm font-medium text-gold">
            ₹{placeholderItem.price.toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    </button>
  );
}

