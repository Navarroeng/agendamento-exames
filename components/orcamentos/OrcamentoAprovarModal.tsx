"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { RequiredMark } from "@/components/ui/Field";
import { formatDateIsoToBR, isValidHorario24 } from "@/lib/agendamento-datetime";
import { emptyToNull, formatCurrency, maskMoneyInput, parseMoney } from "@/lib/money";
import { formatDateTimeBR } from "@/lib/format-datetime";
import {
  ORCAMENTO_CONTRATO_DOCUMENTAL_LABELS,
  ORCAMENTO_FINANCEIRO_ANDAMENTO_LABELS,
  aprovacaoSegueOrcamentoOriginal,
  buildAprovacaoDiffs,
  buildAprovacaoFormFromOrcamento,
  buildAprovacaoFormFromRecord,
  buildResumoComercialOrcamento,
  formatCondicaoAprovada,
  resolveContratoDocumentalAndamento,
  resolveFinanceiroAndamento,
  type OrcamentoAprovacaoCondicoesHistoricoRecord,
  type OrcamentoAprovacaoFormValues,
  type OrcamentoAprovacaoRecord,
  type OrcamentoContratoDocumentalUpdatePayload,
  type OrcamentoFinanceiroUpdatePayload,
} from "@/lib/orcamento-aprovacao";
import {
  ORCAMENTO_APROVACAO_CNPJ_OBRIGATORIO_MSG,
  resolveOrcamentoCnpjDigits,
} from "@/lib/orcamento-aprovacao-integracao";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import { calcValorParcela } from "@/lib/orcamento-pagamento";
import {
  ORCAMENTO_STATUS_BADGE,
  ORCAMENTO_STATUS_LABELS,
  type OrcamentoComItens,
  type ServicoSstRecord,
} from "@/lib/orcamento-types";
import { OrcamentoEtapasNav } from "./OrcamentoEtapasNav";
import {
  OrcamentoAbaLogo,
  OrcamentoAbaProcuracao,
  OrcamentoAbaVisitaTecnica,
} from "./OrcamentoEtapasExtras";
import { OrcamentoAbaFuncionarios } from "./OrcamentoAbaFuncionarios";
import { OrcamentoAbaAgendamentos } from "./OrcamentoAbaAgendamentos";
import {
  emptyTreinamentoForm,
  OrcamentoAbaTreinamento,
  type OrcamentoAbaTreinamentoForm,
} from "./OrcamentoAbaTreinamento";
import { OrcamentoViewBody } from "./OrcamentoViewBody";
import {
  isOrcamentoEtapaLiberada,
  type OrcamentoEtapaId,
  type OrcamentoEtapasContexto,
} from "@/lib/orcamento-etapas";
import { buildMensagemVisitaTecnica } from "@/lib/orcamento-visita-mensagem";
import type { ContratoAgendamentoContagem } from "@/lib/contrato-agendamentos";
import {
  isProcuracaoStatusConcluida,
  normalizeProcuracaoStatus,
  type ProcuracaoStatus,
} from "@/lib/cliente-procuracao";
import {
  buildMensagemConfirmacaoTreinamento,
  validateTreinamentoPayload,
  type ImplantacaoTreinamentoEventoRecord,
  type ImplantacaoTreinamentoRecord,
  type ImplantacaoTreinamentoSavePayload,
} from "@/lib/implantacao-treinamento";
import {
  classifyOrcamentoFluxoImplantacao,
  resolveItensParaFluxoImplantacao,
  resolveTreinamentosServicoId,
} from "@/lib/servico-treinamentos";

type TabId = OrcamentoEtapaId;

interface OrcamentoAprovarModalProps {
  open: boolean;
  mode?: "consulta" | "aprovacao";
  /** Aba inicial ao abrir (ex.: etapa atual da Implantação). */
  initialTab?: OrcamentoEtapaId | null;
  orcamento: OrcamentoComItens | null;
  aprovacao: OrcamentoAprovacaoRecord | null;
  servicos: ServicoSstRecord[];
  saving: boolean;
  usuarioNome: string;
  funcionariosPreviewUrl?: string | null;
  logoPreviewUrl?: string | null;
  onClose: () => void;
  onSalvarAprovacao: (form: OrcamentoAprovacaoFormValues) => Promise<void>;
  onAtualizarCondicoesAprovadas: (
    form: OrcamentoAprovacaoFormValues
  ) => Promise<void>;
  onListarHistoricoCondicoes: (
    aprovacaoId: string
  ) => Promise<OrcamentoAprovacaoCondicoesHistoricoRecord[]>;
  onSalvarContrato: (
    aprovacaoId: string,
    payload: OrcamentoContratoDocumentalUpdatePayload
  ) => Promise<void>;
  onSalvarFinanceiro: (
    aprovacaoId: string,
    payload: OrcamentoFinanceiroUpdatePayload,
    file: File | null
  ) => Promise<void>;
  onSalvarProcuracao: (
    aprovacaoId: string,
    payload: {
      procuracao_status: ProcuracaoStatus;
      observacao_procuracao: string | null;
    }
  ) => Promise<void>;
  onSalvarFuncionarios: (aprovacaoId: string, file: File | null) => Promise<void>;
  onSubstituirFuncionarios: (aprovacaoId: string, file: File) => Promise<void>;
  onRemoverFuncionarios: (aprovacaoId: string) => Promise<void>;
  onAprovacaoAtualizada?: (aprovacao: OrcamentoAprovacaoRecord) => void;
  onSalvarLogo: (
    aprovacaoId: string,
    file: File | null,
    possuiLogo: boolean
  ) => Promise<void>;
  onSubstituirLogo: (aprovacaoId: string, file: File) => Promise<void>;
  onRemoverLogo: (aprovacaoId: string) => Promise<void>;
  onSalvarVisita: (
    aprovacaoId: string,
    payload: {
      visita_tecnica_necessaria: boolean;
      visita_tecnica_data: string | null;
      visita_tecnica_horario: string | null;
      visita_tecnica_endereco: string | null;
      visita_tecnica_observacoes: string | null;
    }
  ) => Promise<void>;
  treinamento?: ImplantacaoTreinamentoRecord | null;
  treinamentoEventos?: ImplantacaoTreinamentoEventoRecord[];
  onSalvarTreinamento?: (
    aprovacaoId: string,
    payload: ImplantacaoTreinamentoSavePayload
  ) => Promise<void>;
  onVerComprovante: (path: string) => void;
}

const SIM_NAO = [
  { value: "nao", label: "Não" },
  { value: "sim", label: "Sim" },
] as const;

export function OrcamentoAprovarModal({
  open,
  mode = "aprovacao",
  initialTab = null,
  orcamento,
  aprovacao,
  servicos,
  saving,
  usuarioNome,
  funcionariosPreviewUrl = null,
  logoPreviewUrl = null,
  onClose,
  onSalvarAprovacao,
  onAtualizarCondicoesAprovadas,
  onListarHistoricoCondicoes,
  onSalvarContrato,
  onSalvarFinanceiro,
  onSalvarProcuracao,
  onSubstituirFuncionarios,
  onRemoverFuncionarios,
  onAprovacaoAtualizada,
  onSalvarLogo,
  onSubstituirLogo,
  onRemoverLogo,
  onSalvarVisita,
  treinamento = null,
  treinamentoEventos = [],
  onSalvarTreinamento,
  onVerComprovante,
}: OrcamentoAprovarModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabId>("resumo");
  const [form, setForm] = useState<OrcamentoAprovacaoFormValues | null>(null);
  const [showDiffConfirm, setShowDiffConfirm] = useState(false);
  const [editandoCondicoes, setEditandoCondicoes] = useState(false);
  const [historicoCondicoes, setHistoricoCondicoes] = useState<
    OrcamentoAprovacaoCondicoesHistoricoRecord[]
  >([]);

  const [contratoEnviado, setContratoEnviado] = useState(false);
  const [contratoEnviadoEm, setContratoEnviadoEm] = useState("");
  const [contratoAssinado, setContratoAssinado] = useState(false);
  const [contratoAssinadoEm, setContratoAssinadoEm] = useState("");
  const [observacaoContrato, setObservacaoContrato] = useState("");
  const [boletoVencimento, setBoletoVencimento] = useState("");
  const [boletoPago, setBoletoPago] = useState(false);
  const [boletoPagoEm, setBoletoPagoEm] = useState("");
  const [observacaoPagamento, setObservacaoPagamento] = useState("");
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);

  const [procuracaoStatus, setProcuracaoStatus] =
    useState<ProcuracaoStatus>("pendente");
  const [observacaoProcuracao, setObservacaoProcuracao] = useState("");
  const [funcionariosFile, setFuncionariosFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [possuiLogo, setPossuiLogo] = useState<boolean | null>(null);
  const [visitaNecessaria, setVisitaNecessaria] = useState<boolean | null>(null);
  const [visitaData, setVisitaData] = useState("");
  const [visitaHorario, setVisitaHorario] = useState("");
  const [visitaEndereco, setVisitaEndereco] = useState("");
  const [visitaObservacoes, setVisitaObservacoes] = useState("");
  const [agendamentosContagem, setAgendamentosContagem] =
    useState<ContratoAgendamentoContagem | null>(null);
  const [treinoForm, setTreinoForm] =
    useState<OrcamentoAbaTreinamentoForm>(emptyTreinamentoForm);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !orcamento) return;
    const treinamentosId = resolveTreinamentosServicoId(servicos);
    const itens = resolveItensParaFluxoImplantacao({
      aprovacaoItens: aprovacao?.orcamento_aprovacao_itens,
      orcamentoItens: orcamento.orcamento_itens,
    });
    const fluxo = classifyOrcamentoFluxoImplantacao(itens, treinamentosId);
    const orcamentoAprovadoInit =
      orcamento.status === "aprovado" || Boolean(aprovacao);
    const ctxInit: OrcamentoEtapasContexto = {
      fluxo,
      treinamento,
    };
    const tabInicial: TabId =
      initialTab &&
      isOrcamentoEtapaLiberada(
        initialTab,
        aprovacao,
        orcamentoAprovadoInit,
        ctxInit
      )
        ? initialTab
        : "resumo";
    setTab(tabInicial);
    setShowDiffConfirm(false);
    setEditandoCondicoes(false);
    setForm(
      aprovacao
        ? buildAprovacaoFormFromRecord(orcamento, aprovacao)
        : buildAprovacaoFormFromOrcamento(orcamento)
    );
    setContratoEnviado(Boolean(aprovacao?.contrato_enviado));
    setContratoEnviadoEm(aprovacao?.contrato_enviado_em ?? "");
    setContratoAssinado(Boolean(aprovacao?.contrato_assinado));
    setContratoAssinadoEm(aprovacao?.contrato_assinado_em ?? "");
    setObservacaoContrato(aprovacao?.observacao_contrato ?? "");
    setBoletoVencimento(aprovacao?.boleto_vencimento ?? "");
    setBoletoPago(Boolean(aprovacao?.boleto_pago));
    setBoletoPagoEm(aprovacao?.boleto_pago_em ?? "");
    setObservacaoPagamento(aprovacao?.observacao_pagamento ?? "");
    setComprovanteFile(null);
    setProcuracaoStatus(
      normalizeProcuracaoStatus(aprovacao?.procuracao_status)
    );
    setObservacaoProcuracao(aprovacao?.observacao_procuracao ?? "");
    setFuncionariosFile(null);
    setLogoFile(null);
    setPossuiLogo(
      aprovacao?.possui_logo == null
        ? aprovacao?.logo_path
          ? true
          : null
        : Boolean(aprovacao.possui_logo)
    );
    setAgendamentosContagem(null);
    setVisitaNecessaria(
      aprovacao?.visita_tecnica_necessaria == null
        ? null
        : Boolean(aprovacao.visita_tecnica_necessaria)
    );
    setVisitaData(aprovacao?.visita_tecnica_data ?? "");
    setVisitaHorario(aprovacao?.visita_tecnica_horario ?? "");
    setVisitaEndereco(aprovacao?.visita_tecnica_endereco ?? "");
    setVisitaObservacoes(aprovacao?.visita_tecnica_observacoes ?? "");
  }, [open, orcamento, aprovacao, mode, initialTab, servicos, treinamento]);

  useEffect(() => {
    if (!open) return;
    if (!treinamento) {
      setTreinoForm(emptyTreinamentoForm());
      return;
    }
    setTreinoForm({
      data_treinamento: treinamento.data_treinamento,
      horario_inicio: treinamento.horario_inicio,
      horario_termino: treinamento.horario_termino,
      modalidade: treinamento.modalidade,
      local_treinamento: treinamento.local_treinamento,
      endereco: treinamento.endereco,
      link_reuniao: treinamento.link_reuniao,
      tipo_nome: treinamento.tipo_nome,
      quantidade_participantes: treinamento.quantidade_participantes,
      instrutor_responsavel: treinamento.instrutor_responsavel,
      contato_empresa: treinamento.contato_empresa,
      observacoes: treinamento.observacoes,
      status: treinamento.status,
      motivo_cancelamento: treinamento.motivo_cancelamento,
      motivo_reagendamento: treinamento.motivo_reagendamento,
    });
  }, [open, treinamento]);

  useEffect(() => {
    if (!open || !aprovacao?.id) {
      setHistoricoCondicoes([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await onListarHistoricoCondicoes(aprovacao.id);
        if (!cancelled) setHistoricoCondicoes(rows);
      } catch (err) {
        console.error(err);
        if (!cancelled) setHistoricoCondicoes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, aprovacao?.id, onListarHistoricoCondicoes]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, saving]);

  const diffs = useMemo(() => {
    if (!orcamento || !form) return [];
    return buildAprovacaoDiffs(orcamento, form, parseMoney);
  }, [orcamento, form]);

  const andamentoDocumental = resolveContratoDocumentalAndamento(aprovacao);
  const andamentoFinanceiro = resolveFinanceiroAndamento(aprovacao);
  const consultaMode = mode === "consulta";
  const aprovadoLocked = Boolean(aprovacao) || consultaMode;
  const camposSomenteLeitura = consultaMode || saving;
  const acompanhamentoBloqueado = saving;
  const orcamentoAprovado =
    orcamento?.status === "aprovado" || Boolean(aprovacao);
  const fluxoImplantacao = useMemo(() => {
    if (!orcamento) return "padrao" as const;
    const treinamentosId = resolveTreinamentosServicoId(servicos);
    const itens = resolveItensParaFluxoImplantacao({
      aprovacaoItens: aprovacao?.orcamento_aprovacao_itens,
      orcamentoItens: orcamento.orcamento_itens,
    });
    return classifyOrcamentoFluxoImplantacao(itens, treinamentosId);
  }, [orcamento, aprovacao, servicos]);
  const etapasCtx: OrcamentoEtapasContexto = useMemo(
    () => ({
      fluxo: fluxoImplantacao,
      treinamento,
      contagem: agendamentosContagem
        ? {
            quantidadeContratada: agendamentosContagem.contratados,
            agendamentosRealizados: agendamentosContagem.realizados,
            agendamentosDispensados: agendamentosContagem.dispensado,
          }
        : aprovacao
          ? {
              quantidadeContratada:
                Number(aprovacao.quantidade_colaboradores) || 0,
              agendamentosRealizados: 0,
            }
          : null,
    }),
    [fluxoImplantacao, treinamento, agendamentosContagem, aprovacao]
  );
  const mensagemVisita = useMemo(
    () =>
      buildMensagemVisitaTecnica({
        data: visitaData,
        horario: visitaHorario,
        endereco: visitaEndereco,
      }),
    [visitaData, visitaHorario, visitaEndereco]
  );
  const mensagemTreinamento = useMemo(
    () =>
      buildMensagemConfirmacaoTreinamento({
        empresa: orcamento?.cliente_nome ?? "",
        treino: treinoForm,
      }),
    [orcamento?.cliente_nome, treinoForm]
  );

  const updateFormField = useCallback(
    <K extends keyof OrcamentoAprovacaoFormValues>(
      field: K,
      value: OrcamentoAprovacaoFormValues[K]
    ) => {
      setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  function iniciarEdicaoCondicoes() {
    if (!orcamento || !aprovacao) return;
    setForm({
      ...buildAprovacaoFormFromRecord(orcamento, aprovacao),
      condicoes_iguais: false,
    });
    setEditandoCondicoes(true);
  }

  function cancelarEdicaoCondicoes() {
    if (!orcamento || !aprovacao) return;
    setForm(buildAprovacaoFormFromRecord(orcamento, aprovacao));
    setEditandoCondicoes(false);
  }

  async function handleSalvarCondicoesEditadasClick() {
    if (!form || !aprovacao) return;
    if (
      !form.quantidade_colaboradores.trim() ||
      Number(form.quantidade_colaboradores) < 1
    ) {
      toast.error("Informe a quantidade de colaboradores.");
      return;
    }
    if (parseMoney(form.valor_final) <= 0) {
      toast.error("Informe o valor total fechado.");
      return;
    }
    if (
      form.forma_pagamento === "parcelado" &&
      (!form.quantidade_parcelas.trim() || Number(form.quantidade_parcelas) < 1)
    ) {
      toast.error("Informe a quantidade de parcelas.");
      return;
    }

    await onAtualizarCondicoesAprovadas({
      ...form,
      condicoes_iguais: false,
    });
    setEditandoCondicoes(false);
    try {
      const rows = await onListarHistoricoCondicoes(aprovacao.id);
      setHistoricoCondicoes(rows);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSalvarAprovacaoClick() {
    if (!form || !orcamento) return;

    if (!resolveOrcamentoCnpjDigits(orcamento.cliente_cnpj)) {
      toast.error(ORCAMENTO_APROVACAO_CNPJ_OBRIGATORIO_MSG);
      return;
    }

    if (!form.condicoes_iguais) {
      if (
        !form.quantidade_colaboradores.trim() ||
        Number(form.quantidade_colaboradores) < 1
      ) {
        toast.error("Informe a quantidade de colaboradores.");
        return;
      }
      if (parseMoney(form.valor_final) <= 0) {
        toast.error("Informe o valor total fechado.");
        return;
      }
      if (
        form.forma_pagamento === "parcelado" &&
        (!form.quantidade_parcelas.trim() || Number(form.quantidade_parcelas) < 1)
      ) {
        toast.error("Informe a quantidade de parcelas.");
        return;
      }
      if (!showDiffConfirm) {
        setShowDiffConfirm(true);
        return;
      }
    }

    await onSalvarAprovacao(form);
    setShowDiffConfirm(false);
    setTab("contrato");
  }

  async function handleSalvarContratoClick() {
    if (!aprovacao) return;

    if (contratoEnviado && !contratoEnviadoEm) {
      toast.error("Informe a data de envio do contrato.");
      return;
    }
    if (contratoAssinado && !contratoAssinadoEm) {
      toast.error("Informe a data de assinatura do contrato.");
      return;
    }

    const payload: OrcamentoContratoDocumentalUpdatePayload = {
      contrato_enviado: contratoEnviado,
      contrato_enviado_em: contratoEnviado ? contratoEnviadoEm || null : null,
      contrato_assinado: contratoAssinado,
      contrato_assinado_em: contratoAssinado ? contratoAssinadoEm || null : null,
      observacao_contrato: emptyToNull(observacaoContrato),
    };

    await onSalvarContrato(aprovacao.id, payload);
    if (contratoAssinado) {
      setTab("financeiro");
    }
  }

  async function handleSalvarFinanceiroClick() {
    if (!aprovacao) return;

    if (boletoPago) {
      if (!boletoPagoEm) {
        toast.error("Informe a data do pagamento.");
        return;
      }
      if (!comprovanteFile && !aprovacao.comprovante_path) {
        toast.error("Anexe o comprovante de pagamento.");
        return;
      }
      if (comprovanteFile && comprovanteFile.size > 5 * 1024 * 1024) {
        toast.error("O comprovante deve ter no máximo 5 MB.");
        return;
      }
    } else if (aprovacao.boleto_pago) {
      const ok = window.confirm(
        "Confirmar bloqueio do pagamento? O contrato voltará a bloquear agendamentos deste vínculo. O comprovante e o histórico serão preservados."
      );
      if (!ok) return;
    }

    const payload: OrcamentoFinanceiroUpdatePayload = {
      boleto_vencimento: boletoVencimento || null,
      boleto_pago: boletoPago,
      boleto_pago_em: boletoPago ? boletoPagoEm || null : aprovacao.boleto_pago_em,
      comprovante_path: aprovacao.comprovante_path,
      comprovante_nome: aprovacao.comprovante_nome,
      comprovante_tipo: aprovacao.comprovante_tipo,
      comprovante_tamanho: aprovacao.comprovante_tamanho,
      observacao_pagamento: emptyToNull(observacaoPagamento),
      pagamento_confirmado_por: usuarioNome,
    };

    await onSalvarFinanceiro(aprovacao.id, payload, comprovanteFile);
    setComprovanteFile(null);
    if (boletoPago) {
      if (
        fluxoImplantacao === "somente_treinamentos" ||
        fluxoImplantacao === "combinado"
      ) {
        setTab("treinamento");
      } else {
        setTab("procuracao");
      }
    }
  }

  async function handleSalvarProcuracaoClick() {
    if (!aprovacao) return;

    if (
      procuracaoStatus === "nao_necessaria" &&
      !observacaoProcuracao.trim()
    ) {
      toast.error(
        "Informe por que a procuração não será necessária para este cliente."
      );
      return;
    }

    const statusAnterior = normalizeProcuracaoStatus(
      aprovacao.procuracao_status
    );
    const estavaConcluida = isProcuracaoStatusConcluida(statusAnterior);
    if (estavaConcluida && procuracaoStatus === "pendente") {
      const ok = window.confirm(
        "Ao definir a procuração como Pendente, as próximas etapas serão bloqueadas novamente. Documentos e dados já salvos serão preservados. Deseja continuar?"
      );
      if (!ok) return;
    }

    await onSalvarProcuracao(aprovacao.id, {
      procuracao_status: procuracaoStatus,
      observacao_procuracao: emptyToNull(observacaoProcuracao),
    });
    if (isProcuracaoStatusConcluida(procuracaoStatus)) {
      setTab("funcionarios");
    }
  }

  async function handleSalvarLogoClick() {
    if (!aprovacao) return;
    if (possuiLogo == null) {
      toast.error("Informe se deseja incluir a logomarca da empresa.");
      return;
    }
    if (possuiLogo && !logoFile && !aprovacao.logo_path) {
      toast.error("Anexe a logomarca da empresa.");
      return;
    }
    await onSalvarLogo(aprovacao.id, logoFile, possuiLogo);
    setLogoFile(null);
    setTab("visita");
  }

  async function handleSalvarVisitaClick() {
    if (!aprovacao) return;
    if (visitaNecessaria == null) {
      toast.error("Informe se necessita visita técnica.");
      return;
    }
    if (visitaNecessaria) {
      if (!visitaData.trim()) {
        toast.error("Informe a data da visita.");
        return;
      }
      if (!visitaHorario.trim() || !isValidHorario24(visitaHorario)) {
        toast.error("Informe o horário da visita no formato HH:mm.");
        return;
      }
      if (!visitaEndereco.trim()) {
        toast.error("Informe o endereço da visita.");
        return;
      }
    }
    await onSalvarVisita(aprovacao.id, {
      visita_tecnica_necessaria: visitaNecessaria,
      visita_tecnica_data: visitaNecessaria ? visitaData || null : null,
      visita_tecnica_horario: visitaNecessaria
        ? visitaHorario.trim() || null
        : null,
      visita_tecnica_endereco: visitaNecessaria
        ? emptyToNull(visitaEndereco)
        : null,
      visita_tecnica_observacoes: visitaNecessaria
        ? emptyToNull(visitaObservacoes)
        : null,
    });
    setTab("agendamentos");
  }

  async function handleSalvarTreinamentoClick() {
    if (!aprovacao || !onSalvarTreinamento) return;
    if (treinoForm.status === "cancelado") {
      const ok = window.confirm(
        "Confirma o cancelamento deste treinamento? O processo de implantação será mantido."
      );
      if (!ok) return;
    }
    const err = validateTreinamentoPayload(treinoForm);
    if (err) {
      toast.error(err);
      return;
    }
    await onSalvarTreinamento(aprovacao.id, treinoForm);
  }

  async function handleCopiarMensagemVisita() {
    try {
      await navigator.clipboard.writeText(mensagemVisita);
      toast.success("Mensagem copiada.");
    } catch {
      toast.error("Não foi possível copiar a mensagem.");
    }
  }

  async function handleCopiarMensagemTreinamento() {
    try {
      await navigator.clipboard.writeText(mensagemTreinamento);
      toast.success("Mensagem copiada.");
    } catch {
      toast.error("Não foi possível copiar a mensagem.");
    }
  }

  if (!open || !orcamento || !mounted || !form) return null;

  const badge = ORCAMENTO_STATUS_BADGE[orcamento.status];
  const resumoComercial = buildResumoComercialOrcamento(orcamento);
  const valorFinalEditado = parseMoney(form.valor_final);
  const parcelasEditadas = Math.max(1, Number(form.quantidade_parcelas) || 1);
  const valorParcelaCalculado = calcValorParcela(
    valorFinalEditado,
    parcelasEditadas
  );
  const textoParcelasCalculado =
    valorFinalEditado > 0
      ? `${parcelasEditadas}x de ${formatCurrency(valorParcelaCalculado)}`
      : "—";
  const aprovadoConformeOriginal = aprovacao
    ? aprovacaoSegueOrcamentoOriginal(orcamento, aprovacao)
    : false;

  const tituloModal = consultaMode
    ? `Orçamento · ${orcamento.numero}`
    : `Aprovar · ${orcamento.numero}`;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-label="Fechar"
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-[#dbe3ef] bg-white shadow-[0_28px_70px_rgba(8,43,99,0.22)]"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-gradient-to-r from-[#082b63] via-[#0a3578] to-[#0c3f8c] px-5 py-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-extrabold sm:text-xl">
                  {tituloModal}
                </h3>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${badge.className}`}
                >
                  {ORCAMENTO_STATUS_LABELS[orcamento.status]}
                </span>
                {aprovacao ? (
                  <span className="inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    {ORCAMENTO_CONTRATO_DOCUMENTAL_LABELS[andamentoDocumental]}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm text-white/80">
                {formatClienteNomeDisplay(orcamento.cliente_nome)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-lg text-white hover:bg-white/20"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <OrcamentoEtapasNav
            tab={tab}
            aprovacao={aprovacao}
            orcamentoAprovado={orcamentoAprovado}
            disabled={saving}
            fluxo={fluxoImplantacao}
            treinamento={treinamento}
            contagemAgendamentos={
              agendamentosContagem
                ? {
                    quantidadeContratada: agendamentosContagem.contratados,
                    agendamentosRealizados: agendamentosContagem.realizados,
                    agendamentosDispensados: agendamentosContagem.dispensado,
                  }
                : aprovacao
                  ? {
                      quantidadeContratada:
                        Number(aprovacao.quantidade_colaboradores) || 0,
                      agendamentosRealizados: 0,
                    }
                  : null
            }
            onChange={setTab}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f7f9fc] p-4 sm:p-6">
          {tab === "resumo" ? (
            <OrcamentoViewBody orcamento={orcamento} servicos={servicos} />
          ) : null}

          {tab === "aprovado" ? (
            <div className="space-y-4">
              <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
                <div className="border-b border-[#eef2f7] px-4 py-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
                    Resumo do orçamento
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                  <ResumoItem
                    label="Quantidade de colaboradores"
                    value={String(resumoComercial.quantidadeColaboradores)}
                  />
                  <ResumoItem
                    label="Valor do orçamento"
                    value={formatCurrency(resumoComercial.valorTotal)}
                  />
                  <ResumoItem
                    label="À vista"
                    value={
                      resumoComercial.valorAVista > 0
                        ? resumoComercial.textoAVista
                        : "—"
                    }
                  />
                  <ResumoItem
                    label="Parcelado"
                    value={resumoComercial.textoParcelado || "—"}
                  />
                </div>
                <p className="border-t border-[#eef2f7] px-4 py-3 text-[11px] text-[#64748b]">
                  Referência do orçamento original. Estes dados não serão
                  alterados.
                </p>
              </section>

              {!resolveOrcamentoCnpjDigits(orcamento.cliente_cnpj) &&
              !aprovacao ? (
                <p className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[12px] font-medium text-[#b91c1c]">
                  {ORCAMENTO_APROVACAO_CNPJ_OBRIGATORIO_MSG}
                </p>
              ) : null}

              {aprovacao ? (
                <section className="overflow-hidden rounded-2xl border border-[#dbeafe] bg-[#f8fbff]">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e0eaff] px-4 py-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
                      Condições finais aprovadas
                    </p>
                    {!editandoCondicoes ? (
                      <button
                        type="button"
                        className="btn justify-center text-[12px] sm:w-auto"
                        disabled={saving}
                        onClick={iniciarEdicaoCondicoes}
                      >
                        ✏️ Editar condições aprovadas
                      </button>
                    ) : null}
                  </div>
                  {editandoCondicoes && form ? (
                    <div className="space-y-4 p-4 sm:p-5">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Field label="Quantidade de colaboradores" required>
                          <input
                            className="field-input"
                            value={form.quantidade_colaboradores}
                            disabled={saving}
                            onChange={(e) =>
                              updateFormField(
                                "quantidade_colaboradores",
                                e.target.value.replace(/\D/g, "")
                              )
                            }
                          />
                        </Field>
                        <Field label="Valor total fechado" required>
                          <input
                            className="field-input"
                            value={form.valor_final}
                            disabled={saving}
                            onChange={(e) =>
                              updateFormField(
                                "valor_final",
                                maskMoneyInput(e.target.value)
                              )
                            }
                          />
                        </Field>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-bold text-navy">
                          Forma de pagamento <RequiredMark />
                        </p>
                        <div className="flex flex-wrap gap-4">
                          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#334155]">
                            <input
                              type="radio"
                              name="forma-pagamento-edit"
                              className="h-4 w-4 accent-brand-blue"
                              checked={form.forma_pagamento === "avista"}
                              disabled={saving}
                              onChange={() =>
                                updateFormField("forma_pagamento", "avista")
                              }
                            />
                            À vista
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#334155]">
                            <input
                              type="radio"
                              name="forma-pagamento-edit"
                              className="h-4 w-4 accent-brand-blue"
                              checked={form.forma_pagamento === "parcelado"}
                              disabled={saving}
                              onChange={() =>
                                updateFormField("forma_pagamento", "parcelado")
                              }
                            />
                            Parcelado
                          </label>
                        </div>
                      </div>

                      {form.forma_pagamento === "avista" ? (
                        <ResumoItem
                          label="Valor final fechado"
                          value={
                            valorFinalEditado > 0
                              ? formatCurrency(valorFinalEditado)
                              : "—"
                          }
                        />
                      ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <Field label="Quantidade de parcelas" required>
                            <input
                              className="field-input"
                              value={form.quantidade_parcelas}
                              disabled={saving}
                              onChange={(e) =>
                                updateFormField(
                                  "quantidade_parcelas",
                                  e.target.value.replace(/\D/g, "")
                                )
                              }
                            />
                          </Field>
                          <ResumoItem
                            label="Valor de cada parcela"
                            value={textoParcelasCalculado}
                          />
                        </div>
                      )}

                      <Field label="Observações da negociação">
                        <textarea
                          className="field-input min-h-[72px] resize-y"
                          value={form.observacoes}
                          disabled={saving}
                          onChange={(e) =>
                            updateFormField("observacoes", e.target.value)
                          }
                        />
                      </Field>
                      <p className="text-[11px] text-[#64748b]">
                        O resumo do orçamento original não será alterado. Ao
                        salvar, Financeiro, Contrato, Implantação, Clientes e
                        Histórico de Contratos passam a usar os novos valores.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                      {aprovadoConformeOriginal ? (
                        <div className="sm:col-span-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[12px] font-semibold text-[#166534]">
                          Aprovado conforme o orçamento original.
                        </div>
                      ) : null}
                      <ResumoItem
                        label="Quantidade de colaboradores"
                        value={String(aprovacao.quantidade_colaboradores)}
                      />
                      <ResumoItem
                        label="Valor total fechado"
                        value={formatCurrency(Number(aprovacao.valor_final))}
                      />
                      <ResumoItem
                        label="Pagamento"
                        value={formatCondicaoAprovada(aprovacao)}
                      />
                      {aprovacao.observacoes ? (
                        <div className="sm:col-span-2">
                          <ResumoItem
                            label="Observações da negociação"
                            value={aprovacao.observacoes}
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>
              ) : (
                <>
                  <section className="rounded-2xl border border-[#dbe3ef] bg-white p-4 sm:p-5">
                    <p className="mb-3 text-sm font-extrabold text-navy">
                      As condições finais ficaram iguais às do orçamento?
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#334155]">
                        <input
                          type="radio"
                          name="condicoes-iguais"
                          className="h-4 w-4 accent-brand-blue"
                          checked={form.condicoes_iguais}
                          disabled={aprovadoLocked || saving}
                          onChange={() => {
                            updateFormField("condicoes_iguais", true);
                            setShowDiffConfirm(false);
                          }}
                        />
                        Sim
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#334155]">
                        <input
                          type="radio"
                          name="condicoes-iguais"
                          className="h-4 w-4 accent-brand-blue"
                          checked={!form.condicoes_iguais}
                          disabled={aprovadoLocked || saving}
                          onChange={() =>
                            updateFormField("condicoes_iguais", false)
                          }
                        />
                        Não
                      </label>
                    </div>
                    {form.condicoes_iguais ? (
                      <p className="mt-3 text-[12px] text-[#64748b]">
                        Ao salvar, o orçamento será aprovado exatamente conforme
                        enviado. Nenhuma alteração adicional é necessária.
                      </p>
                    ) : null}
                  </section>

                  {!form.condicoes_iguais ? (
                    <section className="overflow-hidden rounded-2xl border border-[#e8d7a8] bg-gradient-to-br from-[#fffbeb] to-white">
                      <div className="border-b border-[#f3e6c0] px-4 py-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
                          Condições finais aprovadas
                        </p>
                      </div>
                      <div className="space-y-4 p-4 sm:p-5">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <Field label="Quantidade de colaboradores" required>
                            <input
                              className="field-input"
                              value={form.quantidade_colaboradores}
                              disabled={aprovadoLocked || saving}
                              onChange={(e) =>
                                updateFormField(
                                  "quantidade_colaboradores",
                                  e.target.value.replace(/\D/g, "")
                                )
                              }
                            />
                          </Field>
                          <Field label="Valor total fechado" required>
                            <input
                              className="field-input"
                              value={form.valor_final}
                              disabled={aprovadoLocked || saving}
                              onChange={(e) =>
                                updateFormField(
                                  "valor_final",
                                  maskMoneyInput(e.target.value)
                                )
                              }
                            />
                          </Field>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-bold text-navy">
                            Forma de pagamento <RequiredMark />
                          </p>
                          <div className="flex flex-wrap gap-4">
                            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#334155]">
                              <input
                                type="radio"
                                name="forma-pagamento"
                                className="h-4 w-4 accent-brand-blue"
                                checked={form.forma_pagamento === "avista"}
                                disabled={aprovadoLocked || saving}
                                onChange={() =>
                                  updateFormField("forma_pagamento", "avista")
                                }
                              />
                              À vista
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#334155]">
                              <input
                                type="radio"
                                name="forma-pagamento"
                                className="h-4 w-4 accent-brand-blue"
                                checked={form.forma_pagamento === "parcelado"}
                                disabled={aprovadoLocked || saving}
                                onChange={() =>
                                  updateFormField(
                                    "forma_pagamento",
                                    "parcelado"
                                  )
                                }
                              />
                              Parcelado
                            </label>
                          </div>
                        </div>

                        {form.forma_pagamento === "avista" ? (
                          <ResumoItem
                            label="Valor final fechado"
                            value={
                              valorFinalEditado > 0
                                ? formatCurrency(valorFinalEditado)
                                : "—"
                            }
                          />
                        ) : (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Field label="Quantidade de parcelas" required>
                              <input
                                className="field-input"
                                value={form.quantidade_parcelas}
                                disabled={aprovadoLocked || saving}
                                onChange={(e) =>
                                  updateFormField(
                                    "quantidade_parcelas",
                                    e.target.value.replace(/\D/g, "")
                                  )
                                }
                              />
                            </Field>
                            <ResumoItem
                              label="Valor de cada parcela"
                              value={textoParcelasCalculado}
                            />
                          </div>
                        )}

                        <Field label="Observações da negociação">
                          <textarea
                            className="field-input min-h-[72px] resize-y"
                            value={form.observacoes}
                            disabled={aprovadoLocked || saving}
                            onChange={(e) =>
                              updateFormField("observacoes", e.target.value)
                            }
                          />
                        </Field>
                      </div>
                    </section>
                  ) : null}

                  {showDiffConfirm && !form.condicoes_iguais ? (
                    <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
                      <p className="mb-3 text-sm font-bold text-navy">
                        Comparação entre original e aprovado
                      </p>
                      <div className="space-y-2">
                        {diffs.map((diff) => (
                          <div
                            key={diff.label}
                            className={`rounded-xl border px-3 py-2 text-[12px] ${
                              diff.changed
                                ? "border-[#fcd34d] bg-[#fffbeb]"
                                : "border-[#e2e8f0] bg-white"
                            }`}
                          >
                            <p className="font-semibold text-navy">
                              {diff.label}
                            </p>
                            <p className="text-[#64748b]">
                              Orçamento original: {diff.original}
                            </p>
                            <p className="text-[#64748b]">
                              Orçamento aprovado: {diff.aprovado}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[12px] text-[#1e3a8a]">
                        As condições aprovadas serão salvas separadamente. O
                        orçamento original não será alterado.
                      </p>
                    </div>
                  ) : null}
                </>
              )}

              {aprovacao && historicoCondicoes.length > 0 ? (
                <section className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white">
                  <div className="border-b border-[#eef2f7] px-4 py-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
                      Histórico de alterações das condições
                    </p>
                    <p className="mt-1 text-[11px] text-[#64748b]">
                      Registro permanente para auditoria. Não pode ser apagado.
                    </p>
                  </div>
                  <div className="divide-y divide-[#eef2f7]">
                    {historicoCondicoes.map((row) => (
                      <div key={row.id} className="space-y-2 px-4 py-3 text-[12px]">
                        <p className="font-semibold text-navy">
                          {formatDateTimeBR(row.alterado_em)} · {row.alterado_por}
                        </p>
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                          <p className="text-[#64748b]">
                            Quantidade: {row.quantidade_anterior} →{" "}
                            <span className="font-semibold text-[#334155]">
                              {row.quantidade_nova}
                            </span>
                          </p>
                          <p className="text-[#64748b]">
                            Valor: {formatCurrency(Number(row.valor_anterior))} →{" "}
                            <span className="font-semibold text-[#334155]">
                              {formatCurrency(Number(row.valor_novo))}
                            </span>
                          </p>
                          <p className="text-[#64748b] sm:col-span-2">
                            Pagamento: {row.pagamento_anterior} →{" "}
                            <span className="font-semibold text-[#334155]">
                              {row.pagamento_novo}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}

          {tab === "contrato" && aprovacao ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#e4ebf4] bg-white px-4 py-3 text-[12px] text-[#475569]">
                Andamento documental:{" "}
                <strong className="text-navy">
                  {ORCAMENTO_CONTRATO_DOCUMENTAL_LABELS[andamentoDocumental]}
                </strong>
                {aprovacao.aprovado_em ? (
                  <span>
                    {" "}
                    · Aprovado em{" "}
                    {formatDateIsoToBR(aprovacao.aprovado_em.split("T")[0])} por{" "}
                    {aprovacao.aprovado_por}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Contrato enviado?">
                  <select
                    className="field-input"
                    value={contratoEnviado ? "sim" : "nao"}
                    disabled={acompanhamentoBloqueado}
                    onChange={(e) =>
                      setContratoEnviado(e.target.value === "sim")
                    }
                  >
                    {SIM_NAO.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Data de envio do contrato">
                  <input
                    type="date"
                    className="field-input"
                    value={contratoEnviadoEm}
                    disabled={acompanhamentoBloqueado || !contratoEnviado}
                    onChange={(e) => setContratoEnviadoEm(e.target.value)}
                  />
                </Field>
                <Field label="Contrato assinado?">
                  <select
                    className="field-input"
                    value={contratoAssinado ? "sim" : "nao"}
                    disabled={acompanhamentoBloqueado}
                    onChange={(e) =>
                      setContratoAssinado(e.target.value === "sim")
                    }
                  >
                    {SIM_NAO.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Data de assinatura">
                  <input
                    type="date"
                    className="field-input"
                    value={contratoAssinadoEm}
                    disabled={acompanhamentoBloqueado || !contratoAssinado}
                    onChange={(e) => setContratoAssinadoEm(e.target.value)}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Observação do contrato">
                    <textarea
                      className="field-input min-h-[72px] resize-y"
                      value={observacaoContrato}
                      disabled={acompanhamentoBloqueado}
                      onChange={(e) => setObservacaoContrato(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "financeiro" &&
          aprovacao &&
          isOrcamentoEtapaLiberada(
            "financeiro",
            aprovacao,
            orcamentoAprovado,
            etapasCtx
          ) ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#e4ebf4] bg-white px-4 py-3 text-[12px] text-[#475569]">
                Andamento financeiro:{" "}
                <strong className="text-navy">
                  {ORCAMENTO_FINANCEIRO_ANDAMENTO_LABELS[andamentoFinanceiro]}
                </strong>
              </div>

              <section className="rounded-2xl border border-[#e8d7a8] bg-gradient-to-br from-[#fffbeb] to-white p-4 sm:p-5">
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-navy">
                  Pagamento inicial
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Data de vencimento do boleto">
                    <input
                      type="date"
                      className="field-input"
                      value={boletoVencimento}
                      disabled={acompanhamentoBloqueado}
                      onChange={(e) => setBoletoVencimento(e.target.value)}
                    />
                  </Field>
                  <Field label="Boleto pago?">
                    <select
                      className="field-input"
                      value={boletoPago ? "sim" : "nao"}
                      disabled={acompanhamentoBloqueado}
                      onChange={(e) => setBoletoPago(e.target.value === "sim")}
                    >
                      {SIM_NAO.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {boletoPago ? (
                    <>
                      <Field label="Data do pagamento" required>
                        <input
                          type="date"
                          className="field-input"
                          value={boletoPagoEm}
                          disabled={acompanhamentoBloqueado}
                          onChange={(e) => setBoletoPagoEm(e.target.value)}
                        />
                      </Field>
                      <Field label="Comprovante de pagamento" required>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                          className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-[#eef2ff] file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-navy"
                          disabled={acompanhamentoBloqueado}
                          onChange={(e) =>
                            setComprovanteFile(e.target.files?.[0] ?? null)
                          }
                        />
                        {aprovacao.comprovante_nome ? (
                          <button
                            type="button"
                            className="mt-1 text-[11px] font-semibold text-brand-blue hover:underline"
                            onClick={() => {
                              if (aprovacao.comprovante_path) {
                                onVerComprovante(aprovacao.comprovante_path);
                              }
                            }}
                          >
                            Ver comprovante atual ({aprovacao.comprovante_nome})
                          </button>
                        ) : null}
                        {comprovanteFile ? (
                          <p className="mt-1 text-[11px] text-[#64748b]">
                            Novo arquivo: {comprovanteFile.name}
                          </p>
                        ) : null}
                      </Field>
                    </>
                  ) : null}
                  <div className="md:col-span-2">
                    <Field
                      label={
                        boletoPago
                          ? "Observações do pagamento (opcional)"
                          : "Observações do pagamento"
                      }
                    >
                      <textarea
                        className="field-input min-h-[72px] resize-y"
                        value={observacaoPagamento}
                        disabled={acompanhamentoBloqueado}
                        onChange={(e) =>
                          setObservacaoPagamento(e.target.value)
                        }
                      />
                    </Field>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {tab === "procuracao" &&
          aprovacao &&
          isOrcamentoEtapaLiberada(
            "procuracao",
            aprovacao,
            orcamentoAprovado,
            etapasCtx
          ) ? (
            <OrcamentoAbaProcuracao
              status={procuracaoStatus}
              observacoes={observacaoProcuracao}
              saving={saving}
              onChangeStatus={setProcuracaoStatus}
              onChangeObservacoes={setObservacaoProcuracao}
              onSalvar={() => void handleSalvarProcuracaoClick()}
            />
          ) : null}

          {tab === "funcionarios" &&
          orcamento &&
          aprovacao &&
          isOrcamentoEtapaLiberada(
            "funcionarios",
            aprovacao,
            orcamentoAprovado,
            etapasCtx
          ) ? (
            <OrcamentoAbaFuncionarios
              orcamentoId={orcamento.id}
              aprovacao={aprovacao}
              usuarioNome={usuarioNome}
              clienteNome={orcamento.cliente_nome}
              clienteCnpj={orcamento.cliente_cnpj}
              clienteId={orcamento.cliente_id}
              file={funcionariosFile}
              savedName={aprovacao.funcionarios_lista_nome ?? null}
              savedUrl={funcionariosPreviewUrl}
              savedTipo={aprovacao.funcionarios_lista_tipo ?? null}
              saving={saving}
              onFileChange={setFuncionariosFile}
              onEtapaSalva={(saved) => {
                onAprovacaoAtualizada?.(saved);
                setTab("logo");
              }}
              onSubstituir={async (file) => {
                await onSubstituirFuncionarios(aprovacao.id, file);
                setFuncionariosFile(null);
              }}
              onRemover={async () => {
                await onRemoverFuncionarios(aprovacao.id);
                setFuncionariosFile(null);
              }}
            />
          ) : null}

          {tab === "logo" &&
          aprovacao &&
          isOrcamentoEtapaLiberada(
            "logo",
            aprovacao,
            orcamentoAprovado,
            etapasCtx
          ) ? (
            <OrcamentoAbaLogo
              possuiLogo={possuiLogo}
              file={logoFile}
              savedName={aprovacao.logo_nome ?? null}
              savedUrl={logoPreviewUrl}
              savedTipo={aprovacao.logo_tipo ?? null}
              saving={saving}
              onChangePossuiLogo={(value) => {
                setPossuiLogo(value);
                if (!value) setLogoFile(null);
              }}
              onFileChange={setLogoFile}
              onSalvar={() => void handleSalvarLogoClick()}
              onSubstituir={async (file) => {
                await onSubstituirLogo(aprovacao.id, file);
                setLogoFile(null);
                setPossuiLogo(true);
              }}
              onRemover={async () => {
                await onRemoverLogo(aprovacao.id);
                setLogoFile(null);
                setPossuiLogo(true);
              }}
            />
          ) : null}

          {tab === "visita" &&
          aprovacao &&
          isOrcamentoEtapaLiberada(
            "visita",
            aprovacao,
            orcamentoAprovado,
            etapasCtx
          ) ? (
            <OrcamentoAbaVisitaTecnica
              necessaria={visitaNecessaria}
              data={visitaData}
              horario={visitaHorario}
              endereco={visitaEndereco}
              observacoes={visitaObservacoes}
              mensagem={mensagemVisita}
              saving={saving}
              onChangeNecessaria={setVisitaNecessaria}
              onChangeData={setVisitaData}
              onChangeHorario={setVisitaHorario}
              onChangeEndereco={setVisitaEndereco}
              onChangeObservacoes={setVisitaObservacoes}
              onCopiarMensagem={() => void handleCopiarMensagemVisita()}
              onSalvar={() => void handleSalvarVisitaClick()}
            />
          ) : null}

          {tab === "agendamentos" &&
          aprovacao &&
          isOrcamentoEtapaLiberada(
            "agendamentos",
            aprovacao,
            orcamentoAprovado,
            etapasCtx
          ) ? (
            <OrcamentoAbaAgendamentos
              orcamentoId={orcamento.id}
              aprovacao={aprovacao}
              usuarioNome={usuarioNome}
              clienteNome={orcamento.cliente_nome}
              clienteCnpj={orcamento.cliente_cnpj}
              onContagemChange={setAgendamentosContagem}
              onIrParaListaFuncionarios={() => setTab("funcionarios")}
            />
          ) : null}

          {tab === "treinamento" &&
          aprovacao &&
          onSalvarTreinamento &&
          isOrcamentoEtapaLiberada(
            "treinamento",
            aprovacao,
            orcamentoAprovado,
            etapasCtx
          ) ? (
            <OrcamentoAbaTreinamento
              form={treinoForm}
              mensagem={mensagemTreinamento}
              saving={saving}
              eventos={treinamentoEventos}
              onChange={(patch) =>
                setTreinoForm((prev) => ({ ...prev, ...patch }))
              }
              onCopiarMensagem={() => void handleCopiarMensagemTreinamento()}
              onSalvar={() => void handleSalvarTreinamentoClick()}
            />
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-[#e4ebf4] bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            Fechar
          </button>
          {tab === "aprovado" &&
          aprovacao &&
          editandoCondicoes ? (
            <>
              <button
                type="button"
                className="btn justify-center sm:w-auto"
                onClick={cancelarEdicaoCondicoes}
                disabled={saving}
              >
                Cancelar edição
              </button>
              <button
                type="button"
                className="btn btn-primary justify-center sm:w-auto"
                onClick={() => void handleSalvarCondicoesEditadasClick()}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </>
          ) : null}
          {tab === "aprovado" &&
          !aprovadoLocked &&
          !consultaMode &&
          !editandoCondicoes ? (
            <button
              type="button"
              className="btn btn-primary justify-center sm:w-auto"
              onClick={() => void handleSalvarAprovacaoClick()}
              disabled={saving}
            >
              {saving
                ? "Salvando..."
                : showDiffConfirm && !form.condicoes_iguais
                  ? "Confirmar e salvar aprovação"
                  : "Salvar aprovação"}
            </button>
          ) : null}
          {tab === "aprovado" &&
          showDiffConfirm &&
          !form.condicoes_iguais &&
          !aprovadoLocked &&
          !consultaMode &&
          !editandoCondicoes ? (
            <button
              type="button"
              className="btn justify-center sm:w-auto"
              onClick={() => setShowDiffConfirm(false)}
              disabled={saving}
            >
              Voltar à edição
            </button>
          ) : null}
          {tab === "contrato" && aprovacao ? (
            <button
              type="button"
              className="btn btn-primary justify-center sm:w-auto"
              onClick={() => void handleSalvarContratoClick()}
              disabled={acompanhamentoBloqueado}
            >
              {saving ? "Salvando..." : "Salvar acompanhamento"}
            </button>
          ) : null}
          {tab === "financeiro" &&
          aprovacao &&
          isOrcamentoEtapaLiberada(
            "financeiro",
            aprovacao,
            orcamentoAprovado,
            etapasCtx
          ) ? (
            <button
              type="button"
              className="btn btn-primary justify-center sm:w-auto"
              onClick={() => void handleSalvarFinanceiroClick()}
              disabled={acompanhamentoBloqueado}
            >
              {saving ? "Salvando..." : "Salvar financeiro"}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-navy">
        {label}
        {required ? (
          <>
            {" "}
            <RequiredMark />
          </>
        ) : null}
      </label>
      {children}
    </div>
  );
}

function ResumoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}
