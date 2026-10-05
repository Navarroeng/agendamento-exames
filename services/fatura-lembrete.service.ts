import type { FaturaLembreteRegistro } from "@/lib/fatura-lembrete";

export type EnviarLembreteFaturaClienteInput = {
  email: string;
  assunto: string;
  mensagem: string;
  requestId: string;
};

export type EnviarLembreteFaturaClienteResult = {
  lembrete: FaturaLembreteRegistro;
  faturaLembreteUltimoEm: string;
  faturaLembreteUltimoEmail: string;
};

export async function listarLembretesFaturaCliente(
  faturaId: string
): Promise<FaturaLembreteRegistro[]> {
  const id = faturaId.trim();
  if (!id) throw new Error("Fatura inválida.");

  const res = await fetch(`/api/faturas/${encodeURIComponent(id)}/lembrete`);
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    lembretes?: FaturaLembreteRegistro[];
  };

  if (!res.ok || !json.ok || !json.lembretes) {
    throw new Error(
      json.error || "Não foi possível carregar o histórico de lembretes."
    );
  }

  return json.lembretes;
}

export async function enviarLembreteFaturaCliente(
  faturaId: string,
  input: EnviarLembreteFaturaClienteInput
): Promise<EnviarLembreteFaturaClienteResult> {
  const id = faturaId.trim();
  if (!id) throw new Error("Fatura inválida.");

  const res = await fetch(
    `/api/faturas/${encodeURIComponent(id)}/lembrete/enviar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        assunto: input.assunto,
        mensagem: input.mensagem,
        requestId: input.requestId,
      }),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    lembrete?: FaturaLembreteRegistro;
    faturaLembreteUltimoEm?: string;
    faturaLembreteUltimoEmail?: string;
  };

  if (
    !res.ok ||
    !json.ok ||
    !json.lembrete ||
    !json.faturaLembreteUltimoEm ||
    !json.faturaLembreteUltimoEmail
  ) {
    throw new Error(
      json.error ||
        "Não foi possível enviar o lembrete. O envio não foi registrado."
    );
  }

  return {
    lembrete: json.lembrete,
    faturaLembreteUltimoEm: json.faturaLembreteUltimoEm,
    faturaLembreteUltimoEmail: json.faturaLembreteUltimoEmail,
  };
}

export type LembretesHojePendenteCliente = {
  id: string;
  numero: string;
  referenciaId: string | null;
  empresa: string;
  valor: number;
  email: string;
};

export type LembretesHojePainelCliente = {
  hojeIso: string;
  competenciaIso: string;
  competenciaTitulo: string | null;
  elegiveis: number;
  pendentes: LembretesHojePendenteCliente[];
  jaLembradas: { id: string; numero: string; empresa: string }[];
};

export type LembreteHojeItemCliente = {
  faturaId: string;
  numero: string;
  empresa: string;
  valor: number;
  tipo: "aceito" | "sem_email" | "ja_lembrada" | "falha";
  email?: string | null;
  motivo?: string;
  enviadoEm?: string;
  resendMessageId?: string | null;
};

export async function consultarLembretesHojeCliente(
  competenciaIso: string
): Promise<LembretesHojePainelCliente> {
  const competencia = competenciaIso.trim();
  if (!competencia) throw new Error("Informe a competência do lote.");
  const params = new URLSearchParams({ competencia });
  const res = await fetch(`/api/faturas/lembretes-hoje?${params}`);
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    hojeIso?: string;
    competenciaIso?: string;
    competenciaTitulo?: string | null;
    elegiveis?: number;
    pendentes?: LembretesHojePendenteCliente[];
    jaLembradas?: { id: string; numero: string; empresa: string }[];
  };

  if (
    !res.ok ||
    !json.ok ||
    !json.hojeIso ||
    !json.competenciaIso ||
    json.elegiveis == null ||
    !json.pendentes ||
    !json.jaLembradas
  ) {
    throw new Error(
      json.error || "Não foi possível consultar as faturas que vencem hoje."
    );
  }

  return {
    hojeIso: json.hojeIso,
    competenciaIso: json.competenciaIso,
    competenciaTitulo: json.competenciaTitulo ?? null,
    elegiveis: json.elegiveis,
    pendentes: json.pendentes,
    jaLembradas: json.jaLembradas,
  };
}

export async function enviarLembreteHojeCliente(
  faturaId: string,
  competenciaIso: string
): Promise<LembreteHojeItemCliente> {
  const id = faturaId.trim();
  const competencia = competenciaIso.trim();
  if (!id) throw new Error("Fatura inválida.");
  if (!competencia) throw new Error("Informe a competência do lote.");

  const res = await fetch("/api/faturas/lembretes-hoje/enviar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ faturaId: id, competencia }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    item?: LembreteHojeItemCliente;
  };

  if (!res.ok || !json.ok || !json.item) {
    throw new Error(
      json.error ||
        "Não foi possível enviar o lembrete. O envio não foi registrado."
    );
  }

  return json.item;
}

export type LembretesVencidasPendenteCliente = LembretesHojePendenteCliente & {
  vencimento: string;
  diasAtraso: number;
};

export type LembretesVencidasPainelCliente = {
  hojeIso: string;
  competenciaIso: string;
  competenciaTitulo: string | null;
  elegiveis: number;
  pendentes: LembretesVencidasPendenteCliente[];
  jaLembradas: { id: string; numero: string; empresa: string }[];
};

export async function consultarLembretesVencidasCliente(
  competenciaIso: string
): Promise<LembretesVencidasPainelCliente> {
  const competencia = competenciaIso.trim();
  if (!competencia) throw new Error("Informe a competência do lote.");
  const params = new URLSearchParams({ competencia });
  const res = await fetch(`/api/faturas/lembretes-vencidas?${params}`);
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    hojeIso?: string;
    competenciaIso?: string;
    competenciaTitulo?: string | null;
    elegiveis?: number;
    pendentes?: LembretesVencidasPendenteCliente[];
    jaLembradas?: { id: string; numero: string; empresa: string }[];
  };

  if (
    !res.ok ||
    !json.ok ||
    !json.hojeIso ||
    !json.competenciaIso ||
    json.elegiveis == null ||
    !json.pendentes ||
    !json.jaLembradas
  ) {
    throw new Error(
      json.error || "Não foi possível consultar as faturas vencidas."
    );
  }

  return {
    hojeIso: json.hojeIso,
    competenciaIso: json.competenciaIso,
    competenciaTitulo: json.competenciaTitulo ?? null,
    elegiveis: json.elegiveis,
    pendentes: json.pendentes,
    jaLembradas: json.jaLembradas,
  };
}

export async function enviarLembreteVencidaCliente(
  faturaId: string,
  competenciaIso: string
): Promise<LembreteHojeItemCliente> {
  const id = faturaId.trim();
  const competencia = competenciaIso.trim();
  if (!id) throw new Error("Fatura inválida.");
  if (!competencia) throw new Error("Informe a competência do lote.");

  const res = await fetch("/api/faturas/lembretes-vencidas/enviar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ faturaId: id, competencia }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    item?: LembreteHojeItemCliente;
  };

  if (!res.ok || !json.ok || !json.item) {
    throw new Error(
      json.error ||
        "Não foi possível enviar o lembrete. O envio não foi registrado."
    );
  }

  return json.item;
}
