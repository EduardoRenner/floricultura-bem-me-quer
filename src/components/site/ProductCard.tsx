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
    // Cartão claro sobre o fundo escuro da marca: a foto da flor é o que
    // vende, e ela perde saturação quando fica sobre superfície escura.
    // flex-col + rodapé em mt-auto mantém preço e botão alinhados entre
    // cartões vizinhos, mesmo com títulos de alturas diferentes.
    <article className="group flex h-full flex-col overflow-hidden rounded-xl bg-paper text-paper-foreground shadow-[0_1px_2px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.4)]">
      <div className="relative aspect-[4/5] shrink-0 overflow-hidden bg-[#ECE7D8]">
        {product.image_url ? (
          <img
            // Exibido a ~260px; 600 cobre telas retina sem baixar o original.
            src={productImageUrl(product.image_url, 600)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-paper-muted">Sem foto</div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:gap-2 sm:p-4">
        <h3 className="font-display text-[15px] leading-snug sm:text-lg">{product.name}</h3>

        {product.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-paper-muted sm:text-[13px]">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-2">
          <div className="font-display text-xl leading-none sm:text-[22px]">
            {formatBRL(Number(product.price))}
          </div>
          <Button
            size="sm"
            className="mt-2.5 h-10 w-full"
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
