import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Accessibility,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flower2,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Store,
  Truck,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listPublicProducts } from "@/lib/products.functions";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ProductCard, type Product } from "@/components/site/ProductCard";
import { OccasionsHomeSection } from "@/components/site/OccasionsGrid";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
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
  productImageUrl,
} from "@/lib/shop";

export const Route = createFileRoute("/")({ component: Home });

const CATEGORIES = ["Todos", "Rosas", "Arranjos", "Presentes", "Plantas"];

// Fotos fixas do hero e da seção "sobre". São produtos reais do catálogo,
// referenciados direto para carregarem junto com o HTML — se dependessem da
// consulta ao banco, a dobra inicial abriria vazia e depois saltaria.
// Se algum dia essas fotos saírem do Cloudinary, trocar as URLs aqui.
const HERO_IMAGE =
  "https://res.cloudinary.com/w7wufhvh/image/upload/f_auto,q_auto/WhatsApp_Image_2026-07-20_at_17.17.14_pklurx";
const ABOUT_IMAGE =
  "https://res.cloudinary.com/w7wufhvh/image/upload/f_auto,q_auto/WhatsApp_Image_2026-07-20_at_17.17.15_1_adjh5y";

// Avaliações reais dos clientes (Google). Média 4,5 em 42 avaliações.
const REVIEWS = [
  {
    text: "A melhor floricultura da cidade. Atendimento de primeira. Recomendo!",
    author: "Felipe Waldow",
    stars: 5,
  },
  {
    text: "Sou de Cascavel, PR. Solicitei um atendimento para presentear uma pessoa na cidade e fui atendida com muita agilidade. O produto foi embalado com muito cuidado.",
    author: "Cliente de Cascavel, PR",
    stars: 5,
  },
  {
    text: "Ótimas opções para presentear pessoas especiais.",
    author: "Marcia Furst",
    stars: 5,
  },
  { text: "Ótimo atendimento.", author: "Zirlene A. Milan Tarso", stars: 5 },
  { text: "Bons produtos.", author: "Mateus Back", stars: 5 },
  { text: "Lindo lugar.", author: "Lili Gabardo", stars: 5 },
  { text: "Amei!", author: "Volmir Gerelli", stars: 5 },
  { text: "Ótimo atendimento.", author: "Luan Dal Savio", stars: 5 },
  { text: "Uma boa floricultura.", author: "Gessi Rezende", stars: 4 },
  { text: "Gostei.", author: "Francielli Gielow", stars: 4 },
];

function Home() {
  const [category, setCategory] = useState("Todos");
  const fetchProducts = useServerFn(listPublicProducts);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const data = await fetchProducts();
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

      {/* HERO — foto real do catálogo, layout assimétrico.
          Saíram daqui a arte ASCII animada e as pétalas flutuantes: efeito
          decorativo competindo com o produto e atrasando o primeiro conteúdo
          útil. Quem chega quer ver flor, não animação. */}
      <section className="relative overflow-hidden" style={{ background: "var(--surface-deep)" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-[1.05fr_1fr] md:gap-12 md:py-20">
          <div className="order-2 md:order-1">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">
              <Flower2 className="h-3.5 w-3.5" /> Maravilha · Santa Catarina
            </span>

            <h1 className="mt-4 font-display text-[2.1rem] leading-[1.1] text-accent sm:text-5xl md:text-[3.4rem]">
              Flores que falam
              <br />
              pelo coração
            </h1>

            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-foreground/85 md:text-base">
              Buquês, arranjos e cestas montados por quem entende de flor. Entregamos em
              Maravilha ou você retira na loja, no centro da cidade.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 px-7"
                onClick={() =>
                  document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Ver o catálogo
              </Button>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full border-accent bg-transparent px-7 text-accent hover:bg-accent hover:text-accent-foreground sm:w-auto"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Pedir no WhatsApp
                </Button>
              </a>
            </div>

            {/* Prova social concreta em vez de selo genérico */}
            <div className="mt-7 flex items-center gap-2.5 text-sm text-foreground/75">
              <span className="flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </span>
              <span>
                <strong className="text-foreground">4,5</strong> em 42 avaliações no Google
              </span>
            </div>
          </div>

          {/* Foto real de produto. Fixa de propósito: carrega junto com o HTML,
              sem esperar a consulta ao catálogo, então não há salto de layout. */}
          <div className="order-1 md:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl md:aspect-[4/4.4]">
              <img
                src={productImageUrl(HERO_IMAGE, 900)}
                alt="Ramalhete de girassóis da Floricultura Bem Me Quer"
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Faixa de confiança — só afirmações verificáveis */}
      <div className="border-y border-gold/25 bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2.5 px-4 py-3.5 text-[13px] text-foreground/80">
          <span className="inline-flex items-center gap-2">
            <Truck className="h-4 w-4 text-accent" /> Entrega em Maravilha
          </span>
          <span className="inline-flex items-center gap-2">
            <Store className="h-4 w-4 text-accent" /> Retirada na loja
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            {openNow ? "Aberto agora" : "Fechado agora"}
          </span>
          <span className="inline-flex items-center gap-2">
            <Accessibility className="h-4 w-4 text-accent" /> Acesso para cadeirantes
          </span>
        </div>
      </div>

      {/* PRODUTOS — logo depois do hero: é o que a pessoa veio ver.
          Antes vinha em 4º lugar, atrás de "Surpreenda-me", ocasiões e sobre. */}
      <section id="produtos" className="relative py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-4">
          {/* Título alinhado à esquerda com as abas à direita: quebra a
              simetria centralizada que se repetia em todas as seções. */}
          <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-[1.75rem] leading-tight md:text-4xl">
                Escolha o presente perfeito
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground md:text-base">
                {products?.length ?? 0} opções disponíveis hoje
              </p>
            </div>
            <AnimatedTabs tabs={CATEGORIES} active={category} onChange={setCategory} />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-96 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Nenhum produto nesta categoria no momento.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* OCASIÕES — depois do catálogo: quem não sabe o que escolher
          navega por motivo, não por categoria de produto. */}
      <OccasionsHomeSection />

      {/* SOBRE — texto curto e concreto no lugar dos três substantivos
          abstratos ("Variedade / Qualidade / Atendimento"), que não diziam
          nada sobre esta loja em específico. */}
      <section id="sobre" className="bg-secondary/25 py-14 md:py-20">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 md:grid-cols-[1fr_1.15fr] md:items-center md:gap-12">
          <div className="overflow-hidden rounded-2xl">
            <img
              src={productImageUrl(ABOUT_IMAGE, 700)}
              alt="Arranjo montado na Floricultura Bem Me Quer"
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-display text-[1.75rem] leading-tight md:text-4xl">
              Uma floricultura de bairro, no centro de Maravilha
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Ficamos na Av. Anita Garibaldi, 266. Cada arranjo sai daqui montado à mão — você
              escolhe pelo site ou manda mensagem, e a gente ajusta cores e tamanho do jeito que
              você precisa.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/80">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" /> Centro de Maravilha
              </span>
              <span className="inline-flex items-center gap-2">
                <Truck className="h-4 w-4 text-accent" /> Entrega na cidade
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* AVALIAÇÕES */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <h2 className="font-display text-[1.75rem] leading-tight md:text-4xl">
            O que dizem quem já comprou
          </h2>
          <div className="inline-flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="font-semibold text-foreground">4,5</span>
            <span className="text-muted-foreground">· 42 avaliações no Google</span>
          </div>
        </div>
        <ReviewsCarousel />
      </section>

      {/* HORARIOS */}
      <section id="horarios" className="bg-secondary/25 py-14 md:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h2 className="font-display text-[1.75rem] leading-tight md:text-4xl">
              Horários de atendimento
            </h2>
            <div className="mt-3">
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
                style={
                  openNow
                    ? { background: "rgba(46,125,50,0.2)", color: "#4ade80", border: "1px solid #2E7D32" }
                    : { background: "rgba(127,29,29,0.25)", color: "#fca5a5", border: "1px solid #7f1d1d" }
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
      <section id="contato" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="mb-8 text-center">
          <h2 className="font-display text-[1.75rem] leading-tight md:text-4xl">
            Venha nos visitar
          </h2>
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

function ReviewsCarousel() {
  const [index, setIndex] = useState(0);
  const count = REVIEWS.length;
  const go = (dir: number) => setIndex((v) => (v + dir + count) % count);
  const r = REVIEWS[index];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Avaliação anterior"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div
          key={index}
          className="review-fade min-h-[210px] flex-1 rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm"
        >
          <div className="flex justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, s) => (
              <Star
                key={s}
                className={
                  "h-4 w-4 " +
                  (s < r.stars ? "fill-primary text-primary" : "text-muted-foreground/40")
                }
              />
            ))}
          </div>
          <p className="mt-5 text-lg leading-relaxed text-foreground/90">“{r.text}”</p>
          <p className="mt-5 text-sm font-medium text-accent">{r.author}</p>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Próxima avaliação"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {REVIEWS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Ir para avaliação ${i + 1}`}
            className="h-2 rounded-full transition-all"
            style={{
              width: i === index ? 22 : 8,
              background: i === index ? "var(--color-accent)" : "var(--color-border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ContactForm() {
  return (
    <form
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const name = String(fd.get("name") ?? "").trim();
        const email = String(fd.get("email") ?? "").trim();
        const message = String(fd.get("message") ?? "").trim();
        if (!name || !message) {
          toast.error("Preencha nome e mensagem.");
          return;
        }
        // Envia a mensagem pelo WhatsApp (mesmo número dos pedidos)
        const text = [
          "*Contato pelo site — Floricultura Bem Me Quer*",
          "",
          `*Nome:* ${name}`,
          email ? `*E-mail:* ${email}` : "",
          "",
          "*Mensagem:*",
          message,
        ]
          .filter((l) => l !== "")
          .join("\n");
        window.open(`${WHATSAPP_URL}?text=${encodeURIComponent(text)}`, "_blank");
        toast.success("Abrindo o WhatsApp para enviar sua mensagem…");
        form.reset();
      }}
    >
      <h3 className="font-display text-xl">Envie uma mensagem</h3>
      <div>
        <label className="mb-1 block text-sm">Nome</label>
        <Input required name="name" placeholder="Seu nome" />
      </div>
      <div>
        <label className="mb-1 block text-sm">E-mail</label>
        <Input type="email" name="email" placeholder="voce@email.com" />
      </div>
      <div>
        <label className="mb-1 block text-sm">Mensagem</label>
        <Textarea required name="message" rows={4} placeholder="Como podemos te ajudar?" />
      </div>
      <Button type="submit" className="w-full">
        <MessageCircle className="mr-2 h-4 w-4" /> Enviar pelo WhatsApp
      </Button>
    </form>
  );
}
