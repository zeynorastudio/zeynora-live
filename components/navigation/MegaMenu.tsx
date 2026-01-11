// MegaMenu: Desktop-only mega menu panel
// Fetches categories from database
// Full-width panel with columns and category image

import { getCategoryTree, CategoryNode } from "@/lib/data/categories";
import { getPublicUrl } from "@/lib/utils/images";

export interface MegaMenuProps {
  categorySlug?: string;
}

export default async function MegaMenu({ categorySlug = "lehengas" }: MegaMenuProps) {
  // Fetch categories from database
  let categories: CategoryNode[] = [];
  try {
    categories = await getCategoryTree();
  } catch (error) {
    console.error("[MegaMenu] Failed to fetch categories:", error);
    // Return empty menu on error - don't crash the page
  }

  // Get root categories (parent_id is null)
  const rootCategories = categories.filter(cat => !cat.parent_id);
  
  // Handle empty state
  if (rootCategories.length === 0) {
    return (
      <div
        role="menu"
        className="absolute left-0 right-0 top-full z-50 bg-offwhite border-t border-silver warm-shadow fade-in"
      >
        <div className="container mx-auto px-8 py-8">
          <p className="text-silver-dark text-center">No categories available</p>
        </div>
      </div>
    );
  }

  // Take up to 3 root categories for columns
  const displayCategories = rootCategories.slice(0, 3);

  // Find the featured image from the current category slug or first category
  const currentCategory = categories.find(cat => cat.slug === categorySlug);
  const featuredImage = currentCategory?.tile_image_path || displayCategories[0]?.tile_image_path;

  return (
    <div
      role="menu"
      className="absolute left-0 right-0 top-full z-50 bg-offwhite border-t border-silver warm-shadow fade-in"
    >
      <div className="container mx-auto px-8 py-8">
        <div className="grid grid-cols-4 gap-8">
          {/* Category columns */}
          {displayCategories.map((category) => (
            <div key={category.id} className="space-y-4">
              {/* Category title */}
              <h3 className="serif-display text-lg text-night mb-4">
                <a 
                  href={`/collections/${category.slug}`}
                  className="hover:text-gold transition-colors"
                >
                  {category.name}
                </a>
              </h3>

              {/* List of subcategories */}
              {category.children.length > 0 ? (
                <ul className="space-y-2">
                  {category.children.map((subcategory) => (
                    <li key={subcategory.id}>
                      <a
                        href={`/collections/${subcategory.slug}`}
                        className="sans-base body-sm text-night hover:text-gold transition-colors focus:outline-none focus:ring-2 focus:ring-gold rounded-sm"
                      >
                        {subcategory.name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-silver-dark text-sm">No subcategories</p>
              )}
            </div>
          ))}

          {/* Right-side slot for category/collection image */}
          <div className="flex items-center justify-center">
            <div className="w-full h-64 rounded-lg overflow-hidden bg-silver/20 border border-silver">
              {featuredImage ? (
                <img
                  src={getPublicUrl("categories", featuredImage)}
                  alt={`${categorySlug} category`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full bg-silver/30 flex items-center justify-center"
                  role="img"
                  aria-label={`${categorySlug} category image`}
                >
                  <span className="text-silver-dark text-sm">No image</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
