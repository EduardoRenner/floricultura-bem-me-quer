import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/#produtos", label: "Produtos" },
  { to: "/ocasioes", label: "Ocasiões" },
  { to: "/#sobre", label: "Sobre" },
  { to: "/#horarios", label: "Horários" },
  { to: "/#contato", label: "Contato" },
];

export function SiteHeader() {
  const { count, setOpen } = useCart();
  const [mobile, setMobile] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gold bg-background/95 backdrop-blur-md" style={{ borderBottomColor: "#94833F" }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo-bmq.jpg"
            alt="Floricultura Bem Me Quer"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
            style={{ border: "2px solid #CBB275" }}
          />
          <div className="leading-tight">
            <div className="font-display text-[18px] uppercase tracking-[0.15em] text-accent">
              Bem Me Quer
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Floricultura
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a
              key={n.to}
              href={n.to}
              className="nav-link text-sm font-medium text-foreground/90 transition-colors hover:text-accent"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="relative border-gold bg-transparent text-accent hover:bg-accent hover:text-accent-foreground"
            style={{ borderColor: "#94833F" }}
            onClick={() => setOpen(true)}
            aria-label="Abrir carrinho"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {count > 0 && (
              <span className="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                {count}
              </span>
            )}
          </Button>
          <button
            className="grid h-9 w-9 place-items-center rounded-md border border-border md:hidden"
            onClick={() => setMobile((v) => !v)}
            aria-label="Menu"
          >
            {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="border-t border-border/50 bg-background md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-3">
            {NAV.map((n) => (
              <a
                key={n.to}
                href={n.to}
                onClick={() => setMobile(false)}
                className="py-2 text-sm font-medium text-foreground/80"
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
