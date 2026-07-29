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
  /** A loja está aceitando entrega no mesmo dia agora? */
  sameDay: boolean;
  /** Até que horas o pedido garante entrega hoje. Ex.: "16:00". */
  cutoff: string;
  /** Observação livre, ex.: "Centro e bairros próximos". */
  note: string;
};

export type DeliveryStatus = {
  /** `hoje` = dá tempo; `proximo` = fora da janela; `combinar` = chave desligada. */
  kind: "hoje" | "proximo" | "combinar";
  /** Frase completa, para o hero e o checkout. */
  texto: string;
  /** Versão curta, para caber na faixa e no card. */
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

export const ENTREGA_PADRAO: DeliveryConfig = {
  sameDay: true,
  cutoff: "16:00",
  note: "",
};

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

/** Primeiro dia com atendimento a partir de (e incluindo) `aPartirDe`. */
function proximoDiaAberto(
  horarios: DiaHorario[],
  aPartirDe: number,
): { dia: number; abre: string } | null {
  for (let i = 0; i < 7; i++) {
    const d = (aPartirDe + i) % 7;
    const h = horarios.find((x) => x.dia === d);
    if (h && h.faixas.length > 0) return { dia: d, abre: h.faixas[0][0] };
  }
  return null;
}

/**
 * Frase de prazo de entrega.
 *
 * Nunca promete o que não dá para cumprir: se a chave estiver desligada, se
 * hoje não for dia de atendimento, ou se já passou do horário de corte, o
 * texto muda para a próxima janela real.
 */
export function statusEntrega(
  cfg: DeliveryConfig,
  horarios: DiaHorario[],
  now: Date = new Date(),
): DeliveryStatus {
  const lista = horarios.length ? horarios : HORARIOS_PADRAO;

  if (!cfg.sameDay) {
    return {
      kind: "combinar",
      texto: "Entrega em Maravilha — combine a data pelo WhatsApp",
      curto: "Combine a data",
    };
  }

  const { dia, minutos } = agoraEmSP(now);
  const hoje = lista.find((h) => h.dia === dia);
  const corte = minutosDe(cfg.cutoff);
  const fechaHoje = hoje?.faixas.length
    ? minutosDe(hoje.faixas[hoje.faixas.length - 1][1])
    : null;

  // Dá para entregar hoje: é dia de atendimento, ainda não passou do corte e
  // a loja ainda não fechou de vez.
  const dentroDaJanela =
    !!hoje?.faixas.length &&
    corte !== null &&
    minutos < corte &&
    fechaHoje !== null &&
    minutos < fechaHoje;

  if (dentroDaJanela) {
    return {
      kind: "hoje",
      texto: `Peça até ${cfg.cutoff} e entregamos hoje em Maravilha`,
      curto: `Entrega hoje se pedir até ${cfg.cutoff}`,
    };
  }

  // Fora da janela: aponta a próxima abertura. Se hoje já passou, começa amanhã.
  const proximo = proximoDiaAberto(lista, (dia + 1) % 7);
  if (!proximo) {
    return {
      kind: "combinar",
      texto: "Entrega em Maravilha — combine a data pelo WhatsApp",
      curto: "Combine a data",
    };
  }

  const amanha = proximo.dia === (dia + 1) % 7;
  const quando = amanha ? "amanhã" : DIAS_CURTOS[proximo.dia];
  return {
    kind: "proximo",
    texto: `Próxima entrega ${quando} a partir das ${proximo.abre}`,
    curto: `Entrega ${quando} · ${proximo.abre}`,
  };
}
