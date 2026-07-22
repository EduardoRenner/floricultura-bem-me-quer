import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "@/lib/cart";
import { CartSheet } from "@/components/site/CartSheet";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { CinematicIntro } from "@/components/site/CinematicIntro";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 font-display text-2xl text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não conseguimos carregar essa página. Tente novamente ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Floricultura Bem Me Quer — Flores em Maravilha, SC" },
      {
        name: "description",
        content:
          "Arranjos florais artesanais, buquês de rosas e presentes em Maravilha, SC. Entrega local e atendimento acolhedor.",
      },
      { name: "author", content: "Floricultura Bem Me Quer" },
      { property: "og:title", content: "Floricultura Bem Me Quer — Flores em Maravilha, SC" },
      {
        property: "og:description",
        content: "Arranjos florais artesanais, buquês de rosas e presentes em Maravilha, SC. Entrega local e atendimento acolhedor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Floricultura Bem Me Quer — Flores em Maravilha, SC" },
      { name: "twitter:description", content: "Arranjos florais artesanais, buquês de rosas e presentes em Maravilha, SC. Entrega local e atendimento acolhedor." },
      // NOTE: para o preview em redes sociais renderizar, o ideal é uma URL ABSOLUTA
      // (ex.: https://SEU-DOMINIO/logo-bmq.jpg). Caminho relativo funciona no site,
      // mas alguns crawlers (Facebook/WhatsApp) exigem absoluto.
      { property: "og:image", content: "/logo-bmq.jpg" },
      { name: "twitter:image", content: "/logo-bmq.jpg" },
    ],
    links: [
      { rel: "icon", type: "image/jpeg", href: "/logo-bmq.jpg" },
      { rel: "apple-touch-icon", href: "/logo-bmq.jpg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <CinematicIntro />
        <Outlet />
        <CartSheet />
        <WhatsAppFab />
        <Toaster position="top-right" richColors />
      </CartProvider>
    </QueryClientProvider>
  );
}
