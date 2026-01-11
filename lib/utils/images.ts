const FALLBACK_IMAGE = "/images/placeholder-product.jpg";

/**
 * SSR-safe function to generate public storage URLs
 * Works in both server and client components by directly constructing the URL
 */
export function getPublicUrl(bucket: string, path: string | null | undefined): string {
  if (!path) return FALLBACK_IMAGE;

  // If path is already a full URL (e.g., external or pre-signed), return it
  if (path.startsWith("http")) return path;

  // Handle supabase:// protocol if stored that way
  const cleanPath = path.replace("supabase://", "");

  // If path starts with bucket name (e.g. "products/uid/img.jpg"), strip it
  let finalPath = cleanPath;
  if (cleanPath.startsWith(`${bucket}/`)) {
    finalPath = cleanPath.substring(bucket.length + 1);
  }
  
  // Strip leading slash if present
  if (finalPath.startsWith("/")) finalPath = finalPath.substring(1);

  // Construct public URL directly (works in both SSR and CSR)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return FALLBACK_IMAGE;

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${finalPath}`;
}
