// WhatsApp: celular (49) 99927-3376 — número que efetivamente recebe mensagens.
export const WHATSAPP_URL = "https://wa.me/554999273376";
// Telefone fixo para ligações (não tem WhatsApp).
export const PHONE_TEL = "tel:+554936640169";
export const PHONE_DISPLAY = "(49) 3664-0169";
export const FACEBOOK_URL = "https://www.facebook.com/floriculturabmq/";
export const INSTAGRAM_URL = "https://www.instagram.com/_bem_me_quer_floricultura/";
export const ADDRESS = "Av. Anita Garibaldi, 266 - Centro, Maravilha - SC, 89874-000";
export const MAPS_EMBED =
  "https://maps.google.com/maps?q=Av.+Anita+Garibaldi,+266,+Centro,+Maravilha,+SC,+89874-000&output=embed";

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function whatsappOrderUrl(orderNumber: string) {
  const msg = encodeURIComponent(`Novo pedido #${orderNumber}`);
  return `${WHATSAPP_URL}?text=${msg}`;
}

export const HOURS = [
  { label: "Segunda-feira", value: "08:00–11:30 / 13:00–18:30", day: 1 },
  { label: "Terça-feira", value: "08:00–11:30 / 13:00–18:30", day: 2 },
  { label: "Quarta-feira", value: "08:00–11:30 / 13:00–18:30", day: 3 },
  { label: "Quinta-feira", value: "08:00–11:30 / 13:00–18:30", day: 4 },
  { label: "Sexta-feira", value: "08:00–11:30 / 13:00–18:30", day: 5 },
  { label: "Sábado", value: "08:00–12:00", day: 6 },
  { label: "Domingo", value: "Fechado", day: 0 },
];

// Returns true if store is currently open based on America/Sao_Paulo time.
export function isOpenNow(now = new Date()): boolean {
  // Convert to Sao Paulo time
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const mins = hour * 60 + minute;
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[wd];
  if (day === 0) return false;
  if (day >= 1 && day <= 5) {
    return (mins >= 8 * 60 && mins <= 11 * 60 + 30) || (mins >= 13 * 60 && mins <= 18 * 60 + 30);
  }
  if (day === 6) return mins >= 8 * 60 && mins <= 12 * 60;
  return false;
}
