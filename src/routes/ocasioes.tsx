import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ProductCard, type Product } from "@/components/site/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { OCCASIONS, type OccasionId } from "@/lib/occasions";
import { Star } from "lucide-react";

type Search = { filter?: OccasionId };

export const Route = createFileRoute("/ocasioes")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    filter: (s.filter as OccasionId) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ocasiões — Floricultura Bem Me Quer" },
      {
        name: "description",
        content:
          "Encontre o arranjo floral perfeito para cada ocasião: casamento, aniversário, formatura e mais.",
      },
    ],
  }),
  component: OccasionsPage,
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function OccasionsPage() {
  const { filter } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [selected, setSelected] = useState<OccasionId | null>(filter ?? null);

  useEffect(() => {
    setSelected(filter ?? null);
  }, [filter]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });

  const occasion = OCCASIONS.find((o) => o.id === selected) ?? null;

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!occasion) return products;
    if (occasion.id === "soporque") return shuffle(products);
    let list = products.filter((p) => occasion.categories.includes(p.category));
    if (occasion.nameContains) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(occasion.nameContains!.toLowerCase()),
      );
    }
    // highlight sort
    if (occasion.highlightName) {
      list = [...list].sort((a, b) => {
        const ah = a.name.toLowerCase().includes(occasion.highlightName!.toLowerCase()) ? -1 : 0;
        const bh = b.name.toLowerCase().includes(occasion.highlightName!.toLowerCase()) ? -1 : 0;
        return ah - bh;
      });
    }
    return list;
  }, [products, occasion]);

  const setOccasion = (id: OccasionId | null) => {
    navigate({ search: id ? { filter: id } : {} });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="py-14" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-6xl px-4 text-center">
          <div className="text-xs uppercase tracking-widest text-accent">Ocasiões</div>
          <h1
            className="mt-2 font-display text-3xl md:text-5xl"
            style={{ color: "#CBB275" }}
          >
            Escolha a Ocasião Perfeita
          </h1>
          <p className="mx-auto mt-3 max-w-xl" style={{ color: "#F0EDD8" }}>
            Cada momento merece flores especiais. Selecione uma ocasião para ver nossas
            sugestões.
          </p>
          <nav className="mt-6 text-xs" style={{ color: "#A5A17E" }}>
            <Link to="/" className="hover:text-accent">
              Início
            </Link>
            <span className="mx-2">›</span>
            <Link to="/ocasioes" className="hover:text-accent">
              Ocasiões
            </Link>
            {occasion && (
              <>
                <span className="mx-2">›</span>
                <span style={{ color: "#CBB275" }}>{occasion.name}</span>
              </>
            )}
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {OCCASIONS.map((o) => {
            const active = selected === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setOccasion(active ? null : o.id)}
                className="rounded-xl p-5 text-center transition-all hover:-translate-y-0.5"
                style={{
                  background: active ? "#94833F" : "#222D17",
                  border: `1px solid ${active ? "#CBB275" : "#3E4A2C"}`,
                  color: active ? "#1D2A15" : "#F0EDD8",
                  cursor: "pointer",
                }}
              >
                <o.icon
                  className="mx-auto h-8 w-8"
                  strokeWidth={1.5}
                  style={{ color: active ? "#1D2A15" : "#CBB275" }}
                />
                <div className="mt-2 font-display text-base">{o.name}</div>
                <p
                  className="mt-1 line-clamp-2 text-xs"
                  style={{ color: active ? "#1D2A15" : "#A5A17E" }}
                >
                  {o.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2
          className="mb-6 font-display text-2xl md:text-3xl"
          style={{ color: "#CBB275" }}
        >
          {occasion ? `Sugestões para ${occasion.name}` : "Todos os produtos"}
        </h2>
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Nenhum produto encontrado para esta ocasião.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((p) => {
              const highlight =
                occasion?.highlightName &&
                p.name.toLowerCase().includes(occasion.highlightName.toLowerCase());
              return (
                <div key={p.id} className="relative">
                  {highlight && (
                    <span
                      className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold"
                      style={{
                        background: "#CBB275",
                        color: "#1D2A15",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                      }}
                    >
                      <Star className="h-3 w-3 fill-current" /> Mais pedido
                    </span>
                  )}
                  <ProductCard product={p} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
