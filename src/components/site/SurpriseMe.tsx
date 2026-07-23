import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/shop";
import { useCart } from "@/lib/cart";
import type { Product } from "@/components/site/ProductCard";

const CATS = ["Todos", "Rosas", "Arranjos", "Presentes", "Plantas"];

function pickRandom(products: Product[], category: string, exclude?: string): Product | null {
  const pool = (category === "Todos" ? products : products.filter((p) => p.category === category))
    .filter((p) => p.id !== exclude);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function SurpriseMeSection({ products }: { products: Product[] }) {
  return (
    <section
      className="py-16"
      style={{ background: "linear-gradient(180deg, #29321A 0%, #1D2A15 100%)" }}
    >
      <div className="mx-auto max-w-3xl px-4 text-center">
        <div className="text-5xl">🎲</div>
        <h2
          className="mt-3 font-display text-3xl md:text-4xl"
          style={{ color: "#CBB275" }}
        >
          Não sabe o que escolher?
        </h2>
        <p className="mt-2 text-base" style={{ color: "#F0EDD8" }}>
          Deixa a gente surpreender você
        </p>
        <div className="mt-6 flex justify-center">
          <SurpriseMeButton products={products} withCategorySelect />
        </div>
      </div>
    </section>
  );
}

export function SurpriseMeButton({
  products,
  withCategorySelect = false,
  variant = "primary",
  label = "✨ Surpreenda-me!",
}: {
  products: Product[];
  withCategorySelect?: boolean;
  variant?: "primary" | "pill";
  label?: string;
}) {
  const { add } = useCart();
  const [category, setCategory] = useState("Todos");
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const run = (excludeId?: string) => {
    setLoading(true);
    setTimeout(() => {
      const p = pickRandom(products, category, excludeId);
      setLoading(false);
      if (!p) {
        toast.error("Nenhum produto disponível");
        return;
      }
      setPicked(p);
      setOpen(true);
    }, 800);
  };

  return (
    <>
      <style>{`
        @keyframes surpriseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(203,178,117,0.4); }
          50% { box-shadow: 0 0 0 14px rgba(203,178,117,0); }
        }
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        @keyframes modalIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className={variant === "pill" ? "" : "flex flex-col items-center gap-3"}>
        {withCategorySelect && variant === "primary" && (
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              className="w-56 border-[#94833F] bg-transparent text-[#F0EDD8]"
              style={{ borderColor: "#94833F" }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <button
          onClick={() => run()}
          disabled={loading}
          className="transition-transform active:scale-95"
          style={
            variant === "pill"
              ? {
                  border: "1px solid #CBB275",
                  color: "#CBB275",
                  background: "transparent",
                  padding: "6px 14px",
                  borderRadius: 50,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }
              : {
                  background: "#94833F",
                  color: "#1D2A15",
                  fontWeight: 700,
                  padding: "16px 48px",
                  borderRadius: 50,
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  border: "none",
                  animation: loading ? "none" : "surpriseGlow 2s infinite",
                  transition: "background 0.2s, transform 0.2s",
                }
          }
          onMouseEnter={(e) => {
            if (variant === "primary")
              (e.currentTarget as HTMLButtonElement).style.background = "#CBB275";
          }}
          onMouseLeave={(e) => {
            if (variant === "primary")
              (e.currentTarget as HTMLButtonElement).style.background = "#94833F";
          }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span
                style={{
                  display: "inline-block",
                  animation: "spinSlow 0.8s linear infinite",
                }}
              >
                🌸
              </span>
              Escolhendo para você...
            </span>
          ) : (
            label
          )}
        </button>
      </div>

      {open && picked && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-lg p-8 text-center"
            style={{
              background: "#222D17",
              border: "2px solid #CBB275",
              boxShadow: "0 4px 30px rgba(0,0,0,0.6)",
              animation: "modalIn 0.3s ease-out",
            }}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-[#F0EDD8] hover:bg-[#29321A]"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-6xl">🌸</div>
            <h3
              className="mt-3 font-display text-2xl"
              style={{ color: "#CBB275" }}
            >
              {picked.name}
            </h3>
            {picked.description && (
              <p className="mt-2 text-sm" style={{ color: "#F0EDD8" }}>
                {picked.description}
              </p>
            )}
            <div
              className="mt-3 font-display text-2xl font-bold"
              style={{ color: "#CBB275" }}
            >
              {formatBRL(Number(picked.price))}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => {
                  add({
                    id: picked.id,
                    name: picked.name,
                    price: Number(picked.price),
                    image_url: picked.image_url,
                  });
                  toast.success("Surpresa adicionada ao carrinho! 🌸");
                  setOpen(false);
                }}
              >
                🛒 Adicionar ao Carrinho
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-[#CBB275] text-[#CBB275]"
                onClick={() => run(picked.id)}
              >
                🎲 Tentar outra vez
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
