// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Carrega as variáveis SEM prefixo do .env para dentro de process.env.
//
// Por que isso é necessário: o wrapper do Lovable só faz loadEnv(..., "VITE_"),
// ou seja, só variáveis VITE_* são lidas do .env. As de servidor
// (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) nunca chegam em process.env.
// Dentro do Lovable Cloud isso não dá problema porque a plataforma injeta
// essas variáveis como env vars reais do runtime — rodando fora do Lovable,
// ninguém injeta, e client.server.ts falha com "Missing Supabase env var".
//
// SEGURANÇA: este arquivo roda só no Node (build/dev), nunca vai para o bundle
// do cliente. As variáveis entram apenas em process.env, lido exclusivamente
// por client.server.ts no servidor. Nada aqui usa `define`, então a
// service_role key continua fora do JS entregue ao browser.
//
// Não sobrescreve o que já existe no ambiente: na Vercel as env vars reais
// da plataforma têm precedência sobre qualquer .env.
for (const [key, value] of Object.entries(loadEnv("", process.cwd(), ""))) {
  if (!key.startsWith("VITE_") && process.env[key] === undefined) {
    process.env[key] = value;
  }
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Alvo de deploy: Vercel. Sem isso o Nitro cai no default `cloudflare-module`
  // e gera wrangler.json em vez de .vercel/output.
  // Dentro do build do Lovable esse override é ignorado (lá o preset é forçado
  // para Cloudflare), então o preview do Lovable continua funcionando.
  nitro: { preset: "vercel" },
});
