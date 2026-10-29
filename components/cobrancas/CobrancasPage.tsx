"use client";

import { AgendamentosPagination } from "@/components/agendamentos/AgendamentosPagination";
import { CobrancaBaixaModal } from "@/components/cobrancas/CobrancaBaixaModal";
import { CobrancaConsultaModal } from "@/components/cobrancas/CobrancaConsultaModal";
import { AppShell } from "@/components/layout/AppShell";
import { Field } from "@/components/ui/Field";
import { ListagemMesAnoTabs } from "@/components/ui/ListagemMesAnoTabs";
import { IconSearch, IconWallet } from "@/components/ui/icons/OutlineIcons";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateIsoToBR, todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import {
  BAIXA_EM_ANDAMENTO_MSG,
  COBRANCAS_PAGE_SIZE,
  COBRANCAS_TODOS_VENCIDOS_AVISO,
  FILTRO_SITUACAO_COBRANCA_LABEL,
  anosDisponiveisCobrancas,
  centavosParaReais,
  consultarCobrancas,
  rotuloContratoCobranca,
  rotuloParcelaCobranca,
  seloStatusCobranca,
  type CobrancaParcela,
  type FiltroSituacaoCobranca,
} from "@/lib/cobrancas-mensalidades";
import { formatCNPJ } from "@/lib/cnpj";
import {
  resolveMesParaAno,
  type YearMonth,
} from "@/lib/listagem-meses";
import {
  SITUACAO_PARCELA_MENSALIDADE_LABEL,
  type SituacaoParcelaMensalidade,
} from "@/lib/mensalidade-parcelas";
import { formatCurrency } from "@/lib/money";
import { isPerfilStaffNavarro } from "@/lib/permissions";
import { listarCobrancasMensalidades } from "@/services/cobrancas.service";
import { registrarBaixaParcelaMensalidade } from "@/services/mensalidade-parcelas.service";
import { obterUrlOrcamentoComprovante } from "@/services/orcamento-comprovante.service";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const SITUACAO_BADGE: Record<SituacaoParcelaMensalidade, string> = {
  em_aberto: "bg-[#f1f5f9] text-[#64748b]",
  vence_hoje: "bg-[#fef3c7] text-[#b45309]",
  vencida: "bg-brand-red-soft text-brand-red",
  paga: "bg-brand-green-soft text-brand-green",
};

function competenciaHoje(): YearMonth {
  const [year, month] = todayIsoSaoPaulo().split("-").map(Number);
  return { year, month };
}

export function CobrancasPage() {
  const { profile } = useAuth();
  const podeBaixar = isPerfilStaffNavarro(profile?.perfil);
  const [parcelas, setParcelas] = useState<CobrancaParcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mes, setMes] = useState<YearMonth>(competenciaHoje);
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<FiltroSituacaoCobranca>("todas");
  const [todosVencidos, setTodosVencidos] = useState(false);
  const [page, setPage] = useState(1);
  const [baixa, setBaixa] = useState<CobrancaParcela | null>(null);
  const [consulta, setConsulta] = useState<CobrancaParcela | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      setParcelas(await listarCobrancasMensalidades());
    } catch (err) {
      setParcelas([]);
      setErro(
        err instanceof Error ? err.message : "Não foi possível carregar as cobranças."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const hojeIso = todayIsoSaoPaulo();
  const anos = useMemo(
    () => anosDisponiveisCobrancas(parcelas.map((item) => item.vencimentoIso)),
    [parcelas]
  );
  const consultaDados = useMemo(
    () =>
      consultarCobrancas({
        parcelas,
        hojeIso,
        competencia: mes,
        busca,
        situacao,
        todosVencidos,
        page,
      }),
    [parcelas, hojeIso, mes, busca, situacao, todosVencidos, page]
  );

  useEffect(() => {
    if (page !== consultaDados.page) setPage(consultaDados.page);
  }, [page, consultaDados.page]);

  async function confirmarBaixa(params: {
    pagoEmIso: string;
    valorRecebido: number;
    comprovante: File | null;
  }) {
    if (!baixa || savingId) return;
    if (!podeBaixar) {
      toast.error("Você não possui permissão para registrar esta baixa.");
      return;
    }
    setSavingId(baixa.id);
    let encerraSaving = true;
    try {
      const salva = await registrarBaixaParcelaMensalidade({
        parcelaId: baixa.id,
        pagoEmIso: params.pagoEmIso,
        valorRecebido: params.valorRecebido,
        comprovante: params.comprovante,
      });
      setParcelas((atual) =>
        atual.map((item) =>
          item.id === salva.id
            ? {
                ...item,
                pagoEmIso: salva.pagoEmIso,
                valorRecebido: salva.valorRecebido,
                comprovantePath: salva.comprovantePath,
                comprovanteNome: salva.comprovanteNome,
              }
            : item
        )
      );
      setBaixa(null);
      toast.success("Baixa registrada no Financeiro do contrato.");
    } catch (err) {
      if (err instanceof Error && err.message === BAIXA_EM_ANDAMENTO_MSG) {
        encerraSaving = false;
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Não foi possível registrar a baixa."
      );
    } finally {
      if (encerraSaving) setSavingId(null);
    }
  }

  async function verComprovante(path: string) {
    try {
      const url = await obterUrlOrcamentoComprovante(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Não foi possível abrir o comprovante.");
    }
  }

  const indicadores = [
    {
      label: "Valor previsto",
      valor: consultaDados.resumo.previstoCentavos,
      classe: "text-navy",
      detalhe: null,
    },
    {
      label: "Valor recebido",
      valor: consultaDados.resumo.recebidoCentavos,
      classe: "text-brand-green",
      detalhe: null,
    },
    {
      label: "Valor em aberto",
      valor: consultaDados.resumo.emAbertoCentavos,
      classe: "text-[#b45309]",
      detalhe: null,
    },
    {
      label: "Valor vencido",
      valor: consultaDados.resumo.vencidoCentavos,
      classe: "text-brand-red",
      detalhe: "Incluído no valor em aberto",
    },
  ];

  return (
    <AppShell
      title="Cobranças"
      subtitle="Parcelas das mensalidades de Gestão SST, com a mesma baixa do Financeiro de cada contrato."
      icon={<IconWallet size={20} />}
    >
      <section className="rounded-2xl border border-[#e8edf5] bg-white p-3 sm:p-4">
        <ListagemMesAnoTabs
          selected={mes}
          years={anos}
          onSelect={(periodo) => {
            setMes(periodo);
            setPage(1);
          }}
          onYearChange={(year) => {
            setMes((atual) =>
              resolveMesParaAno(year, atual.month, { allowFutureMonths: true })
            );
            setPage(1);
          }}
          disableFutureMonths={false}
          ariaLabel="Filtrar parcelas pelo mês de vencimento"
          monthTitlePrefix="Vencimentos de"
        />

        <div className="mt-3 grid grid-cols-1 gap-3 sidebar:grid-cols-[minmax(0,1.4fr)_180px_auto] sidebar:items-end">
          <Field label="Empresa ou CNPJ">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <IconSearch size={14} />
              </span>
              <input
                className="field-input pl-9"
                placeholder="Nome da empresa ou CNPJ"
                value={busca}
                onChange={(event) => {
                  setBusca(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </Field>
          <Field label="Situação">
            <select
              className="field-input"
              value={situacao}
              onChange={(event) => {
                setSituacao(event.target.value as FiltroSituacaoCobranca);
                setPage(1);
              }}
            >
              {(
                Object.keys(FILTRO_SITUACAO_COBRANCA_LABEL) as FiltroSituacaoCobranca[]
              ).map((item) => (
                <option key={item} value={item}>
                  {FILTRO_SITUACAO_COBRANCA_LABEL[item]}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 pb-2 text-[13px] font-semibold text-navy">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#384393]"
              checked={todosVencidos}
              onChange={(event) => {
                setTodosVencidos(event.target.checked);
                setPage(1);
              }}
            />
            Todos os vencidos
          </label>
        </div>

        {todosVencidos ? (
          <p
            className="mt-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#92400e]"
            role="status"
          >
            {COBRANCAS_TODOS_VENCIDOS_AVISO}
          </p>
        ) : (
          <p className="mt-3 text-[11px] text-[#64748b]">
            O mês filtra a data de vencimento da parcela.
          </p>
        )}
      </section>

      <div className="mt-3 grid grid-cols-2 gap-2 sidebar:grid-cols-4">
        {indicadores.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#e8edf5] bg-white px-3 py-2"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
              {item.label}
            </p>
            <p className={`mt-0.5 text-[15px] font-extrabold ${item.classe}`}>
              {formatCurrency(centavosParaReais(item.valor))}
            </p>
            {item.detalhe ? (
              <p className="mt-0.5 text-[10px] text-[#94a3b8]">{item.detalhe}</p>
            ) : null}
          </div>
        ))}
      </div>

      <section className="mt-3 overflow-hidden rounded-2xl border border-[#e8edf5] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-[12px] text-[#334155]">
            <thead>
              <tr className="border-b border-[#e4ebf4] text-[10px] font-extrabold uppercase tracking-wide text-[#64748b]">
                <th className="px-3 py-2 font-extrabold">Empresa</th>
                <th className="px-3 py-2 font-extrabold">Orçamento/contrato</th>
                <th className="px-3 py-2 font-extrabold">Parcela</th>
                <th className="px-3 py-2 font-extrabold">Vencimento</th>
                <th className="px-3 py-2 font-extrabold">Valor da parcela</th>
                <th className="px-3 py-2 font-extrabold">Data do pagamento</th>
                <th className="px-3 py-2 font-extrabold">Situação</th>
                <th className="px-3 py-2 font-extrabold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-[#64748b]" colSpan={8}>
                    Carregando parcelas…
                  </td>
                </tr>
              ) : erro ? (
                <tr>
                  <td className="px-3 py-6 text-[#b91c1c]" colSpan={8}>
                    {erro}
                  </td>
                </tr>
              ) : consultaDados.linhas.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-[#64748b]" colSpan={8}>
                    {todosVencidos
                      ? "Nenhuma parcela vencida para a busca informada."
                      : "Nenhuma parcela com vencimento neste período."}
                  </td>
                </tr>
              ) : (
                consultaDados.linhas.map((parcela) => {
                  const selo = seloStatusCobranca(parcela.statusOrcamento);
                  const paga = parcela.situacao === "paga";
                  return (
                    <tr key={parcela.id} className="border-b border-[#f1f5f9]">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-navy">{parcela.empresa}</p>
                        <p className="text-[11px] text-[#64748b]">
                          {formatCNPJ(parcela.cnpj)}
                          {selo ? ` · ${selo}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        {rotuloContratoCobranca(
                          parcela.numeroOrcamento,
                          parcela.numeroContrato
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {rotuloParcelaCobranca(parcela.numero)}
                      </td>
                      <td className="px-3 py-2">
                        {formatDateIsoToBR(parcela.vencimentoIso)}
                      </td>
                      <td className="px-3 py-2">{formatCurrency(parcela.valor)}</td>
                      <td className="px-3 py-2">
                        {parcela.pagoEmIso
                          ? formatDateIsoToBR(parcela.pagoEmIso)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${SITUACAO_BADGE[parcela.situacao]}`}
                        >
                          {SITUACAO_PARCELA_MENSALIDADE_LABEL[parcela.situacao]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {paga ? (
                            <button
                              type="button"
                              className="font-semibold text-brand-blue hover:underline"
                              onClick={() => setConsulta(parcela)}
                            >
                              Consultar
                            </button>
                          ) : podeBaixar ? (
                            <button
                              type="button"
                              className="font-semibold text-brand-blue hover:underline disabled:opacity-50"
                              disabled={savingId === parcela.id}
                              onClick={() => setBaixa(parcela)}
                            >
                              Dar baixa
                            </button>
                          ) : null}
                          <Link
                            href={`/orcamentos?abrir=${encodeURIComponent(parcela.orcamentoId)}&aba=financeiro`}
                            className="font-semibold text-navy hover:underline"
                          >
                            Contrato
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && !erro ? (
          <div className="px-3 pb-3">
            <AgendamentosPagination
              page={consultaDados.page}
              totalPages={consultaDados.totalPages}
              totalItems={consultaDados.total}
              pageSize={COBRANCAS_PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </section>

      <CobrancaBaixaModal
        parcela={baixa}
        saving={Boolean(baixa && savingId === baixa.id)}
        onClose={() => {
          if (!savingId) setBaixa(null);
        }}
        onConfirm={(params) => {
          void confirmarBaixa(params);
        }}
      />
      <CobrancaConsultaModal
        parcela={consulta}
        onClose={() => setConsulta(null)}
        onVerComprovante={(path) => {
          void verComprovante(path);
        }}
      />
    </AppShell>
  );
}
