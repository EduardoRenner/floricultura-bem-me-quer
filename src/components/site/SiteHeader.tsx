import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/#produtos", label: "Produtos" },
  { to: "/#sobre", label: "Sobre" },
  { to: "/#horarios", label: "Horários" },
  { to: "/#contato", label: "Contato" },
];

export function SiteHeader() {
  const { count, setOpen } = useCart();
  const [mobile, setMobile] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-display text-lg">
            B
          </span>
          <div className="leading-tight">
            <div className="font-display text-lg text-foreground">Bem Me Quer</div>
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
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="relative border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => setOpen(true)}
            aria-label="Abrir carrinho"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {count > 0 && (
              <span className="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
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
