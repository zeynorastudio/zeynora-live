// RelatedProducts: Related products section for PDP
// DB Source: Related products calculated via:
//   - Shared category (products.category_uid)
//   - Manual curation (product_relations table)
//   - Similar price range
// Structure-only: No logic, placeholder products

// Accessibility:
// - Section title: h2 heading
// - Product cards: Accessible via ProductCard component

import HorizontalProductScroller from "./HorizontalProductScroller";

export default function RelatedProducts() {
  return (
    <section className="w-full bg-offwhite section-gap-md fade-in">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Title */}
        <h2 className="serif-display text-display-lg text-night mb-8">
          You May Also Like
        </h2>

        {/* Related Products Scroller */}
        {/* DB: Related products via shared category or manual curation */}
        <HorizontalProductScroller
          title=""
          // Placeholder products - will be replaced with DB data
          // Related products calculated via:
          //   - products.category_uid (shared category)
          //   - product_relations.related_product_uid (manual curation)
          //   - Similar price range filtering
        />
      </div>
    </section>
  );
}
