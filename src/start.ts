import { createStart, createMiddleware, createCsrfMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Protege os server functions contra CSRF.
//
// Os serverFn sao endpoints RPC same-origin: sem isso, um site qualquer podia
// fazer o navegador da vitima disparar POSTs para /_serverFn/* com os cookies
// dela junto. O caso concreto aqui e `createOrder` — um site hostil poderia
// encher a loja de pedidos falsos usando visitantes como intermediarios.
//
// `filter` limita a checagem aos serverFn de proposito: as requisicoes de
// rota (handlerType 'router') sao navegacao normal de pagina, e validar
// origem nelas quebraria qualquer link para o site vindo de fora (Google,
// WhatsApp, Instagram).
//
// O resto fica no padrao da lib: exige Sec-Fetch-Site: same-origin, cai para
// Origin e depois Referer quando o header nao vem, e recusa (403) quando os
// tres estao ausentes.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  // csrf antes do errorMiddleware: requisicao nao confiavel e recusada antes
  // de qualquer codigo da aplicacao rodar.
  requestMiddleware: [csrfMiddleware, errorMiddleware],
}));
