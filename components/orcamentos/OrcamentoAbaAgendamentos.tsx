"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AgendamentoViewModal } from "@/components/modals/AgendamentoViewModal";
import { DispensaAgendamentosIniciaisModal } from "@/components/orcamentos/DispensaAgendamentosIniciaisModal";
import {
  InformarExameFuturoModal,
  type InformarExameFuturoFormResult,
} from "@/components/orcamentos/InformarExameFuturoModal";
import { AsosContratuaisEmAbertoSection } from "@/components/orcamentos/AsosContratuaisEmAbertoSection";
import {
  RegistrarAsoEmAbertoModal,
  type RegistrarAsoEmAbertoFormResult,
} from "@/components/orcamentos/RegistrarAsoEmAbertoModal";
import { ReabrirAgendamentosIniciaisModal } from "@/components/orcamentos/ReabrirAgendamentosIniciaisModal";
import { IconEye } from "@/components/ui/icons/OutlineIcons";
import { formatDateIsoToBR, formatHorarioForForm } from "@/lib/agendamento-datetime";
import { statusAgendamentoLabel } from "@/lib/agendamentos-table";
import {
  agendamentoPertenceAoClienteContrato,
  buildContagemContratoComVagas,
  buildContratoAgendamentoContagem,
  contratoTemAgendamentosIniciaisDispensados,
  isAgendamentoSelecionavel,
  resolveClassificacaoAgendamento,
  type ContratoAgendamentoContagem,
} from "@/lib/contrato-agendamentos";
import type { ContratoCreditoAsoRecord } from "@/lib/contrato-creditos-aso";
import {
  formatMesAnoPrevisto,
  labelMotivoExameFuturo,
  labelOrigemPeriodico,
  type ColaboradorSugestao,
} from "@/lib/contrato-programacao-futura";
import { formatCreatedAtBR } from "@/lib/format-datetime";
import { saveAgendamentoPrefill } from "@/lib/agendamento-prefill";
import { maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";
import {
  CONTRATO_VAGA_STATUS_LABELS,
  isNomeFuncionarioReal,
  labelColaboradorOuVaga,
  type ContratoVagaRecord,
  type ContratoVagaStatus,
} from "@/lib/contrato-vagas";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { AgendamentoWithExames, ClienteContratoRecord } from "@/lib/types";
import {
  buscarContratoPorOrcamentoId,
  carregarAgendamentosVigenciaContrato,
  dispensarAgendamentosIniciaisContrato,
  reabrirAgendamentosIniciaisContrato,
  salvarSelecaoAgendamentosContrato,
  type AgendamentoNaVigenciaItem,
} from "@/services/contrato-agendamentos.service";
import {
  atualizarObservacaoCreditoAso,
  listarCreditosDoContrato,
  registrarCreditosAsoEmAberto,
  removerCreditoAsoEmAberto,
} from "@/services/contrato-creditos-aso.service";
import {
  listarVagasDoContrato,
  ocuparVagasAbertasComCreditos,
  liberarVagaPorCreditoRemovido,
  reconciliarVagasComprometidasDoContrato,
} from "@/services/contrato-vagas.service";
import {
  criarExameFuturoImplantacao,
  listarProgramacoesFuturasDoContrato,
  listarSugestoesColaboradoresContrato,
  type PeriodicoProgramadoContrato,
} from "@/services/contrato-programacao-futura.service";

interface OrcamentoAbaAgendamentosProps {
  orcamentoId: string;
  aprovacao: OrcamentoAprovacaoRecord;
  usuarioNome: string;
  clienteNome?: string;
  clienteCnpj?: string | null;
  clienteId?: string | null;
  onContagemChange?: (contagem: ContratoAgendamentoContagem) => void;
  onIrParaListaFuncionarios?: () => void;
}

function Card({
  label,
  value,
  alert,
  title,
}: {
  label: string;
  value: string;
  alert?: boolean;
  title?: string;
}) {
  return (
    <div
      title={title}
      className={
        alert
          ? "rounded-xl border border-[#fbbf24] bg-[#fffbeb] px-3.5 py-3 shadow-[0_2px_10px_rgba(245,158,11,0.08)]"
          : "rounded-xl border border-[#e4ebf4] bg-white px-3.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
      }
    >
      <p
        className={
          alert
            ? "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#b45309]"
            : "text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]"
        }
      >
        {alert ? (
          <span aria-hidden className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M8.866 2.5a1 1 0 0 0-1.732 0l-5.5 9.5A1 1 0 0 0 2.5 13.5h11a1 1 0 0 0 .866-1.5l-5.5-9.5zM8 6.25a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2A.75.75 0 0 1 8 6.25zm0 5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75z" />
            </svg>
          </span>
        ) : null}
        {label}
      </p>
      <p
        className={
          alert
            ? "mt-1 text-xl font-extrabold tabular-nums text-[#92400e]"
            : "mt-1 text-xl font-extrabold tabular-nums text-navy"
        }
      >
        {value}
      </p>
    </div>
  );
}

function VagaSituacaoBadge({ status }: { status: ContratoVagaStatus }) {
  const map: Record<ContratoVagaStatus, string> = {
    aberta: "bg-[#fffbeb] text-[#b45309]",
    comprometida: "bg-[#ffedd5] text-[#c2410c]",
    aso_aberto: "bg-[#e0f2fe] text-[#0369a1]",
    agendada: "bg-brand-green-soft text-brand-green",
    programada: "bg-[#eef2ff] text-[#4338ca]",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${map[status]}`}
    >
      {CONTRATO_VAGA_STATUS_LABELS[status]}
    </span>
  );
}

function ClassificacaoBadge({
  tipo,
}: {
  tipo: "contrato" | "adicional" | "cancelado";
}) {
  const map = {
    contrato: {
      label: "Contrato",
      className: "bg-brand-green-soft text-brand-green",
    },
    adicional: {
      label: "Adicional",
      className: "bg-[#ffedd5] text-[#c2410c]",
    },
    cancelado: {
      label: "Cancelado",
      className: "bg-brand-red-soft text-brand-red",
    },
  } as const;
  const cfg = map[tipo];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

/** Checkbox com aparência circular (multi-seleção). */
function SelecaoCircular({
  checked,
  disabled,
  title,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  title?: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`inline-flex items-center justify-center ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      }`}
      title={title}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span
        aria-hidden
        className={`
          relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center
          rounded-full border transition-colors
          ${
            disabled
              ? "border-[#cbd5e1] bg-[#f1f5f9]"
              : checked
                ? "border-brand-blue bg-brand-blue"
                : "border-[#94a3b8] bg-white hover:border-brand-blue"
          }
          peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-blue
        `}
      >
        {checked && !disabled ? (
          <svg
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 6.2 5 8.5 9.5 3.5" />
          </svg>
        ) : null}
        {checked && disabled ? (
          <span className="h-1.5 w-1.5 rounded-full bg-[#94a3b8]" />
        ) : null}
      </span>
    </label>
  );
}

export function OrcamentoAbaAgendamentos({
  orcamentoId,
  aprovacao,
  usuarioNome,
  clienteNome,
  clienteCnpj,
  clienteId,
  onContagemChange,
  onIrParaListaFuncionarios,
}: OrcamentoAbaAgendamentosProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dispensaSaving, setDispensaSaving] = useState(false);
  const [reabrirSaving, setReabrirSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contrato, setContrato] = useState<ClienteContratoRecord | null>(null);
  const [itens, setItens] = useState<AgendamentoNaVigenciaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewAgendamento, setViewAgendamento] =
    useState<AgendamentoWithExames | null>(null);
  const [dispensaModalOpen, setDispensaModalOpen] = useState(false);
  const [reabrirModalOpen, setReabrirModalOpen] = useState(false);
  const [exameFuturoModalOpen, setExameFuturoModalOpen] = useState(false);
  const [exameFuturoSaving, setExameFuturoSaving] = useState(false);
  const [asoAbertoModalOpen, setAsoAbertoModalOpen] = useState(false);
  const [asoAbertoSaving, setAsoAbertoSaving] = useState(false);
  const [creditosAso, setCreditosAso] = useState<ContratoCreditoAsoRecord[]>(
    []
  );
  const [programacoes, setProgramacoes] = useState<
    PeriodicoProgramadoContrato[]
  >([]);
  const [sugestoesColaboradores, setSugestoesColaboradores] = useState<
    ColaboradorSugestao[]
  >([]);
  const [vagas, setVagas] = useState<ContratoVagaRecord[]>([]);

  const onContagemChangeRef = useRef(onContagemChange);
  onContagemChangeRef.current = onContagemChange;

  const quantidadePrevista =
    Number(aprovacao.quantidade_colaboradores) ||
    Number(contrato?.quantidade_colaboradores) ||
    0;

  const dispensado = contratoTemAgendamentosIniciaisDispensados(contrato);
  const programacoesAtivas = programacoes.length;
  const creditosDisponiveis = creditosAso.filter(
    (c) => c.status === "disponivel"
  ).length;
  const vagasComprometidas = vagas.filter((v) => v.status === "comprometida").length;

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const contratoRow = await buscarContratoPorOrcamentoId(orcamentoId);
        setContrato(contratoRow);
        const qtd =
          Number(aprovacao.quantidade_colaboradores) ||
          Number(contratoRow?.quantidade_colaboradores) ||
          0;

        if (!contratoRow) {
          const empty = buildContratoAgendamentoContagem(qtd, 0, 0);
          setItens([]);
          setSelectedIds(new Set());
          setProgramacoes([]);
          setCreditosAso([]);
          setVagas([]);
          setSugestoesColaboradores([]);
          onContagemChangeRef.current?.(empty);
          return;
        }

        try {
          await reconciliarVagasComprometidasDoContrato({
            contratoId: contratoRow.id,
            usuarioNome,
          });
        } catch (reconcileErr) {
          console.error(
            "Erro ao reconciliar vagas comprometidas com agendamentos:",
            reconcileErr
          );
        }

        const [resumo, progs, creditos, vagasContrato] = await Promise.all([
          carregarAgendamentosVigenciaContrato({
            contrato: contratoRow,
            quantidadeContratada: qtd,
            clienteNomeOrcamento: clienteNome,
          }),
          listarProgramacoesFuturasDoContrato(contratoRow.id),
          listarCreditosDoContrato(contratoRow.id),
          listarVagasDoContrato(contratoRow.id).catch(() => [] as ContratoVagaRecord[]),
        ]);
        const itensDoCliente = resumo.itens.filter((i) =>
          agendamentoPertenceAoClienteContrato(
            {
              cliente_id: i.agendamento.cliente_id,
              cliente_nome: i.agendamento.cliente_nome,
            },
            {
              id: contratoRow.cliente_id,
              nome: clienteNome,
              nomes: [clienteNome],
            }
          )
        );
        setItens(itensDoCliente);
        setProgramacoes(progs);
        setCreditosAso(creditos);
        setVagas(vagasContrato);
        setSelectedIds(
          new Set(
            itensDoCliente
              .filter((i) => i.selecionado)
              .map((i) => i.agendamento.id)
          )
        );

        const nomesCliente = [clienteNome?.trim()].filter(
          (n): n is string => Boolean(n)
        );
        if (contratoRow.cliente_id || nomesCliente.length > 0) {
          try {
            const sug = await listarSugestoesColaboradoresContrato({
              clienteId: contratoRow.cliente_id,
              clienteNomes: nomesCliente,
            });
            setSugestoesColaboradores(sug);
          } catch {
            setSugestoesColaboradores([]);
          }
        } else {
          setSugestoesColaboradores([]);
        }

        onContagemChangeRef.current?.(resumo.contagem);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar agendamentos do contrato."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [aprovacao.quantidade_colaboradores, clienteNome, orcamentoId, usuarioNome]
  );

  // Carrega uma vez ao montar (abrir modal / entrar na aba). Sem polling.
  useEffect(() => {
    void load();
  }, [load]);

  const contagemPreview = useMemo(() => {
    const adicionaisLegado = itens.filter((i) =>
      isAgendamentoSelecionavel(i.agendamento.status) &&
      (dispensado || !selectedIds.has(i.agendamento.id))
    ).length;
    const utilizadosAg = dispensado
      ? 0
      : itens.filter(
          (i) =>
            selectedIds.has(i.agendamento.id) &&
            isAgendamentoSelecionavel(i.agendamento.status)
        ).length;
    const agendamentosValidos = itens
      .filter((i) => isAgendamentoSelecionavel(i.agendamento.status))
      .map((i) => ({
        id: i.agendamento.id,
        colaborador_cpf: i.agendamento.colaborador_cpf,
      }));

    return buildContagemContratoComVagas({
      quantidadePrevista,
      vagas,
      utilizadosAg,
      programadosLegado: programacoesAtivas,
      emAbertoLegado: creditosDisponiveis,
      vagasComprometidasLegado: vagasComprometidas,
      adicionaisLegado,
      dispensado,
      agendamentosValidos,
    });
  }, [
    itens,
    selectedIds,
    quantidadePrevista,
    dispensado,
    programacoesAtivas,
    creditosDisponiveis,
    vagasComprometidas,
    vagas,
  ]);

  useEffect(() => {
    onContagemChangeRef.current?.(contagemPreview);
  }, [contagemPreview]);

  function toggleSelecao(item: AgendamentoNaVigenciaItem) {
    if (dispensado) {
      toast.error(
        "Os agendamentos iniciais deste contrato foram dispensados pelo cliente."
      );
      return;
    }
    if (!item.selecionavel) {
      if (item.bloqueadoOutroContrato) {
        toast.error(
          `Este agendamento já está contabilizado no contrato ${item.outroContratoNumero}.`
        );
      } else if (item.agendamento.status === "cancelado") {
        toast.error(
          "Agendamento cancelado não pode ser contabilizado no contrato."
        );
      }
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.agendamento.id)) {
        next.delete(item.agendamento.id);
        return next;
      }
      const nextIds = new Set(next);
      nextIds.add(item.agendamento.id);
      const cpfsNext = new Set(
        itens
          .filter((i) => nextIds.has(i.agendamento.id))
          .map((i) => normalizeCpfDigits(i.agendamento.colaborador_cpf))
          .filter((d) => d.length === 11)
      );
      const comprometidasNaoConsumidas = vagas.filter(
        (v) =>
          v.status === "comprometida" &&
          !cpfsNext.has(normalizeCpfDigits(v.colaborador_cpf))
      ).length;
      if (
        nextIds.size +
          programacoesAtivas +
          creditosDisponiveis +
          comprometidasNaoConsumidas >
        quantidadePrevista
      ) {
        toast.error(
          `A quantidade prevista de ${quantidadePrevista} colaboradores para este contrato já foi atingida.`
        );
        return prev;
      }
      return nextIds;
    });
  }

  async function handleConfirmarExameFuturo(
    data: InformarExameFuturoFormResult
  ) {
    if (!contrato) return;
    setExameFuturoSaving(true);
    try {
      const empresa =
        clienteNome?.trim() ||
        itens[0]?.agendamento.cliente_nome?.trim() ||
        "";
      if (!empresa) {
        toast.error("Não foi possível identificar a empresa do contrato.");
        return;
      }
      await criarExameFuturoImplantacao({
        contratoId: contrato.id,
        clienteNome: empresa,
        colaborador: data.colaborador,
        colaboradorCpf: data.colaboradorCpf,
        tipoAso: data.tipoAso,
        dataPrevistaIso: data.dataPrevistaIso,
        motivo: data.motivo,
        motivoDetalhe: data.motivoDetalhe,
        observacoes: data.observacoes,
        criadoPor: usuarioNome,
      });
      toast.success("Exame futuro programado e vaga do contrato consumida.");
      setExameFuturoModalOpen(false);
      await load({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o exame futuro."
      );
    } finally {
      setExameFuturoSaving(false);
    }
  }

  async function handleConfirmarAsoEmAberto(
    data: RegistrarAsoEmAbertoFormResult
  ) {
    if (!contrato || asoAbertoSaving) return;
    setAsoAbertoSaving(true);
    try {
      const created = await registrarCreditosAsoEmAberto({
        contratoId: contrato.id,
        orcamentoId,
        clienteId: contrato.cliente_id,
        clienteCnpj: clienteCnpj ?? null,
        quantidade: data.quantidade,
        observacao: data.observacao,
        validoAte: contrato.data_fim,
        usuarioNome,
        numeroContrato: contrato.numero,
      });
      await ocuparVagasAbertasComCreditos({
        contratoId: contrato.id,
        creditoIds: created.map((c) => c.id),
      });
      toast.success(
        data.quantidade === 1
          ? "1 ASO contratual em aberto registrado."
          : `${data.quantidade} ASOs contratuais em aberto registrados.`
      );
      setAsoAbertoModalOpen(false);
      await load({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível registrar o ASO em aberto."
      );
    } finally {
      setAsoAbertoSaving(false);
    }
  }

  async function handleRemoverCredito(credito: ContratoCreditoAsoRecord) {
    if (
      !window.confirm(
        "Remover a classificação deste ASO em aberto? A vaga voltará para Pendentes de definição e o progresso será recalculado."
      )
    ) {
      return;
    }
    try {
      await removerCreditoAsoEmAberto({
        creditoId: credito.id,
        usuarioNome,
        numeroContrato: contrato?.numero ?? null,
      });
      await liberarVagaPorCreditoRemovido(credito.id);
      toast.success("Classificação de ASO em aberto removida.");
      await load({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível remover o crédito."
      );
    }
  }

  async function handleEditarObservacaoCredito(
    credito: ContratoCreditoAsoRecord
  ) {
    const atual = credito.observacao ?? "";
    const next = window.prompt("Observação do ASO em aberto:", atual);
    if (next === null) return;
    try {
      await atualizarObservacaoCreditoAso({
        creditoId: credito.id,
        observacao: next.trim() || null,
        usuarioNome,
      });
      toast.success("Observação atualizada.");
      await load({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar a observação."
      );
    }
  }

  function handleAgendarVaga(vaga: ContratoVagaRecord) {
    const empresa = clienteNome?.trim() || "";
    const colaborador = labelColaboradorOuVaga(vaga);
    if (!empresa || !isNomeFuncionarioReal(vaga.colaborador)) {
      toast.error("Preencha o funcionário na Lista de funcionários antes de agendar.");
      return;
    }
    saveAgendamentoPrefill({
      cliente_nome: empresa,
      cliente_id: contrato?.cliente_id || clienteId || undefined,
      colaborador: vaga.colaborador ?? colaborador,
      colaborador_cpf: vaga.colaborador_cpf
        ? maskCPFInput(vaga.colaborador_cpf)
        : undefined,
      cargo_id: vaga.cargo_id ?? undefined,
      cargo_nome: vaga.cargo_nome ?? undefined,
      cliente_cnpj: clienteCnpj ?? undefined,
      contrato_id: contrato?.id,
      contrato_numero: contrato?.numero ?? undefined,
      vaga_id: vaga.id,
      aso: "Admissional",
    });
    router.push("/");
  }

  async function handleSalvar() {
    if (!contrato) {
      toast.error("Contrato não encontrado para este orçamento.");
      return;
    }
    if (dispensado) {
      toast.error(
        "Os agendamentos iniciais deste contrato foram dispensados pelo cliente."
      );
      return;
    }
    setSaving(true);
    try {
      await salvarSelecaoAgendamentosContrato({
        contratoId: contrato.id,
        agendamentoIdsSelecionados: Array.from(selectedIds).filter((id) => {
          const item = itens.find((i) => i.agendamento.id === id);
          return item
            ? isAgendamentoSelecionavel(item.agendamento.status) &&
                !item.bloqueadoOutroContrato
            : false;
        }),
        usuarioNome,
        quantidadePrevista,
      });
      toast.success("Agendamentos do contrato salvos.");
      await load({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar seleção."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEscolherNao() {
    if (!contrato) {
      toast.error("Contrato não encontrado para este orçamento.");
      return;
    }
    if (selectedIds.size > 0) {
      toast.error(
        `Este contrato já possui ${selectedIds.size} agendamento${
          selectedIds.size === 1 ? "" : "s"
        } contabilizado${
          selectedIds.size === 1 ? "" : "s"
        }. Remova os vínculos antes de registrar que o cliente não realizará os agendamentos iniciais.`
      );
      return;
    }
    setDispensaModalOpen(true);
  }

  async function handleConfirmarDispensa(motivo: string) {
    if (!contrato) return;
    setDispensaSaving(true);
    try {
      await dispensarAgendamentosIniciaisContrato({
        contratoId: contrato.id,
        motivo,
        usuarioNome,
        quantidadePrevista,
        clienteNome,
      });
      toast.success("Dispensa dos agendamentos iniciais registrada.");
      setDispensaModalOpen(false);
      await load({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao registrar dispensa."
      );
    } finally {
      setDispensaSaving(false);
    }
  }

  async function handleConfirmarReabertura(motivo: string) {
    if (!contrato) return;
    setReabrirSaving(true);
    try {
      await reabrirAgendamentosIniciaisContrato({
        contratoId: contrato.id,
        motivo,
        usuarioNome,
        clienteNome,
      });
      toast.success("Agendamentos iniciais reabertos.");
      setReabrirModalOpen(false);
      await load({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao reabrir agendamentos."
      );
    } finally {
      setReabrirSaving(false);
    }
  }

  const grupos = useMemo(() => {
    const doContrato: AgendamentoNaVigenciaItem[] = [];
    const demais: AgendamentoNaVigenciaItem[] = [];
    const cancelados: AgendamentoNaVigenciaItem[] = [];
    for (const item of itens) {
      const selecionado = !dispensado && selectedIds.has(item.agendamento.id);
      if (item.agendamento.status === "cancelado") {
        cancelados.push({ ...item, selecionado: false });
      } else if (selecionado) {
        doContrato.push({ ...item, selecionado: true });
      } else {
        demais.push({ ...item, selecionado: false });
      }
    }
    return { doContrato, demais, cancelados };
  }, [itens, selectedIds, dispensado]);

  function renderTabela(
    titulo: string,
    rows: AgendamentoNaVigenciaItem[],
    atenuada?: boolean
  ) {
    if (rows.length === 0) return null;
    return (
      <div className={atenuada ? "opacity-70" : undefined}>
        <div className="border-b border-[#eef2f7] bg-[#f8fafc] px-4 py-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#64748b]">
            {titulo}
          </p>
        </div>
        <table className="table-premium w-full min-w-[860px]">
          <thead>
            <tr>
              <th className="w-[56px] text-center">Sel.</th>
              <th>Colaborador</th>
              <th>Data do exame</th>
              <th>Horário</th>
              <th>Tipo de ASO</th>
              <th>Clínica</th>
              <th>Status</th>
              <th>Classificação</th>
              <th className="w-[72px] text-center">Visualizar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const ag = item.agendamento;
              const selecionado =
                !dispensado && selectedIds.has(ag.id);
              const classificacao = resolveClassificacaoAgendamento({
                status: ag.status,
                selecionado,
                dispensado,
              });
              const disabled =
                dispensado || (!item.selecionavel && !selecionado) || saving;
              const title = dispensado
                ? "Agendamentos iniciais dispensados — vínculo bloqueado"
                : ag.status === "cancelado"
                  ? "Agendamento cancelado não pode ser contabilizado no contrato."
                  : item.bloqueadoOutroContrato
                    ? `Já contabilizado em ${item.outroContratoNumero}`
                    : "Selecionar para o contrato";
              return (
                <tr key={ag.id}>
                  <td className="align-middle text-center">
                    <SelecaoCircular
                      checked={selecionado}
                      disabled={disabled}
                      title={title}
                      onChange={() => toggleSelecao(item)}
                    />
                  </td>
                  <td className="align-middle font-semibold text-navy">
                    {ag.colaborador}
                  </td>
                  <td>{formatDateIsoToBR(ag.data_agendamento)}</td>
                  <td>{formatHorarioForForm(ag.horario) || "—"}</td>
                  <td>{ag.aso || "—"}</td>
                  <td>{ag.clinica_nome || "—"}</td>
                  <td>{statusAgendamentoLabel(ag.status)}</td>
                  <td>
                    <ClassificacaoBadge tipo={classificacao} />
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dbe3ef] text-brand-blue hover:bg-[#eff6ff]"
                      title="Visualizar agendamento"
                      onClick={() => setViewAgendamento(ag)}
                    >
                      <IconEye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const showInitialLoading = loading && itens.length === 0;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
        <div className="border-b border-[#eef2f7] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
            Agendamentos do contrato
          </p>
          <p className="mt-0.5 text-xs text-[#64748b]">
            {dispensado
              ? "Os agendamentos iniciais foram dispensados. Novos exames não consomem a previsão inicial."
              : `Selecione até ${quantidadePrevista || "—"} agendamentos para contabilizar na previsão inicial. Demais permanecem como adicionais.`}
          </p>
        </div>

        {contrato ? (
          <div className="border-b border-[#eef2f7] px-4 py-3">
            {dispensado ? (
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
                <p className="text-sm font-extrabold text-navy">
                  Cliente optou por não realizar os agendamentos iniciais.
                </p>
                <div className="mt-2 grid gap-1 text-xs text-[#475569] sm:grid-cols-2">
                  <p>
                    <span className="font-bold text-navy">Previstos:</span>{" "}
                    {quantidadePrevista || "—"}
                  </p>
                  <p>
                    <span className="font-bold text-navy">Data da decisão:</span>{" "}
                    {formatCreatedAtBR(contrato.dispensado_em)}
                  </p>
                  <p className="sm:col-span-2">
                    <span className="font-bold text-navy">Motivo:</span>{" "}
                    {contrato.motivo_dispensa_agendamentos || "—"}
                  </p>
                  <p>
                    <span className="font-bold text-navy">Responsável:</span>{" "}
                    {contrato.dispensado_por || "—"}
                  </p>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    className="btn btn-muted text-xs"
                    disabled={reabrirSaving || loading}
                    onClick={() => setReabrirModalOpen(true)}
                  >
                    Reabrir agendamentos iniciais
                  </button>
                </div>
              </div>
            ) : (
              <fieldset className="space-y-2">
                <legend className="text-sm font-extrabold text-navy">
                  O cliente deseja realizar os agendamentos iniciais previstos no
                  contrato?
                </legend>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#334155]">
                    <input
                      type="radio"
                      name="deseja-agendamentos-iniciais"
                      checked
                      readOnly
                      className="accent-brand-blue"
                    />
                    Sim
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#334155]">
                    <input
                      type="radio"
                      name="deseja-agendamentos-iniciais"
                      checked={false}
                      disabled={!contrato || saving || loading}
                      onChange={handleEscolherNao}
                      className="accent-brand-blue"
                    />
                    Não
                  </label>
                </div>
              </fieldset>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <Card label="Previstos" value={String(contagemPreview.previstos)} />
          <Card
            label="Agendados"
            value={String(contagemPreview.agendados)}
          />
          <Card
            label="Programados p/ futuro"
            value={String(contagemPreview.programadosFuturos)}
          />
          <Card
            label="Pendentes de definição"
            value={String(contagemPreview.pendentesDefinicao)}
            alert={contagemPreview.pendentesDefinicao > 0}
            title={
              contagemPreview.pendentesDefinicao > 0
                ? contagemPreview.pendentesDefinicao === 1
                  ? "Existe 1 vaga do contrato que ainda precisa ser agendada, programada para o futuro ou mantida como ASO em aberto."
                  : `Existem ${contagemPreview.pendentesDefinicao} vagas do contrato que ainda precisam ser agendadas, programadas para o futuro ou mantidas como ASO em aberto.`
                : undefined
            }
          />
          <Card
            label="ASOs em aberto"
            value={String(contagemPreview.emAberto)}
          />
          <Card
            label="Comprometidos"
            value={String(contagemPreview.vagasComprometidas)}
            title="Funcionários já identificados na lista, ainda sem agendamento."
          />
          {dispensado ? (
            <Card
              label="Situação"
              value={contagemPreview.situacaoLabel || "Dispensados"}
            />
          ) : (
            <Card
              label="Adicionais"
              value={String(contagemPreview.adicionais)}
            />
          )}
          <Card label="Progresso" value={contagemPreview.progressoLabel} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f7] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-navy">
              {contagemPreview.mensagem}
            </p>
            {contagemPreview.mensagemComplemento ? (
              <p className="mt-1 text-xs text-[#64748b]">
                {contagemPreview.mensagemComplemento}
              </p>
            ) : null}
            {contrato?.numero ? (
              <p className="mt-1 text-xs text-[#64748b]">
                Contrato: {contrato.numero}
                {contrato.data_inicio && contrato.data_fim
                  ? ` · Vigência ${formatDateIsoToBR(contrato.data_inicio)} a ${formatDateIsoToBR(contrato.data_fim)}`
                  : ""}
              </p>
            ) : (
              <p className="mt-1 text-xs text-[#b45309]">
                Contrato ainda não vinculado a este orçamento.
              </p>
            )}
            {dispensado ? (
              <p className="mt-1 text-xs font-semibold text-[#64748b]">
                Substatus: Agendamentos iniciais dispensados pelo cliente
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!dispensado && contagemPreview.pendentesDefinicao > 0 ? (
              <>
                <button
                  type="button"
                  className="btn btn-muted text-xs"
                  disabled={saving || loading || !contrato || exameFuturoSaving}
                  onClick={() => setExameFuturoModalOpen(true)}
                >
                  Informar exame futuro
                </button>
                <button
                  type="button"
                  className="btn btn-muted text-xs"
                  disabled={
                    saving || loading || !contrato || asoAbertoSaving
                  }
                  onClick={() => setAsoAbertoModalOpen(true)}
                >
                  Manter ASO em aberto
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="btn btn-muted text-xs"
              disabled={saving || loading || refreshing}
              onClick={() => void load({ silent: true })}
            >
              {refreshing ? "Atualizando..." : "Atualizar lista"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || loading || !contrato || dispensado}
              onClick={() => void handleSalvar()}
              title={
                dispensado
                  ? "Seleção bloqueada: agendamentos iniciais dispensados"
                  : undefined
              }
            >
              {saving ? "Salvando..." : "Salvar agendamentos do contrato"}
            </button>
          </div>
        </div>
      </section>

      {!dispensado && vagas.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
          <div className="border-b border-[#eef2f7] px-4 py-3">
            <h3 className="text-sm font-extrabold text-navy">
              Vagas do contrato
            </h3>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Funcionários e vagas definidos na Lista de funcionários.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th className="border-b px-4 py-2 font-bold text-navy">
                    Colaborador/vaga
                  </th>
                  <th className="border-b px-4 py-2 font-bold text-navy">
                    Cargo
                  </th>
                  <th className="border-b px-4 py-2 font-bold text-navy">
                    Situação
                  </th>
                  <th className="border-b px-4 py-2 font-bold text-navy">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {vagas.map((vaga) => (
                  <tr key={vaga.id} className="odd:bg-white even:bg-[#fbfdff]">
                    <td className="border-b border-[#eef2f7] px-4 py-2.5 font-semibold text-navy">
                      {labelColaboradorOuVaga(vaga)}
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-2.5 text-[#475569]">
                      {vaga.cargo_nome?.trim() || "—"}
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-2.5">
                      <VagaSituacaoBadge status={vaga.status} />
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-2.5">
                      {vaga.status === "comprometida" ? (
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-brand-blue hover:underline"
                          onClick={() => handleAgendarVaga(vaga)}
                        >
                          Agendar
                        </button>
                      ) : null}
                      {vaga.status === "aberta" || vaga.status === "aso_aberto" ? (
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-brand-blue hover:underline"
                          onClick={() => onIrParaListaFuncionarios?.()}
                        >
                          Definir funcionário
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
        {dispensado ? (
          <div className="border-b border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-xs font-semibold text-[#92400e]">
            Os agendamentos iniciais deste contrato foram dispensados pelo
            cliente. Novos agendamentos não serão contabilizados na previsão
            inicial.
          </div>
        ) : null}
        <div className="overflow-x-auto">
          {showInitialLoading ? (
            <p className="px-4 py-8 text-center text-sm text-app-muted">
              Carregando...
            </p>
          ) : null}
          {!showInitialLoading && error && itens.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-brand-red">{error}</p>
          ) : null}
          {!showInitialLoading && !error && itens.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-app-muted">
              Nenhum agendamento encontrado na vigência deste contrato.
            </p>
          ) : null}
          {!showInitialLoading && itens.length > 0 ? (
            <>
              {renderTabela("Agendamentos do contrato", grupos.doContrato)}
              {renderTabela(
                dispensado
                  ? "Agendamentos da vigência (adicionais / histórico)"
                  : "Demais agendamentos da vigência",
                grupos.demais
              )}
              {renderTabela("Cancelados", grupos.cancelados, true)}
            </>
          ) : null}
        </div>
      </section>

      {!dispensado && programacoes.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
          <div className="border-b border-[#eef2f7] px-4 py-3">
            <h3 className="text-sm font-extrabold text-navy">
              Exames programados para o futuro
            </h3>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Vagas do contrato já consumidas com realização prevista
              posteriormente.
            </p>
          </div>
          <ul className="divide-y divide-[#f1f5f9]">
            {programacoes.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <p className="text-sm font-extrabold text-navy">
                  {p.colaborador}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-[#475569]">
                  {p.tipo_aso || p.exame_nome || "—"}
                </p>
                <div className="mt-2 grid gap-1 text-xs text-[#64748b] sm:grid-cols-2">
                  <p>
                    <span className="font-bold text-navy">Previsto para:</span>{" "}
                    {formatMesAnoPrevisto(p.proxima_data)}
                  </p>
                  <p>
                    <span className="font-bold text-navy">Motivo:</span>{" "}
                    {labelMotivoExameFuturo(p.motivo, p.motivo_detalhe)}
                  </p>
                  <p>
                    <span className="font-bold text-navy">Origem:</span>{" "}
                    {labelOrigemPeriodico(p.origem)}
                  </p>
                  <p>
                    <span className="font-bold text-navy">Status:</span>{" "}
                    {p.status === "reagendado" ? "Atendido" : "Programado"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!dispensado ? (
        <AsosContratuaisEmAbertoSection
          creditos={creditosAso}
          numeroContrato={contrato?.numero ?? null}
          onEditarObservacao={(c) => {
            void handleEditarObservacaoCredito(c);
          }}
          onRemover={(c) => {
            void handleRemoverCredito(c);
          }}
        />
      ) : null}

      <AgendamentoViewModal
        agendamento={viewAgendamento}
        onClose={() => setViewAgendamento(null)}
      />

      <DispensaAgendamentosIniciaisModal
        open={dispensaModalOpen}
        quantidadePrevista={quantidadePrevista}
        numeroContrato={contrato?.numero ?? null}
        saving={dispensaSaving}
        onClose={() => setDispensaModalOpen(false)}
        onConfirm={(motivo) => void handleConfirmarDispensa(motivo)}
      />

      <ReabrirAgendamentosIniciaisModal
        open={reabrirModalOpen}
        numeroContrato={contrato?.numero ?? null}
        saving={reabrirSaving}
        onClose={() => setReabrirModalOpen(false)}
        onConfirm={(motivo) => void handleConfirmarReabertura(motivo)}
      />

      <InformarExameFuturoModal
        open={exameFuturoModalOpen}
        saving={exameFuturoSaving}
        numeroContrato={contrato?.numero ?? null}
        sugestoes={sugestoesColaboradores}
        onClose={() => setExameFuturoModalOpen(false)}
        onConfirm={(data) => void handleConfirmarExameFuturo(data)}
      />

      <RegistrarAsoEmAbertoModal
        open={asoAbertoModalOpen}
        saving={asoAbertoSaving}
        numeroContrato={contrato?.numero ?? null}
        quantidadePrevista={quantidadePrevista}
        quantidadeVinculada={
          contagemPreview.agendados + contagemPreview.programadosFuturos
        }
        quantidadeDisponivel={contagemPreview.pendentesDefinicao}
        dataFim={contrato?.data_fim ?? null}
        onClose={() => setAsoAbertoModalOpen(false)}
        onConfirm={(data) => void handleConfirmarAsoEmAberto(data)}
      />
    </div>
  );
}
