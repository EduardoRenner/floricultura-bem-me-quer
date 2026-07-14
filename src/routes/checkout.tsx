import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart";
import { ADDRESS, formatBRL } from "@/lib/shop";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();

  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("key,value");
      if (error) throw error;
      const map: Record<string, unknown> = {};
      for (const row of data ?? []) map[row.key] = row.value;
      return map;
    },
  });

  const deliveryFee = Number((settings?.delivery_fee as number) ?? 15);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(() => subtotal + (deliveryType === "delivery" ? deliveryFee : 0), [subtotal, deliveryType, deliveryFee]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-display text-3xl">Seu carrinho está vazio</h1>
          <p className="mt-3 text-muted-foreground">Adicione produtos antes de finalizar o pedido.</p>
          <Link to="/" className="mt-6 inline-block">
            <Button>Ver produtos</Button>
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const payload = {
        customer_name: String(fd.get("name") ?? ""),
        customer_phone: String(fd.get("phone") ?? ""),
        customer_email: (fd.get("email") as string) || null,
        delivery_type: deliveryType,
        delivery_address:
          deliveryType === "delivery"
            ? {
                rua: String(fd.get("rua") ?? ""),
                numero: String(fd.get("numero") ?? ""),
                bairro: String(fd.get("bairro") ?? ""),
                cep: String(fd.get("cep") ?? ""),
                complemento: String(fd.get("complemento") ?? ""),
              }
            : null,
        delivery_date: (fd.get("date") as string) || null,
        delivery_time: (fd.get("time") as string) || null,
        payment_method: String(fd.get("payment") ?? "Pix"),
        notes: (fd.get("notes") as string) || null,
        total,
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      } as never;
      const { data, error } = await supabase
        .from("orders")
        .insert(payload)
        .select("order_number")
        .single();
      if (error) throw error;
      clear();
      toast.success("Pedido realizado com sucesso!");
      navigate({ to: "/pedido/$orderNumber", params: { orderNumber: data.order_number } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar pedido";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl">Finalizar pedido</h1>
        <p className="mt-2 text-muted-foreground">Preencha seus dados para concluir a compra.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <form onSubmit={submit} className="space-y-8">
            {/* Cliente */}
            <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-display text-xl">Seus dados</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nome completo *</Label>
                  <Input required name="name" />
                </div>
                <div>
                  <Label>Telefone *</Label>
                  <Input required name="phone" placeholder="(49) 9 9999-9999" />
                </div>
                <div className="md:col-span-2">
                  <Label>E-mail</Label>
                  <Input type="email" name="email" />
                </div>
              </div>
            </section>

            {/* Entrega */}
            <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-display text-xl">Entrega</h2>
              <RadioGroup
                value={deliveryType}
                onValueChange={(v) => setDeliveryType(v as "delivery" | "pickup")}
                className="mt-4 grid gap-3 md:grid-cols-2"
              >
                <label
                  className={
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 " +
                    (deliveryType === "delivery" ? "border-primary bg-primary/5" : "border-border")
                  }
                >
                  <RadioGroupItem value="delivery" className="mt-1" />
                  <div>
                    <div className="font-medium">🏠 Entrega</div>
                    <div className="text-sm text-muted-foreground">
                      Taxa: {formatBRL(deliveryFee)}
                    </div>
                  </div>
                </label>
                <label
                  className={
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 " +
                    (deliveryType === "pickup" ? "border-primary bg-primary/5" : "border-border")
                  }
                >
                  <RadioGroupItem value="pickup" className="mt-1" />
                  <div>
                    <div className="font-medium">🏪 Retirada na loja</div>
                    <div className="text-sm text-muted-foreground">Sem taxa adicional</div>
                  </div>
                </label>
              </RadioGroup>

              {deliveryType === "delivery" ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>Rua *</Label>
                    <Input required name="rua" />
                  </div>
                  <div>
                    <Label>Número *</Label>
                    <Input required name="numero" />
                  </div>
                  <div>
                    <Label>Bairro *</Label>
                    <Input required name="bairro" />
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <Input name="cep" />
                  </div>
                  <div>
                    <Label>Complemento</Label>
                    <Input name="complemento" />
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-lg bg-secondary/50 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{ADDRESS}</span>
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    Seg a Sex: 08:00–11:30 / 13:00–18:30 · Sáb: 08:00–12:00
                  </p>
                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Data desejada</Label>
                  <Input type="date" name="date" />
                </div>
                <div>
                  <Label>Horário</Label>
                  <Input type="time" name="time" />
                </div>
              </div>
            </section>

            {/* Notas */}
            <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-display text-xl">Observações</h2>
              <Textarea
                name="notes"
                className="mt-4"
                rows={3}
                placeholder="Mensagem no cartão, preferências, referências…"
              />
            </section>

            {/* Pagamento */}
            <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-display text-xl">Pagamento</h2>
              <RadioGroup name="payment" defaultValue="Pix" className="mt-4 grid gap-3 md:grid-cols-3">
                {["Dinheiro", "Pix", "Cartão"].map((m) => (
                  <label
                    key={m}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-4 hover:border-primary/50"
                  >
                    <RadioGroupItem value={m} />
                    <span>{m}</span>
                  </label>
                ))}
              </RadioGroup>
            </section>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Enviando…" : "Finalizar Pedido"}
            </Button>
          </form>

          {/* Resumo */}
          <aside className="h-fit space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="font-display text-xl">Resumo</h2>
            <ul className="divide-y divide-border">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-3 text-sm">
                  <span className="flex-1">
                    {i.name} <span className="text-muted-foreground">× {i.quantity}</span>
                  </span>
                  <span>{formatBRL(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrega</span>
                <span>{deliveryType === "delivery" ? formatBRL(deliveryFee) : "Retirada"}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatBRL(total)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-accent/10 p-3 text-xs text-accent">
              <CheckCircle2 className="h-4 w-4" />
              Ao finalizar, entraremos em contato para confirmar o pedido.
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
