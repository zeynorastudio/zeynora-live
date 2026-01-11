// SearchRecent: Recent searches placeholder list
// DB Source:
//   - search_history.user_queries (text array)
// Structure-only: No logic, static placeholder items

export default function SearchRecent() {
  // Placeholder recent searches - DB: search_history.user_queries
  const recentSearches = [
    "Lehenga",
    "Silk Saree",
    "Bridal Collection",
  ];

  return (
    <div className="mb-8">
      <h3 className="serif-display display-sm text-night mb-4">
        Recent Searches
      </h3>
      <div className="flex flex-wrap gap-2">
        {recentSearches.map((query, index) => (
          <button
            key={index}
            type="button"
            className="sans-base body-sm px-4 py-2 bg-cream/50 border border-silver rounded-full text-night hover:border-gold hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
            aria-label={`Search for ${query}`}
            // DB: search_history.user_queries
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}




