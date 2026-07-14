import { createServerFn } from "@tanstack/react-start";

async function verifyAdmin(password: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "admin_password")
    .single();
  if (error || !data) throw new Error("Configuração indisponível");
  const stored = data.value as unknown as string;
  if (password !== stored) throw new Error("Senha incorreta");
  return supabaseAdmin;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    await verifyAdmin(data.password);
    return { ok: true as const };
  });

export const adminListOrders = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(data.password);
    const { data: orders, error } = await admin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return orders ?? [];
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string; id: string; status: string }) => data)
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(data.password);
    const { error } = await admin.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminListProducts = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(data.password);
    const { data: products, error } = await admin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return products ?? [];
  });

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      password: string;
      product: {
        id?: string;
        name: string;
        description?: string | null;
        price: number;
        category: string;
        image_url?: string | null;
        active: boolean;
      };
    }) => data,
  )
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(data.password);
    const p = data.product;
    if (p.id) {
      const { error } = await admin
        .from("products")
        .update({
          name: p.name,
          description: p.description ?? null,
          price: p.price,
          category: p.category,
          image_url: p.image_url ?? null,
          active: p.active,
        })
        .eq("id", p.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("products").insert({
        name: p.name,
        description: p.description ?? null,
        price: p.price,
        category: p.category,
        image_url: p.image_url ?? null,
        active: p.active,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string; id: string }) => data)
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(data.password);
    const { error } = await admin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminListSettings = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(data.password);
    const { data: rows, error } = await admin.from("settings").select("*");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpdateSetting = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string; key: string; value: unknown }) => data)
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(data.password);
    const { error } = await admin
      .from("settings")
      .update({ value: data.value as never })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminStats = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(data.password);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [{ count: todayCount }, { count: pendingCount }, { data: monthOrders }] =
      await Promise.all([
        admin
          .from("orders")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startOfDay.toISOString()),
        admin
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "pendente"),
        admin
          .from("orders")
          .select("total")
          .gte("created_at", startOfMonth.toISOString())
          .neq("status", "cancelado"),
      ]);

    const monthRevenue = (monthOrders ?? []).reduce(
      (s: number, r: { total: number }) => s + Number(r.total),
      0,
    );
    return {
      todayCount: todayCount ?? 0,
      pendingCount: pendingCount ?? 0,
      monthRevenue,
    };
  });
