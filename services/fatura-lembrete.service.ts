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
