import { Facebook, Instagram, MapPin, Phone } from "lucide-react";
import {
  ADDRESS,
  FACEBOOK_URL,
  HOURS,
  INSTAGRAM_URL,
  PHONE_DISPLAY,
  PHONE_TEL,
  WHATSAPP_URL,
} from "@/lib/shop";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t" style={{ background: "#14180C", borderTopColor: "#3E4A2C" }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/logo-bmq.jpg"
              alt="Floricultura Bem Me Quer"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              style={{ border: "2px solid #CBB275" }}
            />
            <div>
              <div className="font-display text-[18px] uppercase tracking-[0.15em] text-accent">Bem Me Quer</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Floricultura
              </div>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm italic text-muted-foreground">
            "Flores que falam pelo coração"
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="grid h-9 w-9 place-items-center rounded-full bg-background text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="grid h-9 w-9 place-items-center rounded-full bg-background text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="grid h-9 w-9 place-items-center rounded-full bg-background text-accent transition hover:bg-accent hover:text-accent-foreground"
            >
              <Phone className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-display text-lg text-foreground">Navegação</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="/#produtos" className="hover:text-primary">Produtos</a></li>
            <li><a href="/#sobre" className="hover:text-primary">Sobre</a></li>
            <li><a href="/#horarios" className="hover:text-primary">Horários</a></li>
            <li><a href="/#contato" className="hover:text-primary">Contato</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg text-foreground">Horários</h4>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>Seg a Sex: 08:00–11:30 / 13:00–18:30</li>
            <li>Sábado: 08:00–12:00</li>
            <li>Domingo: Fechado</li>
          </ul>
          {HOURS.length === 0 && null}
        </div>

        <div>
          <h4 className="font-display text-lg text-foreground">Contato</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{ADDRESS}</li>
            <li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-primary" /><a href={PHONE_TEL} className="hover:text-primary">{PHONE_DISPLAY}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © 2025 Floricultura Bem Me Quer · Maravilha, SC
      </div>
    </footer>
  );
}
