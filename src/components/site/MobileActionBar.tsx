import { useRouterState } from "@tanstack/react-router";
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
  const rota = useRouterState({ select: (s) => s.location.pathname });
  const temItens = count > 0;

  // No checkout a barra atrapalha em vez de ajudar: "Pedir no WhatsApp"
  // concorre com o formulário no momento exato de fechar a compra, e o
  // carrinho já está resumido na própria página.
  //
  // No admin ela não faz sentido nenhum: quem está ali é a dona gerenciando a
  // loja, não um cliente comprando. "Pedir no WhatsApp" e o carrinho são
  // ruído puro sobre o painel dela.
  if (rota.startsWith("/checkout") || rota.startsWith("/admin")) return null;

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
