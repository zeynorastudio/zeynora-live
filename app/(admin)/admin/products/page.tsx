import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPublicUrl } from "@/lib/utils/images";
import { AdminButton } from "@/components/admin/AdminButton";
import Link from "next/link";
import { Plus, Search, Edit } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export default async function ProductsListPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const page = parseInt(resolvedSearchParams.page || "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = resolvedSearchParams.search || "";

  const supabase = createServiceRoleClient();
  
  // Query products with correct column names
  let query = supabase
    .from("products")
    .select("uid, name, slug, price, main_image_path, active, featured, best_selling, created_at", { count: 'exact' })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,uid.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  
  // Defensive check for query errors
  if (error) {
    console.warn("[admin/products/page.tsx] Query error:", error.message);
  }
  
  const products: any[] | null = data || [];
  
  // Get thumbnails for products without main_image_path
  const productsNeedingThumbnails = products.filter(p => !p.main_image_path);
  const productUids = productsNeedingThumbnails.map(p => p.uid);
  
  let thumbnailMap = new Map<string, string>();
  if (productUids.length > 0) {
    const { data: thumbnailImages, error: thumbError } = await supabase
      .from("product_images")
      .select("product_uid, image_path")
      .in("product_uid", productUids)
      .order("display_order", { ascending: true });
    
    if (thumbError) {
      console.warn("[admin/products/page.tsx] Thumbnail query error:", thumbError.message);
    } else if (thumbnailImages) {
      const seenUids = new Set<string>();
      for (const img of thumbnailImages) {
        const typedImg = img as { product_uid: string; image_path: string };
        if (!seenUids.has(typedImg.product_uid)) {
          seenUids.add(typedImg.product_uid);
          thumbnailMap.set(typedImg.product_uid, typedImg.image_path);
        }
      }
    }
  }
  
  // Enhance products with thumbnail URLs
  const productsWithThumbnails = products.map(p => {
    let thumbnailUrl: string;
    if (p.main_image_path) {
      thumbnailUrl = getPublicUrl("products", p.main_image_path);
    } else {
      const thumbnailPath = thumbnailMap.get(p.uid);
      thumbnailUrl = thumbnailPath 
        ? getPublicUrl("products", thumbnailPath)
        : getPublicUrl("products", null); // Fallback to placeholder
    }
    return { ...p, thumbnail_url: thumbnailUrl };
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="serif-display text-3xl text-night">Products</h1>
          <p className="text-silver-dark mt-1">{count} products found</p>
        </div>
        {session.role === "super_admin" && (
          <Link href="/admin/products/new">
            <AdminButton icon={Plus}>Create Product</AdminButton>
          </Link>
        )}
      </div>

      {/* Search Bar */}
      <form className="mb-6 relative max-w-md">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-dark" />
         <input 
           name="search" 
           defaultValue={search} 
           placeholder="Search by name or UID..." 
           className="w-full pl-10 pr-4 py-2 border border-silver-light rounded-full focus:outline-none focus:ring-1 focus:ring-gold"
         />
      </form>

      {/* Table */}
      <div className="bg-white rounded-lg border border-silver-light overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-offwhite text-silver-darker uppercase text-xs font-bold tracking-wider border-b border-silver-light">
            <tr>
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Price</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Flags</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-light">
            {productsWithThumbnails?.map((p) => (
              <tr key={p.uid} className="hover:bg-offwhite/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-offwhite rounded border border-silver-light overflow-hidden flex-shrink-0">
                      {p.thumbnail_url && !p.thumbnail_url.includes("placeholder") ? (
                        <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-silver-dark">IMG</div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-night">{p.name}</div>
                      <div className="font-mono text-xs text-silver-dark">{p.uid}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium">₹{p.price.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <Badge variant={p.active ? "vine" : "secondary"}>
                    {p.active ? "Active" : "Draft"}
                  </Badge>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  {p.featured && <span className="text-[10px] bg-gold/10 text-gold-darker px-1.5 py-0.5 rounded border border-gold/20">Featured</span>}
                  {p.best_selling && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">Best Seller</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/admin/products/${p.uid}`}>
                    <AdminButton size="sm" variant="outline" icon={Edit}>Edit</AdminButton>
                  </Link>
                </td>
              </tr>
            ))}
            {productsWithThumbnails?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-silver-dark italic">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Simple Pagination */}
      <div className="flex justify-end mt-4 gap-2">
         {page > 1 && (
           <Link href={`/admin/products?page=${page - 1}&search=${search}`}>
             <AdminButton variant="outline" size="sm">Previous</AdminButton>
           </Link>
         )}
         {productsWithThumbnails && productsWithThumbnails.length === limit && (
           <Link href={`/admin/products?page=${page + 1}&search=${search}`}>
             <AdminButton variant="outline" size="sm">Next</AdminButton>
           </Link>
         )}
      </div>

    </div>
  );
}

