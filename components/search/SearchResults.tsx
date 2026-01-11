// SearchResults: Search results display component
// DB Source:
//   - products search results (full-text search on products.name, products.tags)
// Structure-only: No logic, placeholder ProductCard components
// Horizontal and vertical responsive layouts

import ProductCard from "@/components/product/ProductCard";

export default function SearchResults() {
  // Placeholder product results - DB: products search results
  const placeholderProducts = [
    {
      uid: "placeholder-1",
      name: "Product Name",
      slug: "product-slug",
      price: 0,
      mainImagePath: "", // supabase://products/{product_uid}/hero-1.jpg
      isNew: false,
      fabricType: "Silk",
      workType: "Handwoven",
      variantColors: ["#D4AF37"],
    },
    {
      uid: "placeholder-2",
      name: "Product Name",
      slug: "product-slug",
      price: 0,
      mainImagePath: "", // supabase://products/{product_uid}/hero-1.jpg
      isNew: false,
      fabricType: "Silk",
      workType: "Handwoven",
      variantColors: ["#D4AF37"],
    },
    {
      uid: "placeholder-3",
      name: "Product Name",
      slug: "product-slug",
      price: 0,
      mainImagePath: "", // supabase://products/{product_uid}/hero-1.jpg
      isNew: false,
      fabricType: "Silk",
      workType: "Handwoven",
      variantColors: ["#D4AF37"],
    },
    {
      uid: "placeholder-4",
      name: "Product Name",
      slug: "product-slug",
      price: 0,
      mainImagePath: "", // supabase://products/{product_uid}/hero-1.jpg
      isNew: false,
      fabricType: "Silk",
      workType: "Handwoven",
      variantColors: ["#D4AF37"],
    },
    {
      uid: "placeholder-5",
      name: "Product Name",
      slug: "product-slug",
      price: 0,
      mainImagePath: "", // supabase://products/{product_uid}/hero-1.jpg
      isNew: false,
      fabricType: "Silk",
      workType: "Handwoven",
      variantColors: ["#D4AF37"],
    },
    {
      uid: "placeholder-6",
      name: "Product Name",
      slug: "product-slug",
      price: 0,
      mainImagePath: "", // supabase://products/{product_uid}/hero-1.jpg
      isNew: false,
      fabricType: "Silk",
      workType: "Handwoven",
      variantColors: ["#D4AF37"],
    },
  ];

  return (
    <div className="mb-8">
      <h3 className="serif-display display-sm text-night mb-6">
        Top Results
      </h3>
      {/* DB: products search results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {placeholderProducts.map((product) => (
          <ProductCard
            key={product.uid}
            uid={product.uid}
            name={product.name}
            slug={product.slug}
            price={product.price}
            mainImagePath={product.mainImagePath}
            isNew={product.isNew}
            fabricType={product.fabricType}
            workType={product.workType}
            variantColors={product.variantColors}
          />
        ))}
      </div>
    </div>
  );
}




