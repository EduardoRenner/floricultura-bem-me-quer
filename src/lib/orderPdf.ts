import { jsPDF, GState } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { ADDRESS, formatBRL } from "@/lib/shop";
import { LOGO_DATA_URL } from "@/lib/logoDataUrl";

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
  // Quem compra/envia o presente — nunca quem recebe.
  customerName: string;
  customerPhone: string;
  // Quem recebe o presente. Pedidos antigos (antes de 2026-08-08) não têm
  // este campo gravado separadamente — cai no fallback para customerName em
  // quem consome (ver orderPdf.server.ts / order.functions.ts).
  recipientName: string;
  recipientPhone?: string | null;
  referencePoint?: string | null;
  // Pedidos a partir de 2026-08-02 gravam instrução de entrega e mensagem do
  // cartão em campos separados. Pedidos antigos só têm `notes` (o campo único
  // de antes) — mostrado como estava, sem tentar separar retroativamente.
  notes: string | null;
  deliveryInstructions?: string | null;
  cardMessage?: string | null;
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

export function cardPdfFileName(order: Pick<OrderPdfData, "orderNumber" | "recipientName">): string {
  const nome = slug(order.recipientName) || "cliente";
  return `Cartao-${order.orderNumber}-${nome}.pdf`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

const PAGE_WIDTH = 210; // A4 em mm
const MARGIN_X = 15;

export type GenerateOrderPdfOptions = {
  // Origem usada para montar o link do QR code de confirmação de entrega
  // (a logo agora é embutida — ver logoDataUrl.ts — e não depende disto).
  // No navegador, o padrão é `window.location.origin`; rodando no servidor é
  // obrigatório informar (ver orderPdf.server.ts).
  baseUrl?: string;
};

export async function generateOrderPdf(
  order: OrderPdfData,
  opts: GenerateOrderPdfOptions = {},
): Promise<jsPDF> {
  const baseUrl = opts.baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 15;

  // ---- Cabeçalho: logo + nome da loja + timestamp de geração ----
  const textX = MARGIN_X + 24;
  try {
    doc.addImage(LOGO_DATA_URL, "PNG", MARGIN_X, y - 3, 20, 20);
  } catch {
    // logo embutida corrompida (não deveria acontecer) — segue sem ela.
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
  // Comprador (quem envia) e destinatário (quem recebe) são pessoas
  // diferentes na maioria dos pedidos — cada nome no seu campo, sem misturar.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Cliente", MARGIN_X, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Enviado por: ${order.customerName || "—"}`, MARGIN_X, y);
  y += 5.5;
  doc.text(`Telefone de quem envia: ${order.customerPhone || "—"}`, MARGIN_X, y);
  y += 5.5;
  doc.setFont("helvetica", "bold");
  doc.text(`Destinatário: ${order.recipientName || "—"}`, MARGIN_X, y);
  y += 5.5;
  doc.setFont("helvetica", "normal");
  if (order.recipientPhone?.trim()) {
    doc.text(`Telefone de quem recebe: ${order.recipientPhone}`, MARGIN_X, y);
    y += 5.5;
  }

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
      if (order.referencePoint?.trim()) {
        doc.text(`Ponto de referência: ${order.referencePoint}`, MARGIN_X, y);
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

  if (order.deliveryInstructions?.trim()) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Instruções de entrega:", MARGIN_X, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    const largura = PAGE_WIDTH - MARGIN_X * 2;
    const linhasInstr = doc.splitTextToSize(order.deliveryInstructions, largura) as string[];
    doc.text(linhasInstr, MARGIN_X, y);
    y += linhasInstr.length * 5.5;
  }

  // Pedido antigo (anterior à separação de campos): mostra o texto único como
  // estava, sem tentar decidir o que era instrução e o que era cartão.
  if (!order.deliveryInstructions?.trim() && !order.cardMessage?.trim() && order.notes?.trim()) {
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

  // A mensagem do cartão vira um PDF separado (generateCardPdf) — este
  // comprovante mostra valor pago e dados do comprador/destinatário, e não
  // pode ser o mesmo arquivo que acompanha o presente até o destinatário.

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
  y += 4;

  await addDeliveryConfirmationBlock(doc, order, y, baseUrl);

  return doc;
}

const QR_SIZE = 28; // mm

/**
 * Bloco "COMPROVANTE DE ENTREGA": dados de quem recebe + canhoto de
 * confirmação (data/hora, nome, assinatura, checkboxes) + QR code que abre
 * `/confirmar-entrega/{numero}` — o entregador confirma pelo celular, sem
 * precisar de painel admin nem de um número de WhatsApp externo.
 */
async function addDeliveryConfirmationBlock(
  doc: jsPDF,
  order: OrderPdfData,
  startY: number,
  baseUrl: string,
): Promise<void> {
  const largura = PAGE_WIDTH - MARGIN_X * 2;
  // Reserva ~70mm para o bloco inteiro; se não couber no que resta da
  // página, começa uma nova em vez de partir o comprovante ao meio.
  let y = startY;
  if (y > 227) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(150);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_X, y, largura, 68);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("COMPROVANTE DE ENTREGA", MARGIN_X + 5, y + 8);
  doc.setDrawColor(180);
  doc.line(MARGIN_X + 5, y + 10, PAGE_WIDTH - MARGIN_X - 5, y + 10);

  const textX = MARGIN_X + 5;
  const qrX = PAGE_WIDTH - MARGIN_X - 5 - QR_SIZE;
  let ty = y + 17;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Destinatário: ${order.recipientName || "—"}`, textX, ty);
  ty += 5.5;

  if (order.deliveryType === "delivery" && order.deliveryAddress) {
    const a = order.deliveryAddress;
    const ruaNumero = [a.rua, a.numero].filter(Boolean).join(", ");
    const linha = [ruaNumero, a.bairro].filter(Boolean).join(" - ");
    const linhasEndereco = doc.splitTextToSize(
      `Endereço: ${linha || "—"}`,
      largura - QR_SIZE - 15,
    ) as string[];
    doc.text(linhasEndereco, textX, ty);
    ty += linhasEndereco.length * 5.5;
    if (order.referencePoint?.trim()) {
      const linhasRef = doc.splitTextToSize(
        `Referência: ${order.referencePoint}`,
        largura - QR_SIZE - 15,
      ) as string[];
      doc.text(linhasRef, textX, ty);
      ty += linhasRef.length * 5.5;
    }
  } else {
    doc.text(`Retirada na loja — ${ADDRESS}`, textX, ty);
    ty += 5.5;
  }

  doc.text(
    `Telefone: ${order.recipientPhone?.trim() || order.customerPhone || "—"} (ligar somente se necessário)`,
    textX,
    ty,
  );
  ty += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Data/hora da entrega: _____/_____/________  às  _______", textX, ty);
  ty += 7;
  doc.text("Nome legível de quem recebeu: ____________________________________", textX, ty);
  ty += 9;

  const checkboxes: Array<[string, number]> = [
    ["Em mãos", textX],
    ["Familiar", textX + 35],
    ["Portaria", textX + 70],
    ["Vizinho", textX + 105],
  ];
  for (const [label, cx] of checkboxes) {
    doc.rect(cx, ty - 3.5, 3.5, 3.5);
    doc.text(label, cx + 5, ty);
  }
  ty += 10;

  doc.text("Assinatura: ________________________________________", textX, ty);

  // ---- QR code: abre a página de confirmação de entrega ----
  try {
    if (!baseUrl) throw new Error("sem baseUrl");
    const confirmUrl = `${baseUrl}/confirmar-entrega/${encodeURIComponent(order.orderNumber)}`;
    const qrDataUrl = await QRCode.toDataURL(confirmUrl, { margin: 0, width: 256 });
    doc.addImage(qrDataUrl, "PNG", qrX, y + 15, QR_SIZE, QR_SIZE);
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("Confirmar entrega", qrX + QR_SIZE / 2, y + 15 + QR_SIZE + 4, { align: "center" });
    doc.setTextColor(0);
  } catch {
    // QR não gerado (ex.: sem baseUrl disponível) — comprovante segue
    // funcional só com o canhoto de assinatura manual.
  }
}

// Paleta do cartão — mesmo tom dourado/creme do bloco de destaque que já
// existia no comprovante, para manter a identidade visual da loja.
const CARD_GOLD_DARK: [number, number, number] = [120, 90, 40];
const CARD_GOLD: [number, number, number] = [200, 170, 120];
const CARD_CREAM: [number, number, number] = [253, 250, 244];

/**
 * Gera o cartão de mensagem: PDF 2, o que acompanha o presente e pode ser
 * visto pelo destinatário. Por isso não pode ter NENHUM valor monetário nem
 * dado do comprador além do nome, usado só como assinatura da mensagem — sem
 * telefone, endereço ou forma de pagamento.
 *
 * Layout de cartão (moldura + emblema de flor + tipografia serifada), não de
 * comprovante: é o que vai junto do buquê até quem recebe.
 */
export async function generateCardPdf(order: OrderPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageHeight = 297;
  const frameMargin = 18;
  const frameW = PAGE_WIDTH - frameMargin * 2;
  const frameH = pageHeight - frameMargin * 2;
  const centerX = PAGE_WIDTH / 2;

  // ---- Moldura do cartão: fundo creme + borda dourada dupla ----
  doc.setFillColor(...CARD_CREAM);
  doc.roundedRect(frameMargin, frameMargin, frameW, frameH, 4, 4, "F");
  doc.setDrawColor(...CARD_GOLD);
  doc.setLineWidth(0.6);
  doc.roundedRect(frameMargin, frameMargin, frameW, frameH, 4, 4, "S");
  doc.setLineWidth(0.2);
  doc.roundedRect(frameMargin + 3, frameMargin + 3, frameW - 6, frameH - 6, 3, 3, "S");

  // Sem logo nem emblema decorativo aqui em cima — pedido direto da dona: a
  // logo não fica no início do cartão. A moldura dourada já dá o acabamento;
  // o nome da loja abre o cartão sozinho. A logo de verdade só aparece como
  // marca d'água no rodapé, junto do trevo (ver mais abaixo).
  let y = frameMargin + 26;

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...CARD_GOLD_DARK);
  doc.text("Floricultura Bem Me Quer", centerX, y, { align: "center" });
  y += 11;

  doc.setDrawColor(...CARD_GOLD);
  doc.setLineWidth(0.3);
  doc.line(centerX - 22, y, centerX + 22, y);
  y += 14;

  // Cabeçalho (emblema + nome da loja) fica fixo perto do topo; o bloco
  // pessoal (destinatário + mensagem + assinatura) é centralizado no espaço
  // que sobra até o rodapé — assim nem cola tudo em cima nem sobra um vão
  // vazio gigante no meio, seja a mensagem curta ou longa.
  const mensagem = order.cardMessage?.trim() || "—";
  const linhasMensagem = doc.splitTextToSize(mensagem, frameW - 30) as string[];
  const lineHeight = 8.5;
  const mensagemH = linhasMensagem.length * lineHeight;

  const nameBlockH = order.recipientName?.trim() ? 7 + 12 : 0;
  const signatureBlockH = order.customerName?.trim() ? 16 + 6 : 0;
  const contentH = nameBlockH + mensagemH + signatureBlockH;

  const contentTop = y;
  // Reserva mais espaço no rodapé que antes (26mm) porque agora tem a frase
  // da marca + os dois ícones (trevo + logo), não só o emblema de flor.
  const bottomLimit = frameMargin + frameH - 36;
  const freeSpace = bottomLimit - contentTop;
  if (freeSpace > contentH) y += (freeSpace - contentH) / 2;

  if (order.recipientName?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text("PARA", centerX, y, { align: "center" });
    y += 7;
    doc.setFont("times", "bold");
    doc.setFontSize(17);
    doc.setTextColor(40);
    doc.text(order.recipientName, centerX, y, { align: "center" });
    y += 12;
  }

  doc.setFont("times", "italic");
  doc.setFontSize(15);
  doc.setTextColor(50);
  doc.text(linhasMensagem, centerX, y, { align: "center" });
  y += mensagemH;

  if (order.customerName?.trim()) {
    const signatureY = y + 16;
    doc.setDrawColor(...CARD_GOLD);
    doc.setLineWidth(0.2);
    doc.line(centerX - 15, signatureY - 6, centerX + 15, signatureY - 6);
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(`Com carinho, ${order.customerName}`, centerX, signatureY, { align: "center" });
  }

  // ---- Rodapé: frase da marca + logo, sozinha, como marca d'água ----
  // Só a logo da Bem Me Quer — nada mais ao lado dela. O raminho de trevos
  // que ficava aqui é uma foto de estoque, sem relação com a marca; competia
  // com a logo e lia como um segundo emblema.
  const footerQuoteY = frameMargin + frameH - 22;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...CARD_GOLD_DARK);
  doc.text('"Sempre encontre motivos para tudo o que for estar vivendo..."', centerX, footerQuoteY, {
    align: "center",
    maxWidth: frameW - 20,
  });

  const iconSize = 14;
  const iconY = footerQuoteY + 5;
  try {
    // Opacidade reduzida é o que faz a logo ler como assinatura discreta no
    // rodapé, marca d'água, em vez de um carimbo cheio repetido.
    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.35 }));
    doc.addImage(LOGO_DATA_URL, "PNG", centerX - iconSize / 2, iconY, iconSize, iconSize);
    doc.restoreGraphicsState();
  } catch {
    // logo embutida corrompida (não deveria acontecer) — segue sem ela.
  }

  doc.setTextColor(0);
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

/** Mesmo comportamento de `printOrderPdf`, para o cartão de mensagem (PDF 2). */
export async function printCardPdf(
  order: OrderPdfData,
  preview: Window | null,
): Promise<void> {
  try {
    const doc = await generateCardPdf(order);
    doc.save(cardPdfFileName(order));
    const blobUrl = doc.output("bloburl") as unknown as string;
    if (preview) preview.location.href = blobUrl;
  } catch (err) {
    preview?.close();
    throw err;
  }
}
