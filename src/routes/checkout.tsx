import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, MapPin, MessageCircle, Store, Truck } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { useCart } from "@/lib/cart";
import { ADDRESS, formatBRL, WHATSAPP_URL } from "@/lib/shop";
import { createOrder } from "@/lib/order.functions";
import { getPublicSettings } from "@/lib/settings.functions";

// Mapeia os valores da tela para os aceitos pelo banco.
const PAYMENT_DB: Record<string, string> = {
  Dinheiro: "dinheiro",
  Pix: "pix",
  "Cartão": "cartao",
};

export const Route = createFileRoute("/checkout")({
  loader: () => getPublicSettings(),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const { status: entrega } = Route.useLoaderData();
  const createOrderFn = useServerFn(createOrder);

  // A taxa de entrega não tem valor fixo: varia por local e é combinada com
  // a cliente depois, então não entra no cálculo do total aqui nem no servidor.
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [submitting, setSubmitting] = useState(false);

  const total = subtotal;

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

    // Quem compra só informa nome e telefone de contato — é só quem a loja
    // liga se precisar combinar algo. Todo o resto (nome de quem recebe,
    // endereço da entrega, referência, cartão) é sempre da pessoa que vai
    // receber a mercadoria, mesmo quando é a mesma pessoa que comprou — não
    // depende de nenhuma escolha na tela, é sempre a mesma seção.
    const name = String(fd.get("name") ?? "").trim();
    const recipientName = String(fd.get("recipient_name") ?? "").trim();
    const contactPhone = String(fd.get("contact_phone") ?? "").trim();
    const endereco = String(fd.get("endereco") ?? "").trim();
    const referencePoint = String(fd.get("reference_point") ?? "").trim();

    if (name.length < 2) {
      toast.error("Por favor, informe seu nome completo.");
      setSubmitting(false);
      return;
    }
    if (recipientName.length < 2) {
      toast.error("Informe o nome completo de quem vai receber.");
      setSubmitting(false);
      return;
    }
    if (contactPhone.replace(/\D/g, "").length < 10) {
      toast.error("Informe um telefone válido com DDD.");
      setSubmitting(false);
      return;
    }
    if (deliveryType === "delivery" && !endereco) {
      toast.error("Preencha o endereço completo para entrega.");
      setSubmitting(false);
      return;
    }

    const cardMessage = String(fd.get("card_message") ?? "").trim().slice(0, 200);
    const paymentLabel = String(fd.get("payment") ?? "Pix");
    const paymentDb = PAYMENT_DB[paymentLabel] ?? "pix";

    // Número do pedido: preferimos o número sequencial devolvido pelo banco;
    // se o salvamento falhar, usamos este como fallback (cliente nunca trava).
    let orderNumber = "BMQ-" + Date.now().toString().slice(-6);

    // Total estimado, só para exibir se o salvamento falhar. O número que vale
    // é o que o servidor devolve, calculado com os preços do catálogo.
    const productsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    let finalTotal = productsTotal;
    let finalLines = items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
    }));
    // Signed URLs dos PDFs (gerados no servidor ao salvar o pedido). `null`
    // se a geração falhar — a mensagem sai sem o link em vez de travar o pedido.
    let pdfUrl: string | null = null;
    let cardPdfUrl: string | null = null;

    // Enviamos apenas o que o cliente legitimamente escolhe: qual produto e
    // quantos. Preço, nome e taxa de entrega são resolvidos no servidor a
    // partir do catálogo e das configurações.
    const dbItems = items.map((i) => ({ id: i.id, quantity: i.quantity }));

    // Abre a aba do WhatsApp já dentro do clique (evita bloqueio de popup);
    // a URL é definida depois que o pedido é salvo.
    const waWindow = window.open("", "_blank");

    // Salva o pedido via server function (service role) e recebe o número
    // sequencial gerado. Se falhar, seguimos para o WhatsApp mesmo assim.
    try {
      const res = await createOrderFn({
        data: {
          customer_name: name,
          // `customer_phone` é a única coluna de telefone que o banco exige
          // (NOT NULL). Com o formulário reduzido a um telefone só, ele
          // preenche as duas colunas — é o mesmo número de contato de
          // qualquer forma.
          customer_phone: contactPhone,
          customer_email: null,
          recipient_name: recipientName,
          recipient_phone: contactPhone,
          delivery_type: deliveryType,
          delivery_address: deliveryType === "delivery" ? { rua: endereco } : null,
          reference_point: referencePoint || null,
          delivery_date: null,
          delivery_time: null,
          payment_method: paymentDb,
          delivery_instructions: null,
          card_message: cardMessage || null,
          items: dbItems,
        },
      });
      if (res?.orderNumber) orderNumber = res.orderNumber;
      // Passa a usar o que foi realmente gravado, para a mensagem do WhatsApp
      // não divergir do pedido no painel.
      if (typeof res?.total === "number") finalTotal = res.total;
      if (Array.isArray(res?.items)) {
        // A taxa vai numa linha própria mais abaixo, não junto dos produtos.
        finalLines = res.items.filter((i) => i.name !== "Taxa de entrega");
      }
      if (typeof res?.pdfUrl === "string") pdfUrl = res.pdfUrl;
      if (typeof res?.cardPdfUrl === "string") cardPdfUrl = res.cardPdfUrl;
    } catch (err) {
      console.error("Falha ao salvar o pedido:", err);
    }

    // Mensagem do WhatsApp — texto limpo, sem símbolos que aparecem como "?"
    const itemLines = finalLines
      .map((i) => `  - ${i.quantity}x ${i.name} — ${formatBRL(i.price * i.quantity)}`)
      .join("\n");

    const deliveryLine =
      deliveryType === "delivery"
        ? `*Entrega*\n  Endereço: ${endereco}${referencePoint ? "\n  Ponto de referência: " + referencePoint : ""}\n  (Taxa de entrega a combinar)`
        : `*Retirada na loja*`;

    const paymentLine = `*Forma de pagamento:* ${paymentLabel}`;
    const cardMessageLine = cardMessage ? `*Conteúdo do cartão:* ${cardMessage}` : "";

    const message = [
      `*Novo Pedido — ${orderNumber}*`,
      ``,
      `*Para:* ${recipientName}`,
      `*Telefone para contato:* ${contactPhone}`,
      ``,
      `*Itens:*`,
      itemLines,
      ``,
      deliveryLine,
      paymentLine,
      cardMessageLine,
      ``,
      `*Total: ${formatBRL(finalTotal)}*`,
      ``,
      pdfUrl ? `*Comprovante do pedido (uso interno):* ${pdfUrl}` : "",
      cardPdfUrl ? `*Cartão de mensagem (imprimir e enviar com o presente):* ${cardPdfUrl}` : "",
      ``,
      `*Seu nome:* ${name}`,
      ``,
      `Pedido feito pelo site — Floricultura Bem Me Quer`,
    ]
      .filter((l) => l !== "")
      .join("\n");

    const whatsappUrl = `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;

    try { clear(); } catch { /* noop */ }
    toast.success("Pedido registrado! Abrindo o WhatsApp…");

    if (waWindow) {
      waWindow.location.href = whatsappUrl;
    } else {
      // Popup bloqueado: navega na própria aba
      window.location.href = whatsappUrl;
    }
    navigate({ to: "/" });

    setSubmitting(false);
  }


  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl">Finalizar pedido</h1>
        <p className="mt-2 text-muted-foreground">Preencha seus dados para concluir a compra.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <form onSubmit={submit} className="space-y-8">
            {/* Entrega — vem primeiro porque decide quais campos abaixo aparecem */}
            <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-display text-xl">Entrega</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Para garantirmos a entrega do seu presente em Maravilha-SC, por gentileza nos
                informe os dados abaixo.
              </p>
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
                    <div className="flex items-center gap-2 font-medium">
                      <Truck className="h-4 w-4" /> Entrega
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Taxa de entrega a combinar
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
                    <div className="flex items-center gap-2 font-medium">
                      <Store className="h-4 w-4" /> Retirada na loja
                    </div>
                    <div className="text-sm text-muted-foreground">Sem taxa adicional</div>
                  </div>
                </label>
              </RadioGroup>

              {deliveryType === "pickup" && (
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
            </section>

            {/* Quem vai receber — nome, endereço, referência e cartão são
                sempre daqui, não de quem compra. É pra esta pessoa que a
                mercadoria precisa ir, mesmo quando é a mesma pessoa que está
                comprando (aí ela só escreve o próprio nome de novo). Nenhum
                desses campos depende de escolha nenhuma — é sempre esta a
                seção que carrega o endereço da entrega. */}
            <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-display text-xl">Quem vai receber</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Preencha os dados de quem vai receber as flores — mesmo que seja você.
              </p>
              <div className="mt-4 grid gap-4">
                <div>
                  <Label>Nome completo *</Label>
                  <Input required name="recipient_name" placeholder="Quem vai receber" />
                </div>
                {deliveryType === "delivery" && (
                  <>
                    <div>
                      <Label>Endereço da entrega *</Label>
                      <Input
                        required
                        name="endereco"
                        placeholder="Rua, número, bairro, complemento, CEP"
                      />
                    </div>
                    <div>
                      <Label>Ponto de referência (opcional)</Label>
                      <Input
                        name="reference_point"
                        placeholder="Ex.: perto do mercado tal, casa amarela…"
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label>Mensagem no cartão (opcional)</Label>
                  <Textarea
                    name="card_message"
                    className="mt-1.5"
                    rows={3}
                    maxLength={200}
                    placeholder="O que vai escrito no cartão que acompanha as flores…"
                  />
                  <p className="mt-1 text-right text-xs text-muted-foreground">Até 200 caracteres</p>
                </div>
              </div>
            </section>

            {/* Seus dados — só quem a loja contata pra combinar algo do
                pedido. Nunca leva endereço: entrega é sempre da seção acima. */}
            <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-display text-xl">Seus dados</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Seu nome *</Label>
                  <Input required name="name" placeholder="Seu nome completo" />
                </div>
                <div>
                  <Label>Seu telefone para contato *</Label>
                  <Input required name="contact_phone" placeholder="(49) 9 9999-9999" />
                </div>
              </div>
            </section>

            {/* Pagamento */}
            <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="font-display text-xl">Forma de pagamento</h2>
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
              {submitting ? (
                "Preparando pedido…"
              ) : (
                <>
                  <MessageCircle className="mr-2 h-4 w-4" /> Finalizar pelo WhatsApp
                </>
              )}
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
                <span>{deliveryType === "delivery" ? "A combinar" : "Retirada"}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatBRL(total)}</span>
              </div>
            </div>
            {deliveryType === "delivery" ? (
              <div className="flex items-start gap-2 rounded-lg bg-accent/10 p-3 text-xs text-accent">
                <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  A taxa de entrega varia conforme o local e será combinada com
                  você ao finalizar o pedido.
                </span>
              </div>
            ) : null}
            {/* Prazo no resumo, ao lado do total: é onde a pessoa hesita
                antes de confirmar. */}
            <div className="flex items-start gap-2 rounded-lg bg-accent/10 p-3 text-xs text-accent">
              <Truck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{entrega.texto}</span>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Seu pedido será enviado pelo WhatsApp para confirmarmos os detalhes.
              </span>
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
