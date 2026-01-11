import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import "@/styles/product-card.css";
import { getPublicUrl } from "@/lib/utils/images";
import Link from "next/link";
import WishlistButton from "@/components/wishlist/WishlistButton.client";

export interface ProductCardProps {
  uid?: string;
  name?: string;
  slug?: string;
  price?: number;
  mainImagePath?: string;
  isNew?: boolean;
  fabricType?: string;
  workType?: string;
  variantColors?: string[];
  imageAlt?: string;
}

export default function ProductCard({
  uid = "",
  name = "Product Name",
  slug = "",
  price = 2999,
  mainImagePath = "products/placeholder/hero-1.jpg",
  isNew = false,
  fabricType = "Silk",
  workType = "Handwoven",
  variantColors = ["#D4AF37", "#CD7F32", "#8B2635"],
  imageAlt = "Product image",
}: ProductCardProps) {
  // Resolving image URL properly
  const imageUrl = getPublicUrl("products", mainImagePath);

  return (
    <Card 
      className="overflow-hidden product-card-transition bg-cream/30 warm-shadow-sm luxury-hover border border-silver p-4 md:p-6 relative"
      shadowVariant="warm-sm"
    >
      {/* Image container - 4:5 aspect ratio */}
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-t-xl bg-silver/20 group">
        <Link href={`/product/${slug}`} className="block w-full h-full" aria-label={`View details for ${name}`}>
          <div
            className="w-full h-full hover-zoom bg-silver/30"
            role="img"
            aria-label={imageAlt || `Product image for ${name}`}
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </Link>

        {isNew && (
          <div className="absolute top-3 left-3 z-10">
            <Badge variant="bronze">NEW</Badge>
          </div>
        )}

        {/* Wishlist Button - Absolute positioned on image */}
        <div className="absolute top-3 right-3 z-10">
          <WishlistButton 
            productUid={uid} 
            className="bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white"
          />
        </div>
      </div>

      {/* Product Info Section */}
      <div className="product-card-spacing">
        <h3 className="product-card-title text-night mb-2 line-clamp-2 text-lg">
          <Link href={`/product/${slug}`} className="hover:text-gold transition-colors">
            {name}
          </Link>
        </h3>

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {fabricType && (
            <>
              <span className="sans-base text-xs text-silver-dark">
                {fabricType}
              </span>
              {workType && (
                <span className="text-silver-dark text-xs">•</span>
              )}
            </>
          )}
          {workType && (
            <span className="sans-base text-xs text-silver-dark">
              {workType}
            </span>
          )}
        </div>

        {/* Variant Color Dots - Visual only for card */}
        {variantColors && variantColors.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            {variantColors.map((color, index) => (
              <div
                key={index}
                className="color-dot"
                style={{ backgroundColor: color }}
                aria-label={`Color variant: ${color}`}
              />
            ))}
          </div>
        )}

        <div className="mb-4">
          <span className="product-card-price text-lg">
            ₹{price.toLocaleString("en-IN")}
          </span>
        </div>

        <Button
          href={`/product/${slug}`}
          variant="default"
          className="w-full md:w-auto"
          aria-label={`View ${name}`}
        >
          View Product
        </Button>
      </div>
    </Card>
  );
}
