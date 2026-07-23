import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/shop";
import { useCart } from "@/lib/cart";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  occasions?: string[] | null;
};

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  return (
    <article className="card-hover group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.35)" }}>
      <div className="aspect-[4/5] overflow-hidden" style={{ background: "#1A2011" }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">Sem foto</div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="text-[10px] uppercase tracking-widest text-accent">{product.category}</div>
        <h3 className="font-display text-lg leading-tight text-foreground">{product.name}</h3>
        {product.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        )}
        <div className="flex items-center justify-between pt-2">
          <span className="font-display text-xl text-accent">{formatBRL(Number(product.price))}</span>
          <Button
            size="sm"
            onClick={() => {
              add({
                id: product.id,
                name: product.name,
                price: Number(product.price),
                image_url: product.image_url,
              });
              toast.success("Adicionado ao carrinho", { description: product.name });
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>
    </article>
  );
}
