import { MessageCircle } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/shop";

export function WhatsAppFab() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar pelo WhatsApp"
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg transition hover:scale-105"
      style={{ boxShadow: "0 12px 30px -8px rgba(56,142,60,0.55)" }}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
