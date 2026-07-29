import { MessageCircle, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatBRL, WHATSAPP_URL } from "@/lib/shop";

/**
 * Barra fixa no rodapé, só no celular.
 *
 * A página tem ~12 mil pixels de altura: quem está no meio do catálogo fica
 * longe do topo e do rodapé. Sem isto, decidir comprar exige rolar até achar
 * um botão. As duas ações que fecham venda ficam sempre a um toque.
 *
 * Só aparece no mobile — no desktop o cabeçalho fixo já resolve.
 */
export function MobileActionBar() {
  const { count, subtotal, setOpen } = useCart();
  const temItens = count > 0;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/40 bg-surface-deep/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch gap-2 px-3 py-2.5">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-gold text-sm font-medium text-accent"
        >
          <MessageCircle className="h-4 w-4" />
          Pedir no WhatsApp
        </a>

        <button
          onClick={() => setOpen(true)}
          disabled={!temItens}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          aria-label="Abrir carrinho"
        >
          <ShoppingBag className="h-4 w-4" />
          {temItens ? (
            <span className="tabular-nums">
              {count} · {formatBRL(subtotal)}
            </span>
          ) : (
            <span>Carrinho</span>
          )}
        </button>
      </div>
    </div>
  );
}
