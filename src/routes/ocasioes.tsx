import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublicProducts } from "@/lib/products.functions";
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
  const fetchProducts = useServerFn(listPublicProducts);

  useEffect(() => {
    setSelected(filter ?? null);
  }, [filter]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const data = await fetchProducts();
      return data as Product[];
    },
  });

  const occasion = OCCASIONS.find((o) => o.id === selected) ?? null;

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!occasion) return products;
    // "Só porque sim" é o catch-all: mostra tudo, embaralhado.
    if (occasion.id === "soporque") return shuffle(products);
    // Demais ocasiões: só os produtos marcados para ela no admin.
    let list = products.filter((p) => (p.occasions ?? []).includes(occasion.id));
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

      {/* Cabeçalho alinhado ao mesmo padrão da home: título à esquerda, sem o
          "kicker" maiúsculo centralizado que foi removido de todo o resto do
          site. Cores por token (text-accent etc.) em vez de hex fixo, para
          herdar qualquer ajuste futuro de tema. */}
      <section className="border-b border-gold/20 bg-surface-deep py-10 md:py-14">
        <div className="mx-auto max-w-6xl px-4">
          <nav className="text-xs text-foreground/60">
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
                <span className="text-accent">{occasion.name}</span>
              </>
            )}
          </nav>
          <h1 className="mt-3 font-display text-[1.9rem] leading-tight text-accent md:text-4xl">
            Escolha a ocasião perfeita
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-foreground/80">
            Selecione um motivo e a gente mostra os arranjos certos para ele.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {OCCASIONS.map((o) => {
            const active = selected === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setOccasion(active ? null : o.id)}
                className={
                  "rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-card-foreground hover:border-accent")
                }
              >
                <o.icon
                  className={"h-7 w-7 " + (active ? "text-primary-foreground" : "text-accent")}
                  strokeWidth={1.5}
                />
                <div className="mt-2 font-display text-base">{o.name}</div>
                <p
                  className={
                    "mt-1 line-clamp-2 text-xs " +
                    (active ? "text-primary-foreground/80" : "text-muted-foreground")
                  }
                >
                  {o.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <h2 className="mb-6 font-display text-2xl text-accent md:text-3xl">
          {occasion ? `Sugestões para ${occasion.name}` : "Todos os produtos"}
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Ainda não há produtos selecionados para esta ocasião.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
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
