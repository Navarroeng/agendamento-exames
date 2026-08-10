"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { RiscosCampanhaParticipantesSection } from "@/components/riscos-psicossociais/RiscosCampanhaParticipantesSection";
import { RiscosPainelPreRequisitos } from "@/components/riscos-psicossociais/RiscosPainelPreRequisitos";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  RISCOS_CAMPANHA_STATUS_LABELS,
  formatPeriodoCampanha,
  pathAvaliacaoCampanha,
} from "@/lib/riscos-campanha";
import { COPSOQ_DIMENSOES, COPSOQ_INSTRUMENTO } from "@/lib/copsoq";
import {
  buildParticipantesResumo,
  type RiscosCampanhaParticipanteRecord,
  type RiscosParticipanteInput,
} from "@/lib/riscos-campanha-participantes";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

interface RiscosPainelCardsProps {
  processo: RiscosPsicossociaisProcesso;
  participantes: RiscosCampanhaParticipanteRecord[];
  savingLista?: boolean;
  savingCampanha?: boolean;
  savingParticipante?: boolean;
  onSalvarSolicitacaoLista: (input: {
    dataSolicitacaoIso: string;
    email: string;
  }) => Promise<void>;
  onSalvarRecebimentoLista: (file: File) => Promise<void>;
  onRemoverAnexoLista: () => Promise<void>;
  onVisualizarAnexoLista: () => Promise<void>;
  onCriarCampanha: (input: {
    dataInicioIso: string;
    dataEncerramentoIso: string;
    quantidadePrevista: number;
  }) => Promise<void>;
  onAbrirCampanha: () => Promise<void>;
  onGarantirCodigoAcesso: (regenerar?: boolean) => Promise<void>;
  onCriarParticipante: (input: RiscosParticipanteInput) => Promise<void>;
  onEditarParticipante: (
    participanteId: string,
    input: RiscosParticipanteInput
  ) => Promise<void>;
  onRemoverParticipante: (participanteId: string) => Promise<void>;
}

function PanelCard({
  title,
  eyebrow,
  children,
  className = "",
  actions,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="text-sm font-extrabold text-navy">{title}</h3>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function PlaceholderNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 text-xs text-[#64748b]">
      {children}
    </p>
  );
}

function StatChip({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-0.5 text-base font-extrabold tabular-nums text-navy">
        {value}
      </p>
    </div>
  );
}

export function RiscosPainelCards({
  processo,
  participantes,
  savingLista = false,
  savingCampanha = false,
  savingParticipante = false,
  onSalvarSolicitacaoLista,
  onSalvarRecebimentoLista,
  onRemoverAnexoLista,
  onVisualizarAnexoLista,
  onCriarCampanha,
  onAbrirCampanha,
  onGarantirCodigoAcesso: _onGarantirCodigoAcesso,
  onCriarParticipante,
  onEditarParticipante,
  onRemoverParticipante,
}: RiscosPainelCardsProps) {
  const campanha = processo.campanha;
  const empresaNome = formatClienteNomeDisplay(
    campanha?.empresa_nome || processo.implantacao.orcamento.cliente_nome
  );

  const [criarAberto, setCriarAberto] = useState(false);
  const [confirmAbrirOpen, setConfirmAbrirOpen] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataEncerramento, setDataEncerramento] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const previstos = campanha?.quantidade_prevista ?? 0;
  const resumo = useMemo(
    () => buildParticipantesResumo(previstos, participantes),
    [previstos, participantes]
  );

  const temRespostas = resumo.respondidos > 0;
  const pesquisaEncerrada = campanha?.status === "encerrada";
  const relatorioDisponivel = pesquisaEncerrada;

  const baseParticipacao =
    resumo.previstos > 0
      ? resumo.previstos
      : resumo.cadastrados > 0
        ? resumo.cadastrados
        : 0;
  const participacaoPct =
    baseParticipacao > 0
      ? Math.round((resumo.respondidos / baseParticipacao) * 100)
      : 0;

  async function handleSalvarCampanha() {
    setFormError(null);
    const qtd = Number(quantidade);
    if (!dataInicio.trim()) {
      setFormError("Informe a data de início.");
      return;
    }
    if (!dataEncerramento.trim()) {
      setFormError("Informe a data de encerramento.");
      return;
    }
    if (!Number.isFinite(qtd) || qtd < 1 || !Number.isInteger(qtd)) {
      setFormError("Informe a quantidade prevista (inteiro ≥ 1).");
      return;
    }
    await onCriarCampanha({
      dataInicioIso: dataInicio,
      dataEncerramentoIso: dataEncerramento,
      quantidadePrevista: qtd,
    });
    setCriarAberto(false);
  }

  async function handleCopiarLink() {
    if (!campanha) return;
    const path = pathAvaliacaoCampanha(campanha.codigo_publico);
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <div className="space-y-3">
      {/* Card 1 — Pesquisa */}
      <PanelCard
        title="Pesquisa"
        eyebrow="Card 1"
        actions={
          campanha ? (
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-1.5 text-xs font-bold text-navy"
              onClick={() =>
                toast.message(
                  "Edição da pesquisa será disponibilizada em breve."
                )
              }
            >
              Editar pesquisa
            </button>
          ) : null
        }
      >
        {!campanha && !criarAberto ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PlaceholderNote>
              Nenhuma pesquisa criada ainda. Cadastre o período e a quantidade
              prevista de colaboradores.
            </PlaceholderNote>
            <button
              type="button"
              className="shrink-0 rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              disabled={savingCampanha}
              onClick={() => setCriarAberto(true)}
            >
              Criar pesquisa
            </button>
          </div>
        ) : null}

        {!campanha && criarAberto ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label={
                  <>
                    Data de início <RequiredMark />
                  </>
                }
              >
                <input
                  type="date"
                  className="field-input w-full"
                  value={dataInicio}
                  disabled={savingCampanha}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </Field>
              <Field
                label={
                  <>
                    Data de encerramento <RequiredMark />
                  </>
                }
              >
                <input
                  type="date"
                  className="field-input w-full"
                  value={dataEncerramento}
                  disabled={savingCampanha}
                  onChange={(e) => setDataEncerramento(e.target.value)}
                />
              </Field>
              <Field
                label={
                  <>
                    Qtd. prevista <RequiredMark />
                  </>
                }
              >
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="field-input w-full"
                  value={quantidade}
                  disabled={savingCampanha}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </Field>
            </div>
            {formError ? (
              <p className="text-xs font-medium text-brand-red">{formError}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-[#e2e8f0] px-3 py-1.5 text-xs font-bold text-navy"
                disabled={savingCampanha}
                onClick={() => {
                  setCriarAberto(false);
                  setFormError(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl bg-brand-blue px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                disabled={savingCampanha}
                onClick={() => void handleSalvarCampanha()}
              >
                {savingCampanha ? "Salvando..." : "Salvar pesquisa"}
              </button>
            </div>
          </div>
        ) : null}

        {campanha ? (
          <div className="space-y-3">
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Empresa
                </dt>
                <dd className="mt-0.5 truncate font-semibold text-navy">
                  {empresaNome}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Status
                </dt>
                <dd className="mt-0.5">
                  <span className="inline-flex rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[11px] font-extrabold text-[#4338ca]">
                    {RISCOS_CAMPANHA_STATUS_LABELS[campanha.status]}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Período
                </dt>
                <dd className="mt-0.5 font-semibold text-navy">
                  {formatPeriodoCampanha(
                    campanha.data_inicio,
                    campanha.data_encerramento
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Responsável
                </dt>
                <dd className="mt-0.5 font-semibold text-navy">
                  {processo.implantacao.orcamento.responsavel?.trim() || "—"}
                </dd>
              </div>
            </dl>
            <div className="grid grid-cols-3 gap-2">
              <StatChip
                label="Participantes cadastrados"
                value={resumo.cadastrados}
              />
              <StatChip label="Responderam" value={resumo.respondidos} />
              <StatChip label="Pendentes" value={resumo.pendentes} />
            </div>
          </div>
        ) : null}
      </PanelCard>

      {/* Card 2 — Pré-requisitos */}
      <RiscosPainelPreRequisitos
        processo={processo}
        savingLista={savingLista}
        onSalvarSolicitacaoLista={onSalvarSolicitacaoLista}
        onSalvarRecebimentoLista={onSalvarRecebimentoLista}
        onRemoverAnexoLista={onRemoverAnexoLista}
        onVisualizarAnexoLista={onVisualizarAnexoLista}
      />

      {/* Card 3 — Convites */}
      <PanelCard title="Convites" eyebrow="Card 3">
        {campanha ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Link da pesquisa
                </p>
                <p className="mt-0.5 break-all font-mono text-xs font-semibold text-brand-blue">
                  {pathAvaliacaoCampanha(campanha.codigo_publico)}
                </p>
              </div>
              <p className="text-[11px] text-[#64748b]">
                Código:{" "}
                <span className="font-mono font-semibold text-navy">
                  {campanha.codigo_publico}
                </span>
                {" · "}O participante acessa pelo link com CPF e data de
                nascimento.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white"
                onClick={() => void handleCopiarLink()}
              >
                Copiar link
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
                disabled
                title="QR Code será disponibilizado em etapa futura"
              >
                Gerar QR Code
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
                disabled={
                  savingCampanha || campanha.status !== "em_preparacao"
                }
                onClick={() => setConfirmAbrirOpen(true)}
                title="Libera o portal para respostas (status Aberta)"
              >
                Abrir pesquisa
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
                disabled
                title="Encerramento manual será disponibilizado em breve"
              >
                Encerrar pesquisa
              </button>
            </div>
          </div>
        ) : (
          <PlaceholderNote>
            Crie a pesquisa para gerar o link e o QR Code da campanha.
          </PlaceholderNote>
        )}
      </PanelCard>

      {/* Card 4 — Participantes */}
      <PanelCard title="Participantes" eyebrow="Card 4">
        {campanha ? (
          <RiscosCampanhaParticipantesSection
            campanha={campanha}
            participantes={participantes}
            saving={savingParticipante}
            onCriar={onCriarParticipante}
            onEditar={onEditarParticipante}
            onRemover={onRemoverParticipante}
          />
        ) : (
          <PlaceholderNote>
            Crie a pesquisa para gerenciar participantes.
          </PlaceholderNote>
        )}
      </PanelCard>

      {/* Card 5 — Questionário */}
      <PanelCard title="Questionário" eyebrow="Card 5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-extrabold text-navy">
              COPSOQ II-Br · Pesquisa Psicossocial
            </p>
            <dl className="grid grid-cols-3 gap-2 text-xs sm:max-w-md">
              <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-2.5 py-2">
                <dt className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Perguntas
                </dt>
                <dd className="mt-0.5 font-extrabold text-navy">
                  {COPSOQ_INSTRUMENTO.totalPerguntasAvaliativas}
                </dd>
              </div>
              <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-2.5 py-2">
                <dt className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Dimensões
                </dt>
                <dd className="mt-0.5 font-extrabold text-navy">
                  {COPSOQ_DIMENSOES.length}
                </dd>
              </div>
              <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-2.5 py-2">
                <dt className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Ordem
                </dt>
                <dd className="mt-0.5 font-extrabold text-navy">01 → 40</dd>
              </div>
            </dl>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
              onClick={() =>
                toast.message("Visualização das perguntas em breve.")
              }
            >
              Visualizar perguntas
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
              onClick={() =>
                toast.message("Edição do questionário em breve.")
              }
            >
              Editar questionário
            </button>
          </div>
        </div>
      </PanelCard>

      {/* Card 6 — Resultados */}
      <PanelCard title="Resultados" eyebrow="Card 6">
        {!temRespostas ? (
          <PlaceholderNote>
            Ainda não existem respostas para esta pesquisa.
          </PlaceholderNote>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div
                className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#2563eb ${participacaoPct}%, #e2e8f0 0)`,
                }}
                aria-hidden
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-center">
                  <span className="text-xs font-extrabold tabular-nums text-navy">
                    {participacaoPct}%
                  </span>
                </div>
              </div>
              <div className="space-y-0.5 text-sm">
                <p className="font-semibold text-navy">
                  {resumo.respondidos} responderam
                </p>
                <p className="text-[#64748b]">{resumo.pendentes} pendentes</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatChip label="Participação" value={`${participacaoPct}%`} />
              <StatChip label="Respondidos" value={resumo.respondidos} />
              <StatChip label="Dimensões" value="—" />
              <StatChip label="Risco geral" value="—" />
            </div>
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
              onClick={() =>
                toast.message("Visualização de resultados em breve.")
              }
            >
              Visualizar resultados
            </button>
          </div>
        )}
      </PanelCard>

      {/* Card 7 — Relatório */}
      <PanelCard title="Relatório" eyebrow="Card 7">
        {!pesquisaEncerrada ? (
          <PlaceholderNote>
            Relatório disponível após o encerramento da pesquisa.
          </PlaceholderNote>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#64748b]">
              Pesquisa encerrada
              {campanha?.data_encerramento
                ? ` em ${formatDateIsoToBR(
                    campanha.data_encerramento.slice(0, 10)
                  )}`
                : ""}
              . Gere o relatório psicossocial.
            </p>
            <button
              type="button"
              className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              disabled={!relatorioDisponivel}
              onClick={() =>
                toast.message(
                  "Geração do relatório será disponibilizada em breve."
                )
              }
            >
              Gerar relatório
            </button>
          </div>
        )}
      </PanelCard>

      <Modal
        open={confirmAbrirOpen}
        onClose={() => {
          if (!savingCampanha) setConfirmAbrirOpen(false);
        }}
        title="Abrir pesquisa"
        subtitle={
          campanha
            ? `${campanha.empresa_nome} · ${campanha.codigo_publico}`
            : undefined
        }
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
              disabled={savingCampanha}
              onClick={() => setConfirmAbrirOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              disabled={savingCampanha || !campanha}
              onClick={() => {
                void (async () => {
                  try {
                    await onAbrirCampanha();
                    setConfirmAbrirOpen(false);
                  } catch {
                    // mantém o modal aberto; o hook já exibe o toast de erro
                  }
                })();
              }}
            >
              {savingCampanha ? "Abrindo…" : "Abrir pesquisa"}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[#475569]">
          Após abrir a pesquisa, participantes autorizados poderão acessar o
          Portal do Colaborador durante o período configurado.
        </p>
        {campanha ? (
          <p className="mt-3 text-xs text-[#64748b]">
            Período:{" "}
            <span className="font-semibold text-navy">
              {formatPeriodoCampanha(
                campanha.data_inicio,
                campanha.data_encerramento
              )}
            </span>
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
