import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ADDRESS, formatBRL } from "@/lib/shop";

// Gera o PDF de um pedido pronto para impressão. Roda inteiramente no
// navegador (a única tela que usa isto é o painel admin), então não precisa
// de nenhuma dependência de servidor — é um botão que baixa e abre um
// arquivo local a partir de dados que já estão na tela.

export type OrderPdfItem = { name: string; quantity: number; price: number };

export type OrderPdfData = {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  deliveryType: "delivery" | "pickup" | string;
  deliveryAddress: Record<string, string> | null;
  customerName: string;
  customerPhone: string;
  notes: string | null;
  items: OrderPdfItem[];
  total: number;
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_preparo: "Em preparo",
  saiu_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const PAYMENT_LABEL: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
};

// Mesmo critério usado em adminStats (admin.functions.ts) para separar a taxa
// de entrega dos produtos de verdade: ela entra nos itens do pedido para o
// trigger do banco somar o total certo, mas não é um produto vendido.
const DELIVERY_FEE_NAME = "taxa de entrega";

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (NFD separa letra + marca)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function orderPdfFileName(order: Pick<OrderPdfData, "orderNumber" | "customerName">): string {
  const nome = slug(order.customerName) || "cliente";
  return `Pedido-${order.orderNumber}-${nome}.pdf`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/**
 * Busca a logo e devolve como data URL. `null` se não existir ou falhar —
 * o PDF sai sem logo em vez de quebrar (item 7 do pedido: tratar dado ausente).
 */
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/logo-bmq.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const PAGE_WIDTH = 210; // A4 em mm
const MARGIN_X = 15;

export async function generateOrderPdf(order: OrderPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 15;

  // ---- Cabeçalho: logo + nome da loja + timestamp de geração ----
  const logo = await loadLogoDataUrl();
  const textX = logo ? MARGIN_X + 24 : MARGIN_X;
  if (logo) {
    try {
      doc.addImage(logo, "PNG", MARGIN_X, y - 3, 20, 20);
    } catch {
      // arquivo existe mas não é um PNG decodificável — segue sem logo.
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Floricultura Bem Me Quer", textX, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`PDF gerado em ${formatDateTime(new Date().toISOString())}`, textX, y + 10);
  doc.setTextColor(0);
  y += 22;

  doc.setDrawColor(180);
  doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
  y += 8;

  // ---- Dados do pedido ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Pedido ${order.orderNumber}`, MARGIN_X, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const linhasPedido = [
    `Data do pedido: ${formatDateTime(order.createdAt)}`,
    `Status: ${STATUS_LABEL[order.status] ?? order.status}`,
    `Forma de pagamento: ${PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}`,
    `Entrega: ${order.deliveryType === "delivery" ? "Entrega" : "Retirada na loja"}`,
  ];
  for (const linha of linhasPedido) {
    doc.text(linha, MARGIN_X, y);
    y += 5.5;
  }
  y += 3;

  // ---- Cliente ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Cliente", MARGIN_X, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nome: ${order.customerName || "—"}`, MARGIN_X, y);
  y += 5.5;
  doc.text(`Telefone: ${order.customerPhone || "—"}`, MARGIN_X, y);
  y += 5.5;

  if (order.deliveryType === "delivery") {
    const a = order.deliveryAddress;
    if (a) {
      const ruaNumero = [a.rua, a.numero].filter(Boolean).join(", ");
      if (ruaNumero) {
        doc.text(`Endereço: ${ruaNumero}`, MARGIN_X, y);
        y += 5.5;
      }
      if (a.complemento) {
        doc.text(`Complemento: ${a.complemento}`, MARGIN_X, y);
        y += 5.5;
      }
      if (a.bairro) {
        doc.text(`Bairro: ${a.bairro}`, MARGIN_X, y);
        y += 5.5;
      }
      // A loja atende só Maravilha - SC hoje; não há campo de cidade
      // separado no formulário de checkout porque não faz falta ainda.
      doc.text(`Cidade: Maravilha - SC`, MARGIN_X, y);
      y += 5.5;
      if (a.cep) {
        doc.text(`CEP: ${a.cep}`, MARGIN_X, y);
        y += 5.5;
      }
    } else {
      doc.text("Endereço não informado", MARGIN_X, y);
      y += 5.5;
    }
  } else {
    doc.text(`Retirada na loja — ${ADDRESS}`, MARGIN_X, y);
    y += 5.5;
  }

  if (order.notes?.trim()) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Observações do cliente:", MARGIN_X, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    const largura = PAGE_WIDTH - MARGIN_X * 2;
    const linhasObs = doc.splitTextToSize(order.notes, largura) as string[];
    doc.text(linhasObs, MARGIN_X, y);
    y += linhasObs.length * 5.5;
  }

  y += 4;

  // ---- Produtos ----
  // A taxa de entrega mora nos itens (o trigger do banco soma tudo em items
  // para calcular o total), mas no PDF ela é uma linha do resumo, não um
  // produto vendido — mesmo tratamento que o dashboard já dá a ela.
  const produtos = order.items.filter(
    (i) => i.name.trim().toLowerCase() !== DELIVERY_FEE_NAME,
  );
  const itemTaxa = order.items.find(
    (i) => i.name.trim().toLowerCase() === DELIVERY_FEE_NAME,
  );
  const subtotal = produtos.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxaEntrega = itemTaxa?.price ?? 0;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_X, right: MARGIN_X },
    head: [["Produto", "Qtd.", "Preço unit.", "Subtotal"]],
    body: produtos.length
      ? produtos.map((i) => [
          i.name,
          String(i.quantity),
          formatBRL(i.price),
          formatBRL(i.price * i.quantity),
        ])
      : [["Nenhum produto registrado neste pedido", "", "", ""]],
    styles: { fontSize: 9, textColor: 20, lineColor: 200, lineWidth: 0.1 },
    headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right", cellWidth: 18 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 30 },
    },
    theme: "grid",
  });

  // A tipagem do plugin declara o doc como `any`; `lastAutoTable` é um efeito
  // colateral em runtime que os tipos não modelam.
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ---- Totais ----
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  const totalsLabelX = PAGE_WIDTH - MARGIN_X - 55;
  const totalsValueX = PAGE_WIDTH - MARGIN_X;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Subtotal:", totalsLabelX, y);
  doc.text(formatBRL(subtotal), totalsValueX, y, { align: "right" });
  y += 6;

  if (taxaEntrega > 0) {
    doc.text("Taxa de entrega:", totalsLabelX, y);
    doc.text(formatBRL(taxaEntrega), totalsValueX, y, { align: "right" });
    y += 6;
  }

  doc.setDrawColor(180);
  doc.line(totalsLabelX, y - 2, totalsValueX, y - 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Total:", totalsLabelX, y + 4);
  doc.text(formatBRL(order.total), totalsValueX, y + 4, { align: "right" });

  return doc;
}

/**
 * Gera o PDF, baixa automaticamente com o nome padronizado e abre a
 * pré-visualização numa aba nova (o visualizador nativo do navegador já tem
 * botão de imprimir e de salvar).
 *
 * `preview` é uma janela JÁ ABERTA (via `window.open("", "_blank")`) que o
 * chamador precisa criar de forma síncrona, na mesma pilha de chamada do
 * clique — inclusive antes de um `import()` dinâmico deste módulo, que já é
 * assíncrono o bastante para o navegador deixar de reconhecer o gesto do
 * usuário e bloquear o pop-up. Esta função só aponta a URL quando o PDF fica
 * pronto; não pode ser ela a abrir a aba.
 */
export async function printOrderPdf(
  order: OrderPdfData,
  preview: Window | null,
): Promise<void> {
  try {
    const doc = await generateOrderPdf(order);
    doc.save(orderPdfFileName(order));
    const blobUrl = doc.output("bloburl") as unknown as string;
    if (preview) preview.location.href = blobUrl;
  } catch (err) {
    preview?.close();
    throw err;
  }
}
