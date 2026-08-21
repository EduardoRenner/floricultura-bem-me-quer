// Estado de sessão do painel, no lado do cliente.
//
// Vive fora de `routes/admin.tsx` porque o painel deixou de ser um arquivo só:
// componentes como o lançamento manual de pedido também precisam do token e do
// mesmo tratamento de sessão expirada. Importar de volta do arquivo de rota
// criaria dependência circular.

// Guarda o TOKEN de sessão (assinado, expira em 24h) — nunca mais a senha
// crua. Ver src/lib/adminSession.server.ts.
export const STORAGE_KEY = "bmq-admin-session";

// Toda query/mutation do painel passa por aqui: se o servidor disser que a
// sessão expirou (token vencido ou nunca existiu), desloga e recarrega em
// vez de deixar a tela presa num erro genérico que não explica o que fazer.
export async function withSession<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Sessão expirada")) {
      sessionStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
    throw err;
  }
}

export type AdminProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  active: boolean;
  occasions: string[];
};
