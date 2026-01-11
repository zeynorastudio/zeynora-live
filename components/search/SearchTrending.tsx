// SearchTrending: Trending searches placeholder
// DB Source:
//   - products.tags (popularity-based in future)
// Structure-only: No logic, static placeholder items

export default function SearchTrending() {
  // Placeholder trending searches - DB: products.tags (popularity-based in future)
  const trendingSearches = [
    "Bridal Lehenga",
    "Designer Sarees",
    "Festive Collection",
    "Handwoven Silk",
  ];

  return (
    <div className="mb-8">
      <h3 className="serif-display display-sm text-night mb-4">
        Trending Searches
      </h3>
      <div className="flex flex-wrap gap-2">
        {trendingSearches.map((term, index) => (
          <button
            key={index}
            type="button"
            className="sans-base body-sm px-4 py-2 bg-cream/50 border border-gold/30 rounded-full text-night hover:border-gold hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
            aria-label={`Search for ${term}`}
            // DB: products.tags (popularity-based in future)
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}




