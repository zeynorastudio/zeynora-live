// CategoryTiles: Structure-only grid of category tiles
// DB Source: `categories` table
// Fields: name (text), slug (text), image_url (text), description (text)
// Routes: /collections/{category_slug}

// Accessibility: Images must include alt text (categories.image_alt from DB)
// Each tile must be keyboard navigable and have proper ARIA labels

export default function CategoryTiles() {
  return (
    <section className="w-full bg-offwhite py-16">
      <div className="container mx-auto px-4">
        {/* Grid: 4 columns desktop, 2 columns tablet, 1 column mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tile 1: Wedding */}
          <div className="bg-cream rounded-xl border border-silver/30 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-lg transition-shadow">
            {/* category image: categories.{slug}.image_url -> Supabase path. placeholder example: 'supabase://categories/wedding-tile-placeholder.jpg' */}
            <div 
              className="w-full aspect-[4/5] bg-silver/20 border-b border-silver/30"
              role="img"
              aria-label="Wedding category image placeholder - will be replaced with categories.image_url from DB"
            >
              {/* Image placeholder - categories.image_url (text) */}
            </div>
            <div className="p-6">
              {/* from categories.name (text) */}
              <h3 className="serif-display display-md text-night mb-2">
                {/* Placeholder text - replace from DB: categories.name (text) */}
                Wedding
              </h3>
              {/* from categories.description (text) */}
              <p className="sans-base body-sm text-night/70 mb-4">
                {/* Placeholder text - replace from DB: categories.description (text) */}
                Elegant bridal collections
              </p>
              {/* routes to /collections/{category_slug} */}
              <a 
                href="#" 
                className="text-gold hover:text-bronze font-medium inline-flex items-center"
                aria-label="Explore Wedding collection"
              >
                Explore →
              </a>
            </div>
          </div>

          {/* Tile 2: Festive */}
          <div className="bg-cream rounded-xl border border-silver/30 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-lg transition-shadow">
            <div 
              className="w-full aspect-[4/5] bg-silver/20 border-b border-silver/30"
              role="img"
              aria-label="Festive category image placeholder - will be replaced with categories.image_url from DB"
            >
              {/* Image placeholder - categories.image_url (text) */}
            </div>
            <div className="p-6">
              <h3 className="serif-display display-md text-night mb-2">
                {/* Placeholder text - replace from DB: categories.name (text) */}
                Festive
              </h3>
              <p className="sans-base body-sm text-night/70 mb-4">
                {/* Placeholder text - replace from DB: categories.description (text) */}
                Celebration essentials
              </p>
              <a 
                href="#" 
                className="text-gold hover:text-bronze font-medium inline-flex items-center"
                aria-label="Explore Festive collection"
              >
                Explore →
              </a>
            </div>
          </div>

          {/* Tile 3: Luxury */}
          <div className="bg-cream rounded-xl border border-silver/30 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-lg transition-shadow">
            <div 
              className="w-full aspect-[4/5] bg-silver/20 border-b border-silver/30"
              role="img"
              aria-label="Luxury category image placeholder - will be replaced with categories.image_url from DB"
            >
              {/* Image placeholder - categories.image_url (text) */}
            </div>
            <div className="p-6">
              <h3 className="serif-display display-md text-night mb-2">
                {/* Placeholder text - replace from DB: categories.name (text) */}
                Luxury
              </h3>
              <p className="sans-base body-sm text-night/70 mb-4">
                {/* Placeholder text - replace from DB: categories.description (text) */}
                Premium craftsmanship
              </p>
              <a 
                href="#" 
                className="text-gold hover:text-bronze font-medium inline-flex items-center"
                aria-label="Explore Luxury collection"
              >
                Explore →
              </a>
            </div>
          </div>

          {/* Tile 4: Everyday */}
          <div className="bg-cream rounded-xl border border-silver/30 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden hover:shadow-lg transition-shadow">
            <div 
              className="w-full aspect-[4/5] bg-silver/20 border-b border-silver/30"
              role="img"
              aria-label="Everyday category image placeholder - will be replaced with categories.image_url from DB"
            >
              {/* Image placeholder - categories.image_url (text) */}
            </div>
            <div className="p-6">
              <h3 className="serif-display display-md text-night mb-2">
                {/* Placeholder text - replace from DB: categories.name (text) */}
                Everyday
              </h3>
              <p className="sans-base body-sm text-night/70 mb-4">
                {/* Placeholder text - replace from DB: categories.description (text) */}
                Versatile daily wear
              </p>
              <a 
                href="#" 
                className="text-gold hover:text-bronze font-medium inline-flex items-center"
                aria-label="Explore Everyday collection"
              >
                Explore →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

