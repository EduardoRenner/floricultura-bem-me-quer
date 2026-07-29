import { createServerFn } from "@tanstack/react-start";
import {
  ENTREGA_PADRAO,
  HORARIOS_PADRAO,
  estaAbertoAgora,
  statusEntrega,
  type DeliveryConfig,
  type DeliveryStatus,
  type DiaHorario,
} from "@/lib/delivery";

export type PublicSettings = {
  horarios: DiaHorario[];
  entrega: DeliveryConfig;
  abertoAgora: boolean;
  /** Já calculado aqui: o servidor é a fonte de verdade do "agora". */
  status: DeliveryStatus;
  taxaEntrega: number;
};

/** Sanitiza o JSON vindo do banco — se alguém salvar lixo, o site não quebra. */
function lerHorarios(valor: unknown): DiaHorario[] {
  if (!Array.isArray(valor)) return HORARIOS_PADRAO;
  const limpos: DiaHorario[] = [];
  for (const item of valor) {
    const dia = Number((item as DiaHorario)?.dia);
    const faixas = (item as DiaHorario)?.faixas;
    if (!Number.isInteger(dia) || dia < 0 || dia > 6 || !Array.isArray(faixas)) continue;
    limpos.push({
      dia,
      faixas: faixas
        .filter(
          (f) => Array.isArray(f) && f.length === 2 && typeof f[0] === "string" && typeof f[1] === "string",
        )
        .map((f) => [String(f[0]), String(f[1])] as [string, string]),
    });
  }
  return limpos.length ? limpos : HORARIOS_PADRAO;
}

/**
 * Configurações públicas da loja + o prazo de entrega já resolvido.
 *
 * O cálculo do prazo sai daqui em vez de ir para o navegador porque o relógio
 * do cliente pode estar errado ou em outro fuso — e o texto é uma promessa
 * comercial, não pode depender disso.
 */
export const getPublicSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSettings> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("key,value")
      .eq("is_public", true);
    if (error) throw new Error("Não foi possível carregar as configurações da loja");

    const mapa = new Map((data ?? []).map((r) => [r.key, r.value as unknown]));

    const horarios = lerHorarios(mapa.get("business_hours"));

    const cutoff = mapa.get("delivery_cutoff");
    const note = mapa.get("delivery_note");
    const entrega: DeliveryConfig = {
      sameDay: mapa.get("delivery_same_day") !== false,
      cutoff: typeof cutoff === "string" && cutoff ? cutoff : ENTREGA_PADRAO.cutoff,
      note: typeof note === "string" ? note : "",
    };

    // O admin pode forçar aberto/fechado independente do horário (feriado,
    // imprevisto). `null` = seguir o horário normal.
    const override = mapa.get("shop_open_override");
    const abertoAgora =
      typeof override === "boolean" ? override : estaAbertoAgora(horarios);

    const taxa = Number(mapa.get("delivery_fee"));

    // Só um fechamento FORÇADO pelo admin cancela a promessa de hoje.
    // Estar fechado agora não basta: no intervalo de almoço a loja reabre às
    // 13h e ainda entrega no mesmo dia — quem decide isso é o horário de
    // corte, que statusEntrega já avalia.
    const forcadoFechado = override === false;

    return {
      horarios,
      entrega,
      abertoAgora,
      status: statusEntrega(
        forcadoFechado ? { ...entrega, sameDay: false } : entrega,
        horarios,
      ),
      taxaEntrega: Number.isFinite(taxa) && taxa >= 0 ? taxa : 15,
    };
  },
);
