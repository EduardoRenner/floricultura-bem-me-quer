import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { OCCASIONS } from "@/lib/occasions";

export function OccasionsHomeSection() {
  return (
    <section className="border-y border-gold/20 bg-surface-deep py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-7 flex flex-col gap-2 md:mb-9 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-[1.75rem] leading-tight text-accent md:text-4xl">
              Qual é a ocasião?
            </h2>
            <p className="mt-1.5 text-sm text-foreground/70 md:text-base">
              A gente monta o arranjo certo para o momento
            </p>
          </div>
          <Link
            to="/ocasioes"
            className="hidden items-center gap-1.5 text-sm text-accent hover:underline md:inline-flex"
          >
            Ver todas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Chips em vez de cards: são atalhos de navegação, não conteúdo.
            Os cards de 6 colunas com ícone e descrição ocupavam 2 telas no
            celular e competiam visualmente com os produtos. */}
        <div className="flex flex-wrap gap-2 md:gap-2.5">
          {OCCASIONS.map((o) => (
            <Link
              key={o.id}
              to="/ocasioes"
              search={{ filter: o.id }}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <o.icon
                className="h-4 w-4 text-accent transition-transform group-hover:scale-110"
                strokeWidth={1.5}
              />
              {o.name}
            </Link>
          ))}
        </div>

        <Link
          to="/ocasioes"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent hover:underline md:hidden"
        >
          Ver todas as ocasiões <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
