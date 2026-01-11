// Breadcrumbs: Breadcrumb navigation component
// DB Sources:
//   - collections.name (text) - Collection name
//   - categories.name (text) - Category name
//   - products.name (text) - Product name
// Structure-only: Placeholder breadcrumbs

// Accessibility:
// - nav element with aria-label
// - Current page: aria-current="page"

export default function Breadcrumbs() {
  // Placeholder breadcrumbs - DB: collections.name, categories.name, products.name
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Collections", href: "/collections" }, // DB: collections.name
    { label: "Collection Name", href: "/collections/collection-slug" }, // DB: collections.name
    { label: "Product Name", href: null }, // DB: products.name (current page)
  ];

  return (
    <nav aria-label="Breadcrumb navigation" className="mb-6">
      <ol className="flex items-center gap-2 flex-wrap">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="text-silver-dark mx-2" aria-hidden="true">
                  /
                </span>
              )}
              {isLast ? (
                <span
                  className="sans-base text-sm text-night"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <a
                  href={crumb.href || "#"}
                  className="sans-base text-sm text-silver-dark hover:text-gold transition-colors"
                >
                  {crumb.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}




