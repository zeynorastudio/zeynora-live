import React from "react";
import HorizontalProductScroller from "@/components/product/HorizontalProductScroller"; // Assuming this component exists as per search
import { ProductCardData } from "@/lib/data/products";

interface RelatedProductsProps {
  products: ProductCardData[];
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <HorizontalProductScroller 
      title="You May Also Like"
      products={products}
      className="pb-8"
    />
  );
}


