import { Metadata } from "next";
import { getProductBySlug, getProducts } from "@/lib/data/products";
import { notFound } from "next/navigation";
import { getPublicUrl } from "@/lib/utils/images";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Components
import PDPClient from "@/components/product/pdp/PDPClient";
import FabricWorkSection from "@/components/product/pdp/FabricWorkSection";
import RelatedProducts from "@/components/sections/RelatedProducts";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found | Zeynora" };

  const typedProduct = product as {
    name: string;
    description: string | null;
    main_image_path: string | null;
  };

  const mainImage = typedProduct.main_image_path 
    ? getPublicUrl("products", typedProduct.main_image_path)
    : undefined;

  return {
    title: `${typedProduct.name} | Zeynora`,
    description: typedProduct.description || "Handcrafted luxury.",
    openGraph: mainImage ? { images: [mainImage] } : undefined,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return notFound();
  }

  const typedProduct = product as {
    uid: string;
    name: string;
    description: string | null;
    price: number;
    category: string | null;
    main_image_path: string | null;
    images: Array<{ url: string; alt: string; type?: string }>;
    variants: Array<{ id: string; sku: string; color?: string; size?: string; stock: number; price: number; active: boolean }>;
    tags: string[];
    fabric_care: string | null;
  };

  // Fetch related products based on category
  const relatedProductsResult = typedProduct.category 
    ? await getProducts({ category: typedProduct.category, limit: 4 })
    : { products: [], totalCount: 0 };
  
  // Filter out current product from related
  const filteredRelated = (relatedProductsResult.products || []).filter((p: any) => p.uid !== typedProduct.uid).slice(0, 4);

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-gold hover:text-gold-dark transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shop</span>
          </Link>
        </div>

        {/* Product Details with Image Overlay */}
        <PDPClient product={typedProduct} />

        {/* Fabric & Work Section */}
        <div className="mt-12">
          <FabricWorkSection 
            fabric={typedProduct.fabric_care || ""}
            work=""
            tags={typedProduct.tags || []}
          />
        </div>

        {/* Related Section */}
        {filteredRelated.length > 0 && (
          <div className="mt-24 border-t border-silver-light pt-16">
             <RelatedProducts products={filteredRelated} />
          </div>
        )}
      </div>
    </div>
  );
}
