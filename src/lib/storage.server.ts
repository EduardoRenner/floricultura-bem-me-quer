import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const PRODUCT_IMAGES_BUCKET = "product-images";
const SIGNED_EXPIRES_IN = 60 * 60; // 1 hour

/**
 * Extract the storage object path from any acceptable image_url value:
 *   - "abc.jpg"                                       -> "abc.jpg"
 *   - ".../storage/v1/object/public/product-images/x" -> "x"
 *   - ".../storage/v1/object/sign/product-images/x?token=..." -> "x"
 *   - "https://external.example.com/foo.png"          -> null (external URL)
 */
export function extractImagePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  const marker = `/${PRODUCT_IMAGES_BUCKET}/`;
  const i = trimmed.indexOf(marker);
  if (i >= 0) {
    const after = trimmed.slice(i + marker.length);
    return after.split("?")[0] || null;
  }
  if (/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

/** External http(s) URL that is not one of our storage objects. */
function isExternalUrl(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false;
  return /^https?:\/\//i.test(imageUrl) && !imageUrl.includes(`/${PRODUCT_IMAGES_BUCKET}/`);
}

/**
 * Normalize an image_url before persisting so the DB always holds either
 * an external http(s) URL or the canonical public URL of our bucket
 * (never a signed URL with an expiring token).
 */
export function normalizeImageUrlForStorage(
  input: string | null | undefined,
): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const path = extractImagePath(trimmed);
  if (path) {
    const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
    if (!base) return trimmed; // fallback: keep as-is
    return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${path}`;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

/**
 * Given the image_url values stored on products, return the display URLs.
 * Storage-backed values become short-lived signed URLs; external URLs are
 * returned untouched.
 */
export async function signImageUrls(
  imageUrls: (string | null | undefined)[],
): Promise<(string | null)[]> {
  const paths = imageUrls.map(extractImagePath);
  const uniquePaths = Array.from(new Set(paths.filter((p): p is string => !!p)));
  const map = new Map<string, string>();
  if (uniquePaths.length > 0) {
    const { data, error } = await supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .createSignedUrls(uniquePaths, SIGNED_EXPIRES_IN);
    if (error) throw new Error(error.message);
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) map.set(entry.path, entry.signedUrl);
    }
  }
  return imageUrls.map((u, i) => {
    if (isExternalUrl(u)) return u as string;
    const p = paths[i];
    return p ? map.get(p) ?? null : null;
  });
}
