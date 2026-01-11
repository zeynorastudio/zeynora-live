import Link from "next/link";
import { CategoryNode } from "@/lib/data/categories";
import { getPublicUrl } from "@/lib/utils/images";

interface CategoryBannersProps {
  categories: CategoryNode[];
}

export default function CategoryBanners({ categories }: CategoryBannersProps) {
  // Limit to first 4 categories for banners if too many
  const displayCategories = categories.filter(c => c.is_featured).slice(0, 4);

  if (displayCategories.length === 0) return null;

  return (
    <section className="w-full bg-offwhite section-gap-md slide-up">
      <div className="container mx-auto px-4">
        {displayCategories.map((cat, index) => (
          <div key={cat.id} className="my-10 md:my-16">
            {/* Image Block */}
            <div 
              className="w-full aspect-[16/9] md:aspect-[5/4] rounded-xl warm-shadow-sm border border-silver bg-silver/20 mb-6 overflow-hidden relative"
            >
               {/* Updated to use tile_image_path if available, else fallback logic */}
               {cat.tile_image_path ? (
                 <img 
                   src={getPublicUrl("categories", cat.tile_image_path)} 
                   alt={`${cat.name} banner`} 
                   className="object-cover w-full h-full"
                   loading="lazy"
                 />
               ) : (
                 // Fallback if no image set - Simple Placeholder or old logic
                 <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                    <span className="uppercase tracking-widest font-bold">No Image</span>
                 </div>
               )}
            </div>

            {/* Content Block */}
            <div className="text-center">
              <h2 className={`serif-display display-lg mb-4 gold-reveal ${index % 2 === 1 ? 'text-vine' : 'text-night'}`}>
                {cat.name}
              </h2>
              
              {cat.description && (
                <p className="sans-base body-lg text-night/70 mb-6 max-w-2xl mx-auto">
                  {cat.description}
                </p>
              )}

              <Link
                href={`/collections/${cat.slug}`}
                className="inline-flex items-center justify-center border-2 border-gold bg-transparent text-gold px-8 py-3 rounded-md font-medium hover:bg-gold/10 transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
                aria-label={`Shop ${cat.name} collection`}
              >
                Shop Now
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
