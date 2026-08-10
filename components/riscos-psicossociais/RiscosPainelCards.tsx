"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { RiscosCampanhaParticipantesSection } from "@/components/riscos-psicossociais/RiscosCampanhaParticipantesSection";
import { RiscosPainelPreRequisitos } from "@/components/riscos-psicossociais/RiscosPainelPreRequisitos";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
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
  onGarantirCodigoAcesso: _onGarantirCodigoAcesso,
  onCriarParticipante,
  onEditarParticipante,
  onRemoverParticipante,
}: RiscosPainelCardsProps) {
  const campanha = processo.campanha;

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

  const pesquisaEncerrada = campanha?.status === "encerrada";
  /** Relatório ainda não é gerado no produto; UI libera ações após encerrar. */
  const relatorioExiste = pesquisaEncerrada;

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

  const statusResultados = campanha
    ? RISCOS_CAMPANHA_STATUS_LABELS[campanha.status]
    : "—";

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
    <div className="space-y-4">
      {/* Linha 1 — Pesquisa | Participantes */}
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <PanelCard
          title="Pesquisa"
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
            <div className="space-y-3">
              <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
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
                <StatChip label="Cadastrados" value={resumo.cadastrados} />
                <StatChip label="Responderam" value={resumo.respondidos} />
                <StatChip label="Pendentes" value={resumo.pendentes} />
              </div>
            </div>
          ) : null}
        </PanelCard>

        <PanelCard title="Participantes">
          {campanha ? (
            <div className="min-h-0 max-h-[320px] flex-1 overflow-hidden lg:max-h-[360px]">
              <RiscosCampanhaParticipantesSection
                campanha={campanha}
                participantes={participantes}
                saving={savingParticipante}
                onCriar={onCriarParticipante}
                onEditar={onEditarParticipante}
                onRemover={onRemoverParticipante}
              />
            </div>
          ) : (
            <PlaceholderNote>
              Crie a pesquisa para gerenciar participantes.
            </PlaceholderNote>
          )}
        </PanelCard>
      </div>

      {/* Linha 2 — Pré-requisitos | Convites */}
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <PanelCard title="Pré-requisitos">
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

        <PanelCard title="Convites">
          {campanha ? (
            <div className="flex h-full flex-col gap-3">
              <div className="space-y-1.5 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                    Link
                  </p>
                  <p className="mt-0.5 break-all font-mono text-xs font-semibold text-brand-blue">
                    {pathAvaliacaoCampanha(campanha.codigo_publico)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                    Código da campanha
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-extrabold text-navy">
                    {campanha.codigo_publico}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
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
      </div>

      {/* Linha 3 — Questionário | Resultados */}
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <PanelCard title="Questionário">
          <div className="flex h-full flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <StatChip
                label="Perguntas"
                value={COPSOQ_INSTRUMENTO.totalPerguntasAvaliativas}
              />
              <StatChip label="Dimensões" value={COPSOQ_DIMENSOES.length} />
              <StatChip label="Ordem" value="01 → 40" />
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
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

        <PanelCard title="Resultados">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatChip label="Participação" value={`${participacaoPct}%`} />
            <StatChip label="Responderam" value={resumo.respondidos} />
            <StatChip label="Pendentes" value={resumo.pendentes} />
            <StatChip label="Risco geral" value="—" />
            <StatChip label="Status" value={statusResultados} />
          </div>
        </PanelCard>
      </div>

      {/* Linha 4 — Relatório | Histórico */}
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <PanelCard title="Relatório">
          {!relatorioExiste ? (
            <PlaceholderNote>
              Relatório disponível após o encerramento da pesquisa.
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
                  toast.message("Exportação em PDF será disponibilizada em breve.")
                }
              >
                Exportar PDF
              </button>
            </div>
          )}
        </PanelCard>

        <PanelCard title="Histórico">
          {!historicoComEventos ? (
            <PlaceholderNote>Nenhum evento registrado.</PlaceholderNote>
          ) : (
            <ol className="relative ml-1 max-h-[220px] space-y-0 overflow-y-auto border-l-2 border-[#e2e8f0] pl-5">
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
      </div>

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
  }> = [
    {
      id: "laudos",
      label: "Laudos SST",
      detail: processo.laudosSstConcluido
        ? "Dependência concluída"
        : "Aguardando finalização",
      done: processo.laudosSstConcluido,
    },
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
      id: "relatorio",
      label: "Relatório gerado",
      detail: "Em breve",
      done: false,
    },
  ];

  return items;
}
