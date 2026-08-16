import { createFileRoute } from "@tanstack/react-router";
import { WHATSAPP_URL } from "@/lib/shop";

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [{ title: "Bem Me Quer — Links" }],
  }),
  component: LinksPage,
});

function LinksPage() {
  return (
    <div className="min-h-screen flex justify-center bg-[#faf5ee] px-5 py-14 font-serif text-[#33291f]">
      <main className="w-full max-w-sm">
        <img
          src="/logo-bmq.png"
          alt="Bem Me Quer"
          className="mx-auto mb-5 h-28 w-28 rounded-full object-cover shadow-[0_10px_28px_-12px_rgba(51,41,31,0.25)]"
        />

        <h1 className="text-center text-2xl font-normal">Bem Me Quer</h1>
        <p className="mb-9 text-center font-sans text-[11px] uppercase tracking-[0.12em] text-[#9c8b78]">
          Floricultura &amp; Presentes · Maravilha, SC
        </p>

        <nav className="flex flex-col gap-3">
          <a
            href="/"
            className="flex items-center gap-3.5 rounded-2xl border border-[#ece3d5] bg-white px-5 py-4 shadow-[0_10px_28px_-12px_rgba(51,41,31,0.14)] transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#eef2ea] text-[#4a6b45]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 4v16" />
              </svg>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-sans text-sm font-bold">Veja pelo site com catálogo</span>
              <span className="font-sans text-xs text-[#9c8b78]">flores, buquês e presentes</span>
            </span>
          </a>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3.5 rounded-2xl border border-[#ece3d5] bg-white px-5 py-4 shadow-[0_10px_28px_-12px_rgba(51,41,31,0.14)] transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#25D366] text-white">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor">
                <path d="M16.01 3C9.38 3 4 8.38 4 15.01c0 2.36.66 4.56 1.8 6.44L4 29l7.74-1.75a11.94 11.94 0 0 0 4.27.79C22.64 28.04 28 22.66 28 16.03 28 9.4 22.64 3 16.01 3Zm6.98 17.05c-.3.83-1.5 1.53-2.44 1.73-.65.14-1.5.25-4.36-.94-3.66-1.52-6.01-5.23-6.2-5.47-.18-.24-1.47-1.96-1.47-3.74 0-1.78.93-2.65 1.27-3.02.3-.32.67-.4.9-.4.22 0 .45 0 .64.01.2.01.48-.08.75.57.3.72 1.01 2.5 1.1 2.68.09.18.15.4.03.64-.12.24-.18.39-.36.6-.18.21-.38.47-.54.63-.18.18-.37.38-.16.75.21.37.94 1.55 2.02 2.51 1.39 1.24 2.56 1.62 2.93 1.8.37.18.59.15.81-.09.22-.24.94-1.09 1.19-1.47.25-.37.5-.31.83-.19.34.12 2.15 1.01 2.52 1.2.37.18.61.28.7.43.09.15.09.86-.21 1.69Z" />
              </svg>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-sans text-sm font-bold">Fale conosco no zap</span>
              <span className="font-sans text-xs text-[#9c8b78]">pedidos e dúvidas</span>
            </span>
          </a>
        </nav>

        <footer className="mt-10 text-center font-sans text-[10px] tracking-wide text-[#9c8b78]">
          BEM ME QUER · DESDE SEMPRE COM CARINHO
        </footer>
      </main>
    </div>
  );
}
