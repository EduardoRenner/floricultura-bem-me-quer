import { createServerFn } from "@tanstack/react-start";

// Cria um pedido a partir do checkout do site.
// Roda no servidor com service role: insere na tabela `orders` (o trigger
// valida/recalcula o total e gera o número do pedido) e devolve o número
// sequencial gerado — assim o número no WhatsApp bate com o do dashboard.

// O cliente diz O QUE quer e QUANTO quer. Nunca quanto custa.
// `name` e `price` são aceitos no payload por compatibilidade, mas ignorados.
type OrderItemInput = { id?: string; name?: string; quantity: number; price?: number };

type CreateOrderInput = {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  delivery_type: "delivery" | "pickup";
  delivery_address?: Record<string, string> | null;
  delivery_date?: string | null;
  delivery_time?: string | null;
  payment_method: string; // 'pix' | 'dinheiro' | 'cartao'
  delivery_instructions?: string | null;
  card_message?: string | null;
  items: OrderItemInput[];
};

// Limite do campo "mensagem do cartão" — cartões físicos não têm espaço para
// textos longos, e isso evita que a mensagem estoure o bloco reservado no PDF.
const CARD_MESSAGE_MAX_LENGTH = 200;

// A taxa entra como item para o total do trigger (soma dos itens) bater com o
// total exibido. O rótulo precisa continuar exatamente assim: `adminStats`
// filtra por ele para não contar a taxa como produto vendido.
const DELIVERY_FEE_LABEL = "Taxa de entrega";
// Usada só se a setting `delivery_fee` sumir ou vier inválida — nunca deixa o
// pedido sair sem taxa por causa de configuração faltando.
const DELIVERY_FEE_FALLBACK = 15;

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: CreateOrderInput) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getClientIp } = await import("@/lib/request.server");

    // Protege o checkout público contra spam/flood de pedidos falsos — mesmo
    // padrão do rate limit de login do admin, aplicado por IP.
    const ip = await getClientIp();
    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc(
      "check_order_rate_limit",
      { _ip: ip },
    );
    if (rateLimitError) throw new Error("Não foi possível processar o pedido");
    if (!allowed) {
      throw new Error("Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente novamente.");
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Pedido sem itens");
    }
    if (!data.customer_name?.trim() || !data.customer_phone?.trim()) {
      throw new Error("Nome e telefone são obrigatórios");
    }
    if (data.delivery_type !== "delivery" && data.delivery_type !== "pickup") {
      throw new Error("Tipo de entrega inválido");
    }

    // Consolida por id: se o mesmo produto vier repetido, soma as quantidades
    // em vez de virar duas linhas no pedido.
    const wanted = new Map<string, number>();
    for (const it of data.items) {
      const id = typeof it?.id === "string" ? it.id.trim() : "";
      if (!id) throw new Error("Item de pedido inválido");
      const qty = Math.floor(Number(it?.quantity));
      if (!Number.isFinite(qty) || qty <= 0 || qty > 999) {
        throw new Error("Quantidade inválida");
      }
      wanted.set(id, (wanted.get(id) ?? 0) + qty);
    }
    if (wanted.size > 100) throw new Error("Pedido com itens demais");

    // O PONTO CENTRAL: nome e preço vêm do catálogo, nunca do payload.
    // Sem isto, quem editasse o carrinho no localStorage escolheria o próprio
    // preço — o trigger no banco recalcula o total, mas a partir dos preços
    // que ele recebe, então sozinho ele não protege contra adulteração.
    const { data: rows, error: prodError } = await supabaseAdmin
      .from("products")
      .select("id,name,price,active")
      .in("id", [...wanted.keys()]);
    // Mensagem genérica: é endpoint público, não devolve detalhe interno do banco.
    if (prodError) throw new Error("Não foi possível validar os itens do pedido");

    const items: { id?: string; name: string; quantity: number; price: number }[] = [];
    for (const [id, quantity] of wanted) {
      const p = (rows ?? []).find((r) => r.id === id);
      // Produto inativo cai aqui junto com inexistente: se saiu do catálogo,
      // não pode ser comprado por quem tinha a página aberta.
      if (!p || !p.active) throw new Error("Produto indisponível no catálogo");
      items.push({ id, name: p.name, quantity, price: Number(p.price) });
    }

    if (data.delivery_type === "delivery") {
      const { data: setting } = await supabaseAdmin
        .from("settings")
        .select("value")
        .eq("key", "delivery_fee")
        .maybeSingle();
      const fee = Number(setting?.value);
      items.push({
        name: DELIVERY_FEE_LABEL,
        quantity: 1,
        price: Number.isFinite(fee) && fee >= 0 ? fee : DELIVERY_FEE_FALLBACK,
      });
    }

    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name.trim().slice(0, 200),
        customer_phone: data.customer_phone.trim().slice(0, 40),
        customer_email: data.customer_email?.trim().slice(0, 200) || null,
        delivery_type: data.delivery_type,
        delivery_address: data.delivery_address ?? null,
        delivery_date: data.delivery_date || null,
        delivery_time: data.delivery_time || null,
        payment_method: data.payment_method,
        delivery_instructions: data.delivery_instructions?.trim().slice(0, 2000) || null,
        card_message: data.card_message?.trim().slice(0, CARD_MESSAGE_MAX_LENGTH) || null,
        status: "pendente",
        total: 0, // recalculado pelo trigger a partir dos itens acima
        items,
      })
      .select("order_number,created_at")
      .single();

    if (error) throw new Error(error.message);

    const orderNumber = (row?.order_number as string) ?? null;
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

    // Gera o PDF (dados do pedido + cartão + comprovante com QR) e sobe no
    // bucket privado, devolvendo uma signed URL para ir na mensagem do
    // WhatsApp. Best-effort: se falhar, o pedido já está gravado e o
    // checkout segue sem o link — não pode travar o fechamento do pedido.
    let pdfUrl: string | null = null;
    if (orderNumber) {
      const { generateAndStoreOrderPdf } = await import("@/lib/orderPdf.server");
      pdfUrl = await generateAndStoreOrderPdf({
        orderNumber,
        createdAt: (row?.created_at as string) ?? new Date().toISOString(),
        status: "pendente",
        paymentMethod: data.payment_method,
        deliveryType: data.delivery_type,
        deliveryAddress: data.delivery_address ?? null,
        customerName: data.customer_name.trim(),
        customerPhone: data.customer_phone.trim(),
        notes: null,
        deliveryInstructions: data.delivery_instructions?.trim() || null,
        cardMessage: data.card_message?.trim() || null,
        items,
        total,
      });
    }

    // Devolve os itens já precificados pelo servidor para o checkout montar a
    // mensagem do WhatsApp com os valores que realmente foram gravados.
    return { orderNumber, items, total, pdfUrl };
  });

const RECEIVED_TYPE_LABELS: Record<string, string> = {
  em_maos: "Em mãos",
  familiar: "Familiar",
  portaria: "Portaria",
  vizinho: "Vizinho",
};

// Página pública que o entregador abre pelo QR code do comprovante — sem
// senha, então só devolve o mínimo necessário para ele conferir que é o
// pedido certo antes de confirmar (nome, endereço, telefone já estão
// impressos no papel que ele tem em mãos; nada aqui vaza dado que ele não
// tivesse de outra forma).
// Devolve `{ found: false }` em vez de lançar erro quando o pedido não
// existe — testado ao vivo que uma server function chamada via useServerFn +
// useQuery não propaga o erro lançado como `error` do lado do cliente (o
// resultado chega undefined, sem estado de loading nem de erro). Um
// discriminador explícito no retorno evita depender desse comportamento.
export const getOrderForDeliveryConfirmation = createServerFn({ method: "POST" })
  .inputValidator((data: { orderNumber: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orderNumber = data.orderNumber?.trim();
    if (!orderNumber) return { found: false as const };

    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select(
        "order_number,customer_name,delivery_type,delivery_address,delivered_confirmed_at,delivered_received_by,delivered_received_type",
      )
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (error || !row) return { found: false as const };

    return {
      found: true as const,
      orderNumber: row.order_number as string,
      customerName: row.customer_name as string,
      deliveryType: row.delivery_type as string,
      deliveryAddress: row.delivery_address as Record<string, string> | null,
      confirmed: Boolean(row.delivered_confirmed_at),
      confirmedAt: row.delivered_confirmed_at as string | null,
      receivedBy: row.delivered_received_by as string | null,
      receivedTypeLabel: row.delivered_received_type
        ? (RECEIVED_TYPE_LABELS[row.delivered_received_type as string] ?? null)
        : null,
    };
  });

export const confirmDelivery = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { orderNumber: string; receivedBy: string; receivedType: string }) => data,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const orderNumber = data.orderNumber?.trim();
    const receivedBy = data.receivedBy?.trim();
    const receivedType = data.receivedType?.trim();

    if (!orderNumber) throw new Error("Pedido inválido");
    if (!receivedBy) throw new Error("Informe o nome de quem recebeu");
    if (!RECEIVED_TYPE_LABELS[receivedType]) throw new Error("Selecione quem recebeu o pedido");

    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("delivered_confirmed_at")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (existing?.delivered_confirmed_at) throw new Error("Esta entrega já foi confirmada");

    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update({
        delivered_confirmed_at: new Date().toISOString(),
        delivered_received_by: receivedBy.slice(0, 200),
        delivered_received_type: receivedType,
        status: "entregue",
      })
      .eq("order_number", orderNumber)
      .select("order_number")
      .maybeSingle();
    if (error) throw new Error("Não foi possível confirmar a entrega");
    if (!row) throw new Error("Pedido não encontrado");

    return { ok: true };
  });
