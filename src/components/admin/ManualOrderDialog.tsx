import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminListProducts } from "@/lib/admin.functions";
import { adminCreateOrder } from "@/lib/order.functions";
import { withSession, type AdminProduct } from "@/lib/adminClient";
import { formatBRL } from "@/lib/shop";

/**
 * Lançamento manual de pedido — a venda que a dona fechou pelo WhatsApp.
 *
 * O catálogo do site empurra de propósito quem tem pressa para a conversa, e
 * sem esta tela essas vendas simplesmente não existiam para o sistema: sem
 * número de pedido, sem histórico, sem confirmação de entrega e — o que mais
 * pesa no dia a dia — **sem o PDF do cartão** que vai junto do arranjo. Aqui a
 * venda é relançada em meio minuto e sai igualzinha a uma do checkout.
 *
 * Chama `adminCreateOrder`, que por baixo é o mesmo `persistOrder` do checkout:
 * o preço vem sempre do catálogo, nunca do que for digitado aqui.
 */
export function ManualOrderDialog({
  token,
  open,
  onOpenChange,
}: {
  token: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const listProducts = useServerFn(adminListProducts);
  const create = useServerFn(adminCreateOrder);

  const [lines, setLines] = useState<{ id: string; quantity: number }[]>([]);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState("pix");

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () =>
      (await withSession(listProducts({ data: { token } }))) as unknown as AdminProduct[],
    // Só busca o catálogo quando a caixa abre: a aba Pedidos é a mais visitada
    // do painel e não precisa carregar produtos para listar pedidos.
    enabled: open,
  });

  const ativos = (products ?? []).filter((p) => p.active);

  // Prévia local do total, só para a dona conferir contra o que combinou no
  // WhatsApp. O valor que vale é o que o servidor recalcula pelo catálogo.
  const total = lines.reduce((sum, l) => {
    const p = ativos.find((x) => x.id === l.id);
    return sum + (p ? Number(p.price) * l.quantity : 0);
  }, 0);

  const salvar = useMutation({
    mutationFn: (order: Record<string, unknown>) =>
      withSession(create({ data: { token, order } as never })) as Promise<{
        orderNumber: string | null;
      }>,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(`Pedido ${res?.orderNumber ?? ""} lançado`, {
        description: "O cartão já pode ser impresso pela lista de pedidos.",
      });
      setLines([]);
      setDeliveryType("delivery");
      setPayment("pix");
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Erro ao lançar pedido"),
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const recipientName = String(fd.get("recipient_name") ?? "").trim();
    const customerName = String(fd.get("customer_name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const rua = String(fd.get("rua") ?? "").trim();
    const numero = String(fd.get("numero") ?? "").trim();
    const referencia = String(fd.get("referencia") ?? "").trim();
    const cardMessage = String(fd.get("card_message") ?? "").trim();

    const validas = lines.filter((l) => l.id && l.quantity > 0);
    if (validas.length === 0) {
      toast.error("Escolha pelo menos um produto.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      toast.error("Informe um telefone com DDD.");
      return;
    }
    // Mesma trava do checkout, pelo mesmo motivo: já entrou pedido real com
    // rua sem número e a entrega não pôde ser feita sem ligar para a cliente.
    if (deliveryType === "delivery" && (!rua || !numero)) {
      toast.error('Endereço e número são obrigatórios (use "s/n" se não houver).');
      return;
    }

    salvar.mutate({
      customer_name: customerName,
      customer_phone: phone,
      recipient_name: recipientName,
      recipient_phone: phone,
      delivery_type: deliveryType,
      delivery_address: deliveryType === "delivery" ? { rua, numero } : null,
      reference_point: referencia || null,
      payment_method: payment,
      card_message: cardMessage || null,
      items: validas,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Lançar pedido do WhatsApp</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label>Produtos *</Label>
            {lines.map((l, idx) => (
              <div key={idx} className="flex gap-2">
                <Select
                  value={l.id}
                  onValueChange={(v) =>
                    setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, id: v } : x)))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Escolha o arranjo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ativos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatBRL(Number(p.price))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  aria-label="Quantidade"
                  className="w-20"
                  value={l.quantity}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, quantity: Number(e.target.value) || 1 } : x,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remover item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((prev) => [...prev, { id: "", quantity: 1 }])}
            >
              <Plus className="mr-1 h-4 w-4" /> Adicionar item
            </Button>
            {total > 0 && (
              <p className="text-right text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{formatBRL(total)}</span>
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Quem está comprando *</Label>
              <Input required name="customer_name" placeholder="Nome de quem pediu" />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input required name="phone" placeholder="(49) 9 9999-9999" />
            </div>
          </div>

          <div>
            <Label>Quem vai receber *</Label>
            <Input required name="recipient_name" placeholder="Nome que sai no cartão" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Entrega</Label>
              <Select
                value={deliveryType}
                onValueChange={(v) => setDeliveryType(v as "delivery" | "pickup")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery">Entrega</SelectItem>
                  <SelectItem value="pickup">Retirada na loja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pagamento</Label>
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {deliveryType === "delivery" && (
            <>
              <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                <div>
                  <Label>Endereço *</Label>
                  <Input required name="rua" placeholder="Rua, bairro, complemento" />
                </div>
                <div>
                  <Label>Número *</Label>
                  <Input required name="numero" placeholder="123 ou s/n" />
                </div>
              </div>
              <div>
                <Label>Ponto de referência</Label>
                <Input name="referencia" placeholder="Ex.: perto do mercado, casa amarela…" />
              </div>
            </>
          )}

          <div>
            <Label>Mensagem do cartão</Label>
            <Textarea
              name="card_message"
              rows={3}
              maxLength={200}
              placeholder="O que vai escrito no cartão…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending}>
              {salvar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lançar pedido
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
