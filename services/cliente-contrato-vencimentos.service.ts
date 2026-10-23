import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import type { ClienteContratoConsulta } from "@/lib/cliente-contrato-atual";
import {
  clienteContratoBadgeClassExibicao,
  labelClienteContratoStatusExibicao,
} from "@/lib/cliente-contrato-mappers";
import {
  limitesDoMes,
  montarVencimentosDoMes,
  type ConsultaVencimentoContrato,
  type LinhaVencimentoContrato,
  type RenovacaoVinculada,
} from "@/lib/cliente-contrato-vencimentos";
import { createClient } from "@/lib/supabase/client";
import type { ClienteContratoRecord } from "@/lib/types";
import { complementarContratosComCobranca } from "@/services/cliente-contrato.service";

const PAGE_SIZE = 1000;
const IN_CHUNK = 80;

export type VencimentoContratoLinha = {
  contratoId: string;
  clienteId: string;
  clienteNome: string;
  clienteCnpj: string;
  contratoNumero: string;
  inicioIso: string | null;
  fimPrevisto: string;
  situacao: string;
  situacaoClassName: string;
  renovacao: RenovacaoVinculada | null;
};

function chunks<T>(items: T[], size: number): T[][] {
  const grupos: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    grupos.push(items.slice(index, index + size));
  }
  return grupos;
}

async function listarFaixa(inicio: string, fim: string): Promise<ClienteContratoRecord[]> {
  const supabase = createClient();
  const rows: ClienteContratoRecord[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("cliente_contratos")
      .select("*")
      .gte("data_fim", inicio)
      .lte("data_fim", fim)
      .order("data_fim", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = (data ?? []) as ClienteContratoRecord[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function listarPorColuna(
  coluna: "cliente_id" | "orcamento_id",
  ids: string[],
  inicioMinimo?: string
): Promise<ClienteContratoRecord[]> {
  if (ids.length === 0) return [];
  const supabase = createClient();
  const rows: ClienteContratoRecord[] = [];
  for (const grupo of chunks(ids, IN_CHUNK)) {
    let from = 0;
    while (true) {
      let query = supabase
        .from("cliente_contratos")
        .select("*")
        .in(coluna, grupo)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (inicioMinimo) query = query.gte("data_inicio", inicioMinimo);
      const { data, error } = await query;
      if (error) throw error;
      const batch = (data ?? []) as ClienteContratoRecord[];
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }
  return rows;
}

function unirPorId(listas: ClienteContratoRecord[][]): ClienteContratoRecord[] {
  const porId = new Map<string, ClienteContratoRecord>();
  for (const lista of listas) {
    for (const contrato of lista) porId.set(contrato.id, contrato);
  }
  return Array.from(porId.values());
}

async function origensPorOrcamento(
  orcamentoIds: string[]
): Promise<Map<string, string | null>> {
  const origem = new Map<string, string | null>();
  if (orcamentoIds.length === 0) return origem;
  const supabase = createClient();
  for (const grupo of chunks(orcamentoIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("orcamentos")
      .select("id, origem_cliente")
      .in("id", grupo);
    if (error) throw error;
    for (const row of data ?? []) {
      origem.set(
        String(row.id),
        (row.origem_cliente as string | null) ?? null
      );
    }
  }
  return origem;
}

async function clientesPorId(
  clienteIds: string[]
): Promise<Map<string, { nome: string; cnpj: string }>> {
  const clientes = new Map<string, { nome: string; cnpj: string }>();
  if (clienteIds.length === 0) return clientes;
  const supabase = createClient();
  for (const grupo of chunks(clienteIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, cnpj")
      .in("id", grupo);
    if (error) throw error;
    for (const row of data ?? []) {
      clientes.set(String(row.id), {
        nome: String(row.nome ?? ""),
        cnpj: String(row.cnpj ?? ""),
      });
    }
  }
  return clientes;
}

function aplicarCobranca(
  linhas: LinhaVencimentoContrato[],
  enriquecidos: ClienteContratoConsulta[],
  hojeIso: string
): LinhaVencimentoContrato[] {
  const porId = new Map(enriquecidos.map((contrato) => [contrato.id, contrato]));
  return linhas.map((linha) => {
    const contrato = porId.get(linha.contrato.id) ?? linha.contrato;
    return {
      ...linha,
      contrato,
      situacao: labelClienteContratoStatusExibicao(contrato, hojeIso),
    };
  });
}

export async function listarVencimentosDoAno(params: {
  ano: number;
  consulta?: ConsultaVencimentoContrato;
  hojeIso?: string;
}): Promise<VencimentoContratoLinha[]> {
  const inicio = limitesDoMes(params.ano, 1).inicio;
  const fim = limitesDoMes(params.ano, 12).fim;
  const doAno = await listarFaixa(inicio, fim);
  if (doAno.length === 0) return [];

  const orcamentoIds = Array.from(
    new Set(
      doAno
        .map((contrato) => contrato.orcamento_id?.trim())
        .filter((id): id is string => Boolean(id))
    )
  );
  const clienteIds = Array.from(new Set(doAno.map((contrato) => contrato.cliente_id)));
  const [irmaos, sucessores] = await Promise.all([
    listarPorColuna("orcamento_id", orcamentoIds),
    listarPorColuna("cliente_id", clienteIds, inicio),
  ]);
  const contratos = unirPorId([doAno, irmaos, sucessores]);
  const origemIds = Array.from(
    new Set(
      contratos
        .map((contrato) => contrato.orcamento_id?.trim())
        .filter((id): id is string => Boolean(id))
    )
  );
  const hojeIso = params.hojeIso ?? todayIsoSaoPaulo();
  const origemPorOrcamentoId = await origensPorOrcamento(origemIds);
  const montadas = Array.from({ length: 12 }, (_, index) =>
    montarVencimentosDoMes({
      ano: params.ano,
      mes: index + 1,
      contratos,
      origemPorOrcamentoId,
      consulta: params.consulta,
      hojeIso,
    })
  ).flat();
  const enriquecidas = aplicarCobranca(
    montadas,
    await complementarContratosComCobranca(
      montadas.map((linha) => linha.contrato)
    ),
    hojeIso
  );
  const clientes = await clientesPorId(
    Array.from(new Set(enriquecidas.map((linha) => linha.contrato.cliente_id)))
  );

  const linhas = enriquecidas.map((linha) => {
    const cliente = clientes.get(linha.contrato.cliente_id);
    const inicio = (linha.contrato.data_inicio ?? "").trim().slice(0, 10);
    return {
      contratoId: linha.contrato.id,
      clienteId: linha.contrato.cliente_id,
      clienteNome: cliente?.nome?.trim() || "—",
      clienteCnpj: cliente?.cnpj ?? "",
      contratoNumero: linha.contrato.numero?.trim() || "—",
      inicioIso: /^\d{4}-\d{2}-\d{2}$/.test(inicio) ? inicio : null,
      fimPrevisto: linha.fimPrevisto,
      situacao: linha.situacao,
      situacaoClassName: clienteContratoBadgeClassExibicao(
        linha.contrato,
        hojeIso
      ),
      renovacao: linha.renovacao,
    };
  });

  linhas.sort((a, b) => {
    const porFim = a.fimPrevisto.localeCompare(b.fimPrevisto);
    if (porFim !== 0) return porFim;
    const porNome = a.clienteNome.localeCompare(b.clienteNome, "pt-BR");
    if (porNome !== 0) return porNome;
    return a.contratoNumero.localeCompare(b.contratoNumero, "pt-BR");
  });
  return linhas;
}
