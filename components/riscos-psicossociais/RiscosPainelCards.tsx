"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { RiscosCampanhaParticipantesSection } from "@/components/riscos-psicossociais/RiscosCampanhaParticipantesSection";
import { RiscosPainelPreRequisitos } from "@/components/riscos-psicossociais/RiscosPainelPreRequisitos";
import { RiscosResultadosPanel } from "@/components/riscos-psicossociais/RiscosResultadosPanel";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  RISCOS_CAMPANHA_STATUS_LABELS,
  acoesConvitePorStatus,
  formatPeriodoCampanha,
  pathAvaliacaoCampanha,
  validateAbrirCampanhaRiscos,
  validatePreRequisitosAbrirCampanha,
} from "@/lib/riscos-campanha";
import {
  buildParticipantesResumo,
  type RiscosCampanhaParticipanteRecord,
  type RiscosParticipanteInput,
} from "@/lib/riscos-campanha-participantes";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";
import {
  DEVELOPMENT_SKIP_LAUDOS_SST_GATE,
} from "@/lib/riscos-psicossociais";

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
  onEncerrarCampanha: () => Promise<void>;
  onCancelarProcesso: (motivo: string) => Promise<void>;
  onExcluirCampanha: (confirmacaoCodigo: string) => Promise<void>;
  exclusaoDefinitivaDisponivel?: boolean;
  onGarantirCodigoAcesso: (regenerar?: boolean) => Promise<void>;
  onCriarParticipante: (input: RiscosParticipanteInput) => Promise<void>;
  onImportarParticipantesExcel: (file: File) => Promise<void>;
  onRemoverParticipante: (participanteId: string) => Promise<void>;
  /** Admin only — remoção de participante. */
  podeRemoverParticipante?: boolean;
  /** Só exibe ações de Convites após status confirmado no banco. */
  campanhaStatusSincronizado?: boolean;
}

function PanelCard({
  title,
  children,
  className = "",
  actions,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section
      className={`flex h-full min-h-[180px] flex-col rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-extrabold text-navy">{title}</h3>
        {actions}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function PlaceholderNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 text-xs leading-relaxed text-[#64748b]">
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
      <p className="mt-0.5 text-sm font-extrabold tabular-nums text-navy sm:text-base">
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
  onEncerrarCampanha,
  onCancelarProcesso,
  onExcluirCampanha,
  exclusaoDefinitivaDisponivel = false,
  onGarantirCodigoAcesso: _onGarantirCodigoAcesso,
  onCriarParticipante,
  onImportarParticipantesExcel,
  onRemoverParticipante,
  podeRemoverParticipante = false,
  campanhaStatusSincronizado = false,
}: RiscosPainelCardsProps) {
  const campanha = processo.campanha;

  const [criarAberto, setCriarAberto] = useState(false);
  const [confirmAbrirOpen, setConfirmAbrirOpen] = useState(false);
  const [confirmEncerrarOpen, setConfirmEncerrarOpen] = useState(false);
  const [confirmCancelarOpen, setConfirmCancelarOpen] = useState(false);
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [erroCancelar, setErroCancelar] = useState<string | null>(null);
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState("");
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataEncerramento, setDataEncerramento] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const previstos = campanha?.quantidade_prevista ?? 0;
  const resumo = useMemo(
    () => buildParticipantesResumo(previstos, participantes),
    [previstos, participantes]
  );

  const pesquisaCancelada = campanha?.status === "cancelada";
  /** Relatório ainda não é entidade real; não usar encerrada/cancelada como proxy. */
  const relatorioExiste = false;
  const podeCancelarProcesso =
    Boolean(campanha) &&
    campanhaStatusSincronizado &&
    !pesquisaCancelada;

  const historico = useMemo(
    () => buildHistorico(processo, participantes),
    [processo, participantes]
  );
  const historicoComEventos = historico.some((item) => item.done);

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

  const preRequisitoAbrir = useMemo(() => {
    if (!campanha) return "Crie a pesquisa antes de abrir.";
    return (
      validatePreRequisitosAbrirCampanha({
        listaPresencaConcluida: processo.listaPresencaConcluida,
        participantesCadastrados: participantes.length,
        exigeLaudosSst:
          processo.exigeLaudosSst && !DEVELOPMENT_SKIP_LAUDOS_SST_GATE,
        laudosSstConcluido: processo.laudosSstConcluido,
      }) ?? validateAbrirCampanhaRiscos(campanha)
    );
  }, [
    campanha,
    processo.listaPresencaConcluida,
    processo.exigeLaudosSst,
    processo.laudosSstConcluido,
    participantes.length,
  ]);

  const podeAbrirPesquisa =
    Boolean(campanha) &&
    campanha?.status === "em_preparacao" &&
    !preRequisitoAbrir;

  const acoesConvite = acoesConvitePorStatus(
    campanhaStatusSincronizado ? campanha?.status : null
  );
  const exibeLinkConvite = acoesConvite.exibirLink;
  const permiteCopiarLink = acoesConvite.permitirCopiarLink;

  async function handleCopiarLink() {
    if (!campanha || !permiteCopiarLink) return;
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

  function handleTentarAbrir() {
    if (!campanha) return;
    if (preRequisitoAbrir) {
      toast.error(preRequisitoAbrir);
      return;
    }
    setConfirmAbrirOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Linha 1 — Pré-requisitos | Pesquisa (lado a lado no desktop) */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <PanelCard title="Pré-requisitos" className="min-w-0">
          <RiscosPainelPreRequisitos
            embedded
            processo={processo}
            savingLista={savingLista}
            onSalvarSolicitacaoLista={onSalvarSolicitacaoLista}
            onSalvarRecebimentoLista={onSalvarRecebimentoLista}
            onRemoverAnexoLista={onRemoverAnexoLista}
            onVisualizarAnexoLista={onVisualizarAnexoLista}
          />
        </PanelCard>

        <PanelCard title="Pesquisa" className="min-w-0">
          {!campanha && !criarAberto ? (
            <div className="flex h-full flex-col justify-between gap-3">
              <PlaceholderNote>
                Nenhuma pesquisa criada ainda. Cadastre o período e a quantidade
                prevista de colaboradores.
              </PlaceholderNote>
              <button
                type="button"
                className="w-fit rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                disabled={savingCampanha}
                onClick={() => setCriarAberto(true)}
              >
                Criar pesquisa
              </button>
            </div>
          ) : null}

        {!campanha && criarAberto ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
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
                className="sm:col-span-2"
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
          <div className="space-y-4">
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Status
                </dt>
                <dd className="mt-0.5">
                  <span className="inline-flex rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[11px] font-extrabold text-[#4338ca]">
                    {campanhaStatusSincronizado
                      ? RISCOS_CAMPANHA_STATUS_LABELS[campanha.status]
                      : "Sincronizando…"}
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

            <div className="border-t border-[#eef2f7] pt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Link da pesquisa
              </p>
              {!campanhaStatusSincronizado ? (
                <PlaceholderNote>
                  Sincronizando status da campanha com o banco…
                </PlaceholderNote>
              ) : exibeLinkConvite ? (
                <div className="space-y-1.5 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                      Link
                    </p>
                    <a
                      href={pathAvaliacaoCampanha(campanha.codigo_publico)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 break-all font-mono text-xs font-semibold text-brand-blue hover:underline"
                    >
                      {pathAvaliacaoCampanha(campanha.codigo_publico)}
                    </a>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                      Código da campanha
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-extrabold text-navy">
                      {campanha.codigo_publico}
                    </p>
                  </div>
                  {campanha.status === "encerrada" ? (
                    <p className="text-[11px] text-[#64748b]">
                      Pesquisa encerrada. O link permanece apenas como
                      referência administrativa.
                    </p>
                  ) : null}
                </div>
              ) : (
                <PlaceholderNote>
                  A pesquisa ainda não foi aberta.
                </PlaceholderNote>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[#eef2f7] pt-3">
              {campanhaStatusSincronizado && exibeLinkConvite ? (
                <>
                  <button
                    type="button"
                    className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                    disabled={!permiteCopiarLink}
                    title={
                      permiteCopiarLink
                        ? "Copiar link da pesquisa"
                        : "Pesquisa encerrada — cópia desabilitada"
                    }
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
                </>
              ) : null}
              {campanhaStatusSincronizado && acoesConvite.exibirAbrir ? (
                <button
                  type="button"
                  className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
                  disabled={savingCampanha || !podeAbrirPesquisa}
                  onClick={handleTentarAbrir}
                  title={
                    preRequisitoAbrir ??
                    "Libera o portal para respostas (status Aberta)"
                  }
                >
                  Abrir pesquisa
                </button>
              ) : null}
              {campanhaStatusSincronizado && acoesConvite.exibirEncerrar ? (
                <button
                  type="button"
                  className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
                  disabled={savingCampanha}
                  onClick={() => setConfirmEncerrarOpen(true)}
                  title="Encerra a pesquisa e bloqueia novos acessos no portal"
                >
                  Encerrar pesquisa
                </button>
              ) : null}
              {podeCancelarProcesso ? (
                <button
                  type="button"
                  className="rounded-xl border border-brand-red/30 px-3 py-2 text-xs font-bold text-brand-red disabled:opacity-40"
                  disabled={savingCampanha}
                  onClick={() => {
                    setMotivoCancelamento("");
                    setErroCancelar(null);
                    setConfirmCancelarOpen(true);
                  }}
                  title="Cancela o processo preservando o histórico para auditoria"
                >
                  Cancelar processo
                </button>
              ) : null}
              {exclusaoDefinitivaDisponivel && campanhaStatusSincronizado ? (
                <button
                  type="button"
                  className="rounded-xl border border-[#7f1d1d]/40 bg-[#fef2f2] px-3 py-2 text-xs font-bold text-[#7f1d1d] disabled:opacity-40"
                  disabled={savingCampanha}
                  onClick={() => {
                    setConfirmacaoExclusao("");
                    setErroExcluir(null);
                    setConfirmExcluirOpen(true);
                  }}
                  title="Exclusão definitiva — somente ambiente controlado"
                >
                  Excluir campanha
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </PanelCard>
      </div>

      {/* Linha 2 — Participantes (largura total) */}
      <PanelCard title="Participantes">
        {campanha ? (
          <RiscosCampanhaParticipantesSection
            campanha={campanha}
            participantes={participantes}
            saving={savingParticipante}
            onCriar={onCriarParticipante}
            onImportarExcel={onImportarParticipantesExcel}
            onRemover={onRemoverParticipante}
            podeRemoverParticipante={podeRemoverParticipante}
          />
        ) : (
          <PlaceholderNote>
            Crie a pesquisa para gerenciar participantes.
          </PlaceholderNote>
        )}
      </PanelCard>

      {/* Linha 3 — Resultados | Relatório */}
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <PanelCard title="Resultados">
          <RiscosResultadosPanel
            campanha={campanha}
            refreshKey={participantes.map((p) => `${p.id}:${p.status}`).join("|")}
          />
        </PanelCard>

        <PanelCard title="Relatório">
          {!relatorioExiste ? (
            <PlaceholderNote>
              Relatório disponível quando houver relatório final persistido.
            </PlaceholderNote>
          ) : (
            <div className="mt-auto flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white"
                onClick={() =>
                  toast.message(
                    "Visualização do relatório será disponibilizada em breve."
                  )
                }
              >
                Visualizar relatório
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
                onClick={() =>
                  toast.message(
                    "Exportação em PDF será disponibilizada em breve."
                  )
                }
              >
                Exportar PDF
              </button>
            </div>
          )}
        </PanelCard>
      </div>

      {/* Linha 4 — Histórico (largura total) */}
      <PanelCard title="Histórico">
        {!historicoComEventos ? (
          <PlaceholderNote>Nenhum evento registrado.</PlaceholderNote>
        ) : (
          <ol className="relative ml-1 space-y-0 border-l-2 border-[#e2e8f0] pl-5">
            {historico.map((item) => (
              <li key={item.id} className="relative pb-3 last:pb-0">
                <span
                  className={`absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                    item.done ? "bg-brand-blue" : "bg-[#cbd5e1]"
                  }`}
                />
                <p
                  className={`text-sm font-semibold ${
                    item.done ? "text-navy" : "text-[#94a3b8]"
                  }`}
                >
                  {item.label}
                </p>
                {item.detail ? (
                  <p
                    className={`text-[11px] ${
                      item.done ? "text-[#64748b]" : "text-[#cbd5e1]"
                    }`}
                  >
                    {item.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
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

      <Modal
        open={confirmEncerrarOpen}
        onClose={() => {
          if (!savingCampanha) setConfirmEncerrarOpen(false);
        }}
        title="Encerrar pesquisa"
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
              onClick={() => setConfirmEncerrarOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-xl bg-brand-red px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              disabled={savingCampanha || !campanha}
              onClick={() => {
                void (async () => {
                  try {
                    await onEncerrarCampanha();
                    setConfirmEncerrarOpen(false);
                  } catch {
                    // mantém aberto
                  }
                })();
              }}
            >
              {savingCampanha ? "Encerrando…" : "Encerrar pesquisa"}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[#475569]">
          Tem certeza que deseja encerrar esta pesquisa?
          <br />
          <br />
          Após o encerramento, novos participantes não poderão responder.
        </p>
      </Modal>

      <Modal
        open={confirmCancelarOpen}
        onClose={() => {
          if (!savingCampanha) setConfirmCancelarOpen(false);
        }}
        title="Cancelar processo"
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
              onClick={() => setConfirmCancelarOpen(false)}
            >
              Voltar
            </button>
            <button
              type="button"
              className="rounded-xl bg-brand-red px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              disabled={savingCampanha || !campanha || !motivoCancelamento.trim()}
              onClick={() => {
                void (async () => {
                  setErroCancelar(null);
                  const motivo = motivoCancelamento.trim();
                  if (!motivo) {
                    setErroCancelar("Informe o motivo do cancelamento.");
                    return;
                  }
                  if (motivo.length < 5) {
                    setErroCancelar("O motivo deve ter ao menos 5 caracteres.");
                    return;
                  }
                  try {
                    await onCancelarProcesso(motivo);
                    setConfirmCancelarOpen(false);
                    setMotivoCancelamento("");
                  } catch (err) {
                    setErroCancelar(
                      err instanceof Error
                        ? err.message
                        : "Não foi possível cancelar o processo."
                    );
                  }
                })();
              }}
            >
              {savingCampanha ? "Cancelando…" : "Confirmar cancelamento"}
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm leading-relaxed text-[#475569]">
          <p>
            Esta ação irá cancelar o processo de Riscos Psicossociais.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Os participantes não poderão mais acessar a pesquisa.</li>
            <li>
              As respostas existentes deixarão de ser consideradas nos
              resultados.
            </li>
            <li>O histórico será preservado para auditoria.</li>
          </ul>
          <Field
            label={
              <>
                Motivo do cancelamento
                <RequiredMark />
              </>
            }
          >
            <textarea
              className="min-h-[96px] w-full rounded-xl border border-[#e2e8f0] px-3 py-2 text-sm text-navy outline-none focus:border-brand-blue"
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              placeholder="Descreva o motivo do cancelamento"
              disabled={savingCampanha}
              maxLength={2000}
            />
          </Field>
          {erroCancelar ? (
            <p className="text-xs font-semibold text-brand-red">{erroCancelar}</p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={confirmExcluirOpen}
        onClose={() => {
          if (!savingCampanha) setConfirmExcluirOpen(false);
        }}
        title="Excluir campanha"
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
              onClick={() => setConfirmExcluirOpen(false)}
            >
              Voltar
            </button>
            <button
              type="button"
              className="rounded-xl bg-[#7f1d1d] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              disabled={
                savingCampanha ||
                !campanha ||
                confirmacaoExclusao.trim().toUpperCase() !==
                  (campanha.codigo_publico ?? "").trim().toUpperCase()
              }
              onClick={() => {
                void (async () => {
                  setErroExcluir(null);
                  try {
                    await onExcluirCampanha(confirmacaoExclusao);
                    setConfirmExcluirOpen(false);
                    setConfirmacaoExclusao("");
                  } catch (err) {
                    setErroExcluir(
                      err instanceof Error
                        ? err.message
                        : "Não foi possível excluir a campanha."
                    );
                  }
                })();
              }}
            >
              {savingCampanha ? "Excluindo…" : "Excluir definitivamente"}
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm leading-relaxed text-[#475569]">
          <p className="font-semibold text-[#7f1d1d]">
            Esta ação apaga definitivamente a campanha e não pode ser desfeita.
          </p>
          <p>
            Disponível apenas em ambiente controlado/desenvolvimento. Em
            produção use <strong>Cancelar processo</strong>.
          </p>
          <Field
            label={
              <>
                Digite o código público{" "}
                <span className="font-extrabold text-navy">
                  {campanha?.codigo_publico}
                </span>{" "}
                para confirmar
                <RequiredMark />
              </>
            }
          >
            <input
              type="text"
              className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2 text-sm uppercase tracking-wide text-navy outline-none focus:border-brand-blue"
              value={confirmacaoExclusao}
              onChange={(e) => setConfirmacaoExclusao(e.target.value)}
              placeholder="Código da campanha"
              disabled={savingCampanha}
              autoComplete="off"
            />
          </Field>
          {erroExcluir ? (
            <p className="text-xs font-semibold text-brand-red">{erroExcluir}</p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function buildHistorico(
  processo: RiscosPsicossociaisProcesso,
  participantes: RiscosCampanhaParticipanteRecord[]
) {
  const campanha = processo.campanha;
  const lista = processo.listaPresenca;
  const items: Array<{
    id: string;
    label: string;
    detail?: string;
    done: boolean;
  }> = [];

  if (processo.exigeLaudosSst) {
    items.push({
      id: "laudos",
      label: "Laudos SST",
      detail: processo.laudosSstConcluido
        ? "Dependência concluída"
        : "Aguardando finalização",
      done: processo.laudosSstConcluido,
    });
  } else {
    items.push({
      id: "origem-manual",
      label: "Inclusão manual pelo cadastro do cliente",
      detail: "Pesquisa Psicossocial criada manualmente pelo cadastro do cliente.",
      done: true,
    });
  }

  items.push(
    {
      id: "lista",
      label: "Lista de presença concluída",
      detail: processo.listaPresencaConcluida
        ? [
            lista.lista_solicitada_em
              ? `Solicitada em ${formatDateIsoToBR(
                  lista.lista_solicitada_em.slice(0, 10)
                )}`
              : null,
            lista.lista_anexo_nome ? `Anexo: ${lista.lista_anexo_nome}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Concluída"
        : "Pendente",
      done: processo.listaPresencaConcluida,
    },
    {
      id: "pesquisa",
      label: "Pesquisa criada",
      detail: campanha
        ? `${formatPeriodoCampanha(
            campanha.data_inicio,
            campanha.data_encerramento
          )} · ${RISCOS_CAMPANHA_STATUS_LABELS[campanha.status]}`
        : undefined,
      done: Boolean(campanha),
    },
    {
      id: "participantes",
      label:
        participantes.length > 0
          ? "Participante cadastrado"
          : "Participantes cadastrados",
      detail:
        participantes.length > 0
          ? `${participantes.length} participante(s) cadastrado(s)`
          : "Aguardando cadastro",
      done: participantes.length > 0,
    },
    {
      id: "qr",
      label: "QR Code enviado",

      detail: "Em breve",
      done: false,
    },
    {
      id: "respostas",
      label: "Primeiras respostas",
      detail: participantes.some((p) => p.status === "respondido")
        ? "Respostas registradas"
        : "Aguardando respostas",
      done: participantes.some((p) => p.status === "respondido"),
    },
    {
      id: "encerrada",
      label: "Pesquisa encerrada",
      done: campanha?.status === "encerrada",
    },
    {
      id: "cancelada",
      label: "Processo cancelado",
      detail:
        campanha?.status === "cancelada"
          ? [
              campanha.cancelada_em
                ? `Em ${formatDateIsoToBR(campanha.cancelada_em.slice(0, 10))}`
                : null,
              campanha.cancelada_por
                ? `Por ${campanha.cancelada_por}`
                : null,
              campanha.motivo_cancelamento
                ? `Motivo: ${campanha.motivo_cancelamento}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Cancelada"
          : undefined,
      done: campanha?.status === "cancelada",
    },
    {
      id: "relatorio",
      label: "Relatório gerado",
      detail: "Em breve",
      done: false,
    }
  );

  return items;
}
