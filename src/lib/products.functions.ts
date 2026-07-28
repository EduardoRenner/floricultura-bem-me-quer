import { createServerFn } from "@tanstack/react-start";

type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  occasions: string[];
  active: boolean;
  created_at: string;
};

export const listPublicProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicProduct[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { signImageUrls } = await import("@/lib/storage.server");

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id,name,description,price,category,image_url,occasions,active,created_at")
      .eq("active", true)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as PublicProduct[];
    const signed = await signImageUrls(rows.map((p) => p.image_url));
    return rows.map((p, i) => ({ ...p, image_url: signed[i] }));
  },
);
