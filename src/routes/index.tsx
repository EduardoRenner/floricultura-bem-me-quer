import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Flower2, Heart, MapPin, Phone, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ProductCard, type Product } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ADDRESS,
  HOURS,
  MAPS_EMBED,
  PHONE_DISPLAY,
  PHONE_TEL,
  WHATSAPP_URL,
  isOpenNow,
} from "@/lib/shop";

export const Route = createFileRoute("/")({ component: Home });

const CATEGORIES = ["Todos", "Rosas", "Arranjos", "Presentes", "Plantas"];

const REVIEWS = [
  {
    text: "Ótimas opções para presentear pessoas especiais.",
    author: "Cliente satisfeito",
    stars: 5,
  },
  {
    text: "A melhor floricultura da cidade. Atendimento de primeira. Recomendo!",
    author: "Cliente fiel",
    stars: 5,
  },
  { text: "Uma boa floricultura", author: "Cliente", stars: 4 },
];

function Home() {
  const [category, setCategory] = useState("Todos");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    if (category === "Todos") return products;
    return products.filter((p) => p.category === category);
  }, [products, category]);

  const openNow = isOpenNow();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
          aria-hidden
        />
        <div className="floral-pattern absolute inset-0 opacity-70" aria-hidden />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center text-primary-foreground md:py-32">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs uppercase tracking-widest backdrop-blur-sm">
            <Flower2 className="h-3.5 w-3.5" /> Maravilha · Santa Catarina
          </span>
          <h1 className="max-w-3xl font-display text-4xl leading-tight md:text-6xl">
            Flores que falam pelo coração
          </h1>
          <p className="max-w-2xl text-base text-white/90 md:text-lg">
            Arranjos artesanais, rosas e presentes florais para cada ocasião especial.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })}
            >
              Ver Produtos
            </Button>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="border-white/70 bg-transparent text-white hover:bg-white/15">
                <Phone className="mr-2 h-4 w-4" /> Falar pelo WhatsApp
              </Button>
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-white/90">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" /> 4.5/5 estrelas
            </span>
            <span>· 📦 Entrega disponível</span>
            <span>· ♿ Acessível</span>
          </div>
        </div>
        {/* petal curve */}
        <svg
          className="absolute inset-x-0 bottom-0 h-16 w-full text-background"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,32 C240,96 480,0 720,32 C960,64 1200,16 1440,48 L1440,80 L0,80 Z"
          />
        </svg>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent">Sobre nós</div>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">Feito com carinho, em Maravilha</h2>
            <p className="mt-4 text-muted-foreground">
              Localizada no coração de Maravilha - SC, a Floricultura Bem Me Quer nasceu do amor pelas
              flores e pelo cuidado com as pessoas. Aqui você encontra arranjos feitos com carinho para
              tornar cada momento especial.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Flower2, title: "Variedade" },
              { icon: Sparkles, title: "Qualidade" },
              { icon: Heart, title: "Atendimento" },
            ].map((it) => (
              <div
                key={it.title}
                className="card-hover flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-5 text-center shadow-sm hover:-translate-y-1"
              >
                <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
                  <it.icon className="h-5 w-5" />
                </div>
                <div className="font-display text-base">{it.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUTOS */}
      <section id="produtos" className="relative bg-secondary/25 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="text-xs uppercase tracking-widest text-accent">Nossos produtos</div>
            <h2 className="font-display text-3xl md:text-4xl">Escolha o presente perfeito</h2>
            <p className="max-w-xl text-muted-foreground">
              Buquês, arranjos e plantas cuidadosamente selecionados para cada ocasião.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={
                    "rounded-full border px-4 py-1.5 text-sm transition " +
                    (category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground/80 hover:border-primary/50 hover:text-primary")
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-96 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Nenhum produto nesta categoria no momento.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="text-xs uppercase tracking-widest text-accent">Avaliações</div>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">O que nossos clientes dizem</h2>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary/60 px-4 py-1.5 text-sm text-foreground">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="font-semibold">4.5</span>
            <span className="text-muted-foreground">média em 42 avaliações</span>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <div
              key={i}
              className="card-hover rounded-2xl border border-border/60 bg-card p-6 shadow-sm hover:-translate-y-1"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className={
                      "h-4 w-4 " + (s < r.stars ? "fill-primary text-primary" : "text-muted-foreground/40")
                    }
                  />
                ))}
              </div>
              <p className="mt-4 text-foreground/90">"{r.text}"</p>
              <p className="mt-3 text-sm text-muted-foreground">— {r.author}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HORARIOS */}
      <section id="horarios" className="bg-secondary/25 py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <div className="text-xs uppercase tracking-widest text-accent">Horários</div>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">Estamos aqui para você</h2>
            <div className="mt-3">
              <span
                className={
                  "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium " +
                  (openNow ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")
                }
              >
                <Clock className="h-3.5 w-3.5" />
                {openNow ? "Aberto agora" : "Fechado agora"}
              </span>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {HOURS.map((h) => (
                <li key={h.label} className="flex items-center justify-between px-6 py-3">
                  <span className="font-medium">{h.label}</span>
                  <span className="text-muted-foreground">{h.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <section id="contato" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-10 text-center">
          <div className="text-xs uppercase tracking-widest text-accent">Contato & Localização</div>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Venha nos visitar</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border/60 shadow-sm">
            <iframe
              title="Mapa Floricultura Bem Me Quer"
              src={MAPS_EMBED}
              width="100%"
              height="360"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-[360px] w-full"
            />
            <div className="space-y-2 bg-card p-6 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <span>{ADDRESS}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href={PHONE_TEL} className="hover:text-primary">
                  {PHONE_DISPLAY}
                </a>
              </div>
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle2 className="h-4 w-4" /> Entrada acessível para cadeirantes
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ContactForm() {
  const [sending, setSending] = useState(false);
  return (
    <form
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setSending(true);
        setTimeout(() => {
          setSending(false);
          toast.success("Mensagem enviada!", {
            description: "Retornaremos em breve. Obrigado pelo contato.",
          });
          (e.target as HTMLFormElement).reset();
        }, 700);
      }}
    >
      <h3 className="font-display text-xl">Envie uma mensagem</h3>
      <div>
        <label className="mb-1 block text-sm">Nome</label>
        <Input required name="name" placeholder="Seu nome" />
      </div>
      <div>
        <label className="mb-1 block text-sm">E-mail</label>
        <Input required type="email" name="email" placeholder="voce@email.com" />
      </div>
      <div>
        <label className="mb-1 block text-sm">Mensagem</label>
        <Textarea required name="message" rows={4} placeholder="Como podemos te ajudar?" />
      </div>
      <Button type="submit" className="w-full" disabled={sending}>
        {sending ? "Enviando…" : "Enviar mensagem"}
      </Button>
    </form>
  );
}
