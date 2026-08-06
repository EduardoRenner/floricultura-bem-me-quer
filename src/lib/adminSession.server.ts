// Token de sessão do admin: assinado com HMAC, sem estado no banco.
//
// Antes disso, o painel guardava a SENHA de verdade no sessionStorage do
// navegador e reenviava ela em toda chamada (listar pedidos, trocar status,
// subir imagem...). Qualquer XSS ou log de rede expunha a senha real, não
// uma credencial descartável. Agora só a senha de login passa em texto —
// depois disso, o cliente guarda e reenvia este token, que não abre nada
// sozinho fora do prazo de validade e não serve pra deduzir a senha.
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 24 * 60 * 60 * 1000; // 24h — turno de trabalho generoso, não é sessão vitalícia

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET não configurado. Configure essa variável de ambiente na Vercel.",
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(): string {
  const expiresAt = String(Date.now() + TTL_MS);
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function verifySessionToken(token: unknown): boolean {
  if (typeof token !== "string" || token.length === 0 || token.length > 200) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return false;

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  // Comparação em tempo constante: evita vazar quanto do HMAC bateu por timing.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
