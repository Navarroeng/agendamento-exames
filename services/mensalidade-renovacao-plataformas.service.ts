import { createClient } from "@/lib/supabase/client";
import {
  LIMITE_PLATAFORMAS_CONTRATO,
  orcamentoUsaContratoGestaoSstPlataformas,
  valorMensalCobrancaPlataformas,
  vigenciaEhRenovacaoPlataformas,
} from "@/lib/contrato-gestao-sst-plataformas";
import { valorMensalContratado } from "@/lib/mensalidade-parcelas";

type ItemRef = { servico_id?: string | null; servico_nome?: string | null };

export type EntradaRenovacaoPlataformas = {
  aprovacaoId: string;
  numeroOrcamento: string;
  vigencias: string[];
  valorMensal: number | null;
  valorFinal: number | null;
  parcelas: { vigenciaInicio: string; valor: number }[];
};

export type MapaRenovacaoPlataformas = Map<
  string,
  Record<string, number | null>
>;

type Congelamento = {
  valor: number | null;
  vigencia: string | null;
  limite: number | null;
  clienteId: string | null;
  numero: string | null;
  itens: ItemRef[];
  iniciosContrato: string[];
};

function iso(value: string | null | undefined): string | null {
  const texto = (value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

function um(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const primeiro = value[0];
    return primeiro && typeof primeiro === "object"
      ? (primeiro as Record<string, unknown>)
      : null;
  }
  return typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function lista(value: unknown): Record<string, unknown>[] {
  if (value == null) return [];
  const itens = Array.isArray(value) ? value : [value];
  return itens.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object"
  );
}

async function contarColaboradoresAtivos(
  clienteId: string
): Promise<number | null> {
  if (!clienteId || typeof fetch !== "function") return null;
  try {
    const resposta = await fetch(`/api/clientes/${clienteId}/colaboradores`, {
      credentials: "same-origin",
    });
    if (!resposta.ok) return null;
    const json = (await resposta.json()) as {
      resumo?: { totalAtivos?: number };
    };
    const total = Number(json?.resumo?.totalAtivos);
    if (!Number.isInteger(total) || total < 0) return null;
    return total;
  } catch {
    return null;
  }
}

async function lerDadosPlataformas(
  aprovacaoIds: string[]
): Promise<Map<string, Congelamento>> {
  const mapa = new Map<string, Congelamento>();
  if (aprovacaoIds.length === 0) return mapa;
  const supabase = createClient();
  const select = `
    id,
    mensalidade_renovacao_valor_centavos,
    mensalidade_renovacao_vigencia_inicio,
    mensalidade_plataformas_limite,
    orcamentos!inner (
      numero,
      cliente_id,
      orcamento_itens ( servico_id, servico_nome ),
      cliente_contratos ( data_inicio, status )
    )
  `;
  const selectSemCongelamento = select
    .replace(/\n\s*mensalidade_renovacao_valor_centavos,/, "")
    .replace(/\n\s*mensalidade_renovacao_vigencia_inicio,/, "")
    .replace(/\n\s*mensalidade_plataformas_limite,/, "");
  const primeira = await supabase
    .from("orcamento_aprovacoes")
    .select(select)
    .in("id", aprovacaoIds);
  let rows = (primeira.data ?? []) as unknown[];
  let error = primeira.error;
  let semColuna = false;
  if (
    error &&
    /mensalidade_renovacao_valor_centavos|mensalidade_renovacao_vigencia_inicio|mensalidade_plataformas_limite|schema cache|42703/i.test(
      error.message ?? ""
    )
  ) {
    semColuna = true;
    const segunda = await supabase
      .from("orcamento_aprovacoes")
      .select(selectSemCongelamento)
      .in("id", aprovacaoIds);
    rows = (segunda.data ?? []) as unknown[];
    error = segunda.error;
  }
  if (error) return mapa;
  for (const row of rows as Record<string, unknown>[]) {
    const orcamento = um(row.orcamentos);
    const centavos = Number(row.mensalidade_renovacao_valor_centavos);
    const limite = Number(row.mensalidade_plataformas_limite);
    mapa.set(String(row.id), {
      valor:
        semColuna || !Number.isFinite(centavos) || centavos <= 0
          ? null
          : centavos / 100,
      vigencia: semColuna
        ? null
        : iso(
            row.mensalidade_renovacao_vigencia_inicio == null
              ? null
              : String(row.mensalidade_renovacao_vigencia_inicio)
          ),
      limite:
        semColuna || !Number.isFinite(limite) || limite <= 0
          ? null
          : Math.floor(limite),
      clienteId:
        orcamento?.cliente_id == null ? null : String(orcamento.cliente_id),
      numero: orcamento?.numero == null ? null : String(orcamento.numero),
      itens: lista(orcamento?.orcamento_itens).map((item) => ({
        servico_id: item.servico_id == null ? null : String(item.servico_id),
        servico_nome:
          item.servico_nome == null ? null : String(item.servico_nome),
      })),
      iniciosContrato: lista(orcamento?.cliente_contratos)
        .filter((contrato) => String(contrato.status ?? "") !== "cancelado")
        .map((contrato) => iso(String(contrato.data_inicio ?? "")))
        .filter((inicio): inicio is string => Boolean(inicio)),
    });
  }
  return mapa;
}

async function gravarValorRenovacao(params: {
  aprovacaoId: string;
  vigenciaInicio: string;
  valor: number;
  limite: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("orcamento_aprovacoes")
    .update({
      mensalidade_renovacao_valor_centavos: Math.round(params.valor * 100),
      mensalidade_renovacao_vigencia_inicio: params.vigenciaInicio,
      mensalidade_plataformas_limite: params.limite,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.aprovacaoId);
  if (error) return;
}

/**
 * Valor da renovação de Gestão SST com plataformas, por vigência.
 * A vigência inicial não entra no mapa e continua no valor contratado.
 * O valor calculado é gravado para a vigência nova. Parcelas já lançadas prevalecem.
 */
export async function mapaValorRenovacaoPlataformas(
  entradas: EntradaRenovacaoPlataformas[]
): Promise<MapaRenovacaoPlataformas> {
  const resultado: MapaRenovacaoPlataformas = new Map();
  const candidatos = entradas.filter(
    (entrada) => entrada.aprovacaoId.trim() && entrada.vigencias.length > 0
  );
  if (candidatos.length === 0) return resultado;
  const dados = await lerDadosPlataformas(
    candidatos.map((entrada) => entrada.aprovacaoId)
  );
  const contagens = new Map<string, Promise<number | null>>();

  for (const entrada of candidatos) {
    const info = dados.get(entrada.aprovacaoId);
    const plataformas = orcamentoUsaContratoGestaoSstPlataformas({
      numero: info?.numero ?? entrada.numeroOrcamento,
      itens: info?.itens ?? [],
    });
    if (!plataformas) continue;
    const inicios = [
      ...entrada.vigencias,
      ...(info?.iniciosContrato ?? []),
      ...entrada.parcelas.map((parcela) => parcela.vigenciaInicio),
    ];
    const valorContratado = valorMensalContratado({
      mensalidadeValorMensal: entrada.valorMensal,
      valorFinal: entrada.valorFinal,
    });
    const porVigencia: Record<string, number | null> = {};
    for (const vigencia of entrada.vigencias) {
      const inicio = iso(vigencia);
      if (!inicio || !vigenciaEhRenovacaoPlataformas(inicio, inicios)) continue;
      const parcelas = entrada.parcelas
        .filter((parcela) => iso(parcela.vigenciaInicio) === inicio)
        .map((parcela) => parcela.valor);
      const jaGravado = info?.vigencia === inicio && info.valor != null;
      let colaboradores: number | null = null;
      if (!jaGravado && parcelas.length === 0 && info?.clienteId) {
        const clienteId = info.clienteId;
        if (!contagens.has(clienteId)) {
          contagens.set(clienteId, contarColaboradoresAtivos(clienteId));
        }
        colaboradores = await contagens.get(clienteId)!;
      }
      const limite =
        info?.limite && info.limite > 0
          ? info.limite
          : LIMITE_PLATAFORMAS_CONTRATO;
      const valor = valorMensalCobrancaPlataformas({
        plataformas: true,
        vigenciaInicio: inicio,
        iniciosConhecidos: inicios,
        valorContratado,
        colaboradoresAtivos: colaboradores,
        limitePlataformas: limite,
        valorRenovacaoGravado: info?.valor ?? null,
        vigenciaRenovacaoGravada: info?.vigencia ?? null,
        valoresParcelasDaVigencia: parcelas,
      });
      porVigencia[inicio] = valor;
      if (valor != null && !jaGravado && parcelas.length === 0 && colaboradores != null) {
        await gravarValorRenovacao({
          aprovacaoId: entrada.aprovacaoId,
          vigenciaInicio: inicio,
          valor,
          limite,
        });
      }
    }
    if (Object.keys(porVigencia).length > 0) {
      resultado.set(entrada.aprovacaoId, porVigencia);
    }
  }
  return resultado;
}
