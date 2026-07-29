// Regras de horário e prazo de entrega.
//
// Tudo aqui é função pura: recebe a configuração, os horários e "agora", e
// devolve o texto. Sem acesso a rede e sem estado — dá para testar sozinho e
// é o mesmo cálculo no servidor (SSR) e no cliente.
//
// Por que isso não fica escrito no código: a loja entrega no mesmo dia, mas
// "depende da demanda". Prometer entrega hoje num Dia das Mães lotado gera
// cliente frustrado e avaliação ruim — que é justamente o ativo da loja. Então
// quem liga e desliga a promessa é a loja, pelo painel.

export type Faixa = [string, string];

/** Horário de um dia da semana. `dia`: 0 = domingo … 6 = sábado. */
export type DiaHorario = { dia: number; faixas: Faixa[] };

export type DeliveryConfig = {
  /**
   * Previsão publicada pela loja. Vazio = o site não anuncia prazo nenhum e
   * apenas avisa que o horário é combinado no WhatsApp.
   *
   * Frase livre, escrita por quem atende: "até 1 hora", "ainda hoje",
   * "amanhã pela manhã". Quem sabe o movimento do dia é ela.
   */
  previsao: string;
  /** Observação de área, ex.: "Centro e bairros próximos". */
  note: string;
};

export type DeliveryStatus = {
  /** `combinar` = sem previsão publicada; `previsao` = a loja anunciou uma. */
  kind: "combinar" | "previsao";
  /** Frase completa, para o hero e o checkout. */
  texto: string;
  /** Versão curta, para caber na faixa. */
  curto: string;
};

export const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const DIAS_LONGOS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/** Horários atuais da loja. Usado como fallback se a configuração sumir. */
export const HORARIOS_PADRAO: DiaHorario[] = [
  { dia: 0, faixas: [] },
  { dia: 1, faixas: [["08:00", "11:30"], ["13:00", "18:30"]] },
  { dia: 2, faixas: [["08:00", "11:30"], ["13:00", "18:30"]] },
  { dia: 3, faixas: [["08:00", "11:30"], ["13:00", "18:30"]] },
  { dia: 4, faixas: [["08:00", "11:30"], ["13:00", "18:30"]] },
  { dia: 5, faixas: [["08:00", "11:30"], ["13:00", "18:30"]] },
  { dia: 6, faixas: [["08:00", "12:00"]] },
];

export const ENTREGA_PADRAO: DeliveryConfig = { previsao: "", note: "" };

/** "16:30" -> 990 minutos. Devolve null se o formato não for válido. */
export function minutosDe(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Dia da semana e minutos do dia no fuso de São Paulo.
 *
 * O servidor roda em UTC (Vercel), então ler `getDay()` direto daria o dia
 * errado entre 21h e meia-noite — um pedido de sexta à noite viraria sábado.
 */
export function agoraEmSP(now: Date = new Date()): { dia: number; minutos: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const mapa: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dia = mapa[partes.find((p) => p.type === "weekday")?.value ?? ""] ?? 0;
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  // Intl devolve "24" para meia-noite em algumas engines.
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  return { dia, minutos: (hora % 24) * 60 + minuto };
}

export function estaAbertoAgora(horarios: DiaHorario[], now: Date = new Date()): boolean {
  const { dia, minutos } = agoraEmSP(now);
  const hoje = horarios.find((h) => h.dia === dia);
  if (!hoje) return false;
  return hoje.faixas.some(([ini, fim]) => {
    const a = minutosDe(ini);
    const b = minutosDe(fim);
    return a !== null && b !== null && minutos >= a && minutos <= b;
  });
}


/**
 * A loja ainda atende hoje? Verdadeiro se está aberta agora OU se reabre mais
 * tarde no mesmo dia.
 *
 * É este o critério para exibir a previsão publicada — e não "aberta agora".
 * No intervalo de almoço a loja está fechada, mas reabre às 13h e a previsão
 * que a dona publicou para o dia continua valendo. Só depois do último
 * fechamento (ou em dia sem atendimento) é que ela some.
 */
export function atendeAindaHoje(horarios: DiaHorario[], now: Date = new Date()): boolean {
  const { dia, minutos } = agoraEmSP(now);
  const hoje = horarios.find((h) => h.dia === dia);
  if (!hoje) return false;
  return hoje.faixas.some(([, fim]) => {
    const b = minutosDe(fim);
    return b !== null && minutos < b;
  });
}

/**
 * Frase de prazo exibida no site.
 *
 * O site NAO promete horario. Quem sabe o movimento do dia e quem atende, e o
 * prazo real e dado por ela na resposta do WhatsApp, depois que o pedido
 * chega. Prometer um numero aqui seria assumir um compromisso que a loja nao
 * controla — e cliente que le "1 hora" e recebe em 4 vira avaliacao ruim.
 *
 * Por padrao o texto apenas avisa isso. Se a loja publicar uma previsao pelo
 * painel (ex.: num dia calmo, "ate 1 hora"), ela aparece — sempre com a
 * ressalva de que a confirmacao vem no WhatsApp.
 */
export function statusEntrega(
  cfg: DeliveryConfig,
  _horarios: DiaHorario[] = HORARIOS_PADRAO,
  _now: Date = new Date(),
): DeliveryStatus {
  const previsao = (cfg.previsao ?? "").trim();

  if (!previsao) {
    return {
      kind: "combinar",
      texto: "O prazo de entrega é combinado com você no WhatsApp ao finalizar o pedido",
      curto: "Prazo combinado no WhatsApp",
    };
  }

  return {
    kind: "previsao",
    texto: `Previsão de entrega hoje: ${previsao} — confirmamos no WhatsApp ao finalizar`,
    curto: `Entrega hoje: ${previsao}`,
  };
}
