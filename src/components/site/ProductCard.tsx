import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatBRL, productImageUrl } from "@/lib/shop";
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
    // flex-col + h-full: com títulos de alturas diferentes na mesma linha do
    // grid, o preço e o botão ficavam desalinhados entre cards vizinhos.
    <article className="card-hover group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.35)" }}>
      <div className="aspect-[4/5] shrink-0 overflow-hidden" style={{ background: "#1A2011" }}>
        {product.image_url ? (
          <img
            // O card exibe ~260px de largura; 600 cobre telas retina sem
            // baixar o original de 1234px.
            src={productImageUrl(product.image_url, 600)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">Sem foto</div>
        )}
      </div>
      {/* No celular são 2 cards por linha (~165px), então tipografia e
          espaçamento apertam um pouco antes de voltar ao normal em sm+. */}
      <div className="flex flex-1 flex-col space-y-1.5 p-3 sm:space-y-2 sm:p-4">
        <div className="text-[10px] uppercase tracking-widest text-accent">{product.category}</div>
        <h3 className="font-display text-base leading-tight text-foreground sm:text-lg">
          {product.name}
        </h3>
        {product.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
            {product.description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 sm:pt-2">
          <span className="font-display text-lg text-accent sm:text-xl">
            {formatBRL(Number(product.price))}
          </span>
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
