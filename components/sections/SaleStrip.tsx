"use client";

import Link from "next/link";
import Image from "next/image";
import { getPublicUrl } from "@/lib/utils/images";

interface SaleProduct {
  uid: string;
  name: string;
  slug: string;
  price: number;
  main_image_path: string | null;
}

interface SaleStripProps {
  text: string;
  href?: string;
  products?: SaleProduct[];
}

export default function SaleStrip({ text, href = "/shop?sale=true", products }: SaleStripProps) {
  if (!text || !text.trim()) return null;

  const repeatedText = Array.from({ length: 6 }, () => text.toUpperCase());
  const hasProducts = products && products.length > 0;

  return (
    <section className="w-full bg-gradient-to-r from-vine via-[#65172F] to-vine text-cream border-b border-gold/30">
      {/* Sale Text Marquee */}
      <Link
        href={href}
        className="block py-3"
        aria-label="View current sale collection"
      >
        <div className="overflow-hidden">
          <div className="sale-marquee-track text-xs sm:text-sm font-semibold tracking-[0.5em] uppercase space-x-12">
            {repeatedText.map((phrase, index) => (
              <span key={`${phrase}-${index}`} className="inline-flex items-center gap-3">
                {phrase}
                <span className="w-2 h-2 rounded-full bg-gold" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </Link>

      {/* Products Carousel */}
      {hasProducts && (
        <div className="bg-vine/20 py-4 border-t border-gold/20">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 px-4 min-w-max">
              {products.map((product) => (
                <Link
                  key={product.uid}
                  href={`/product/${product.slug}`}
                  className="flex-shrink-0 group"
                >
                  <div className="w-24 sm:w-32 bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-square relative bg-offwhite">
                      {product.main_image_path ? (
                        <Image
                          src={getPublicUrl("products", product.main_image_path)}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 96px, 128px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-silver-dark text-xs">
                          No image
                        </div>
                      )}
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        SALE
                      </span>
                    </div>
                    <div className="p-2">
                      <p className="text-night text-xs font-medium truncate">{product.name}</p>
                      <p className="text-vine font-semibold text-sm">₹{product.price.toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
              {/* View All Link */}
              <Link
                href={href}
                className="flex-shrink-0 w-24 sm:w-32 flex items-center justify-center bg-gold/20 rounded-lg hover:bg-gold/30 transition-colors"
              >
                <span className="text-cream font-semibold text-sm">View All →</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

