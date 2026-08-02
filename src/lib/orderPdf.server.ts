import type { OrderPdfData } from "@/lib/orderPdf";

export const ORDER_PDFS_BUCKET = "order-pdfs";
// Curta duração: o link vai numa mensagem de WhatsApp que pode ser lida dias
// depois, mas o PDF tem endereço e telefone do cliente — não vale a pena
// deixar a URL válida por mais tempo do que o necessário para organizar a
// entrega. 7 dias cobre pedidos programados com data futura.
const SIGNED_EXPIRES_IN = 60 * 60 * 24 * 7;

/**
 * Origem pública do site, usada para buscar a logo e montar o link do QR
 * code de confirmação de entrega dentro do PDF gerado no servidor.
 *
 * Prioriza SITE_URL (configurar no .env / Vercel com o domínio definitivo);
 * cai para as variáveis que a própria Vercel injeta em produção/preview se
 * SITE_URL não estiver definida.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "";
}

/**
 * Gera o PDF do pedido no servidor (mesmo layout do botão manual do admin) e
 * devolve os bytes prontos para subir no Storage. Roda a mesma função de
 * `orderPdf.ts`; a única diferença é a origem usada para buscar a logo e
 * montar a URL do QR code, que aqui vem de `resolveSiteUrl()` em vez de
 * `window.location.origin` (não existe `window` no servidor).
 */
export async function generateOrderPdfBuffer(order: OrderPdfData): Promise<Uint8Array> {
  const { generateOrderPdf } = await import("@/lib/orderPdf");
  const baseUrl = resolveSiteUrl();
  const doc = await generateOrderPdf(order, { baseUrl });
  return doc.output("arraybuffer") as unknown as Uint8Array;
}

/**
 * Gera e salva o PDF do pedido no bucket privado, devolvendo uma signed URL
 * de curta duração para ir na mensagem do WhatsApp. Nunca lança: falha na
 * geração/upload do PDF não pode derrubar a criação do pedido — devolve
 * `null` e quem chamou decide como lidar com a ausência do link.
 */
export async function generateAndStoreOrderPdf(order: OrderPdfData): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buffer = await generateOrderPdfBuffer(order);
    const path = `${order.orderNumber}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(ORDER_PDFS_BUCKET)
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });
    if (uploadError) {
      console.error("Falha ao subir PDF do pedido:", uploadError.message);
      return null;
    }

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(ORDER_PDFS_BUCKET)
      .createSignedUrl(path, SIGNED_EXPIRES_IN);
    if (signError) {
      console.error("Falha ao assinar URL do PDF do pedido:", signError.message);
      return null;
    }
    return signed.signedUrl;
  } catch (err) {
    console.error("Falha ao gerar PDF do pedido:", err);
    return null;
  }
}
