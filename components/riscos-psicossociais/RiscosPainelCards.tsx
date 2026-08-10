"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Field, RequiredMark } from "@/components/ui/Field";
import { RiscosCampanhaParticipantesSection } from "@/components/riscos-psicossociais/RiscosCampanhaParticipantesSection";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  RISCOS_CAMPANHA_STATUS_LABELS,
  formatPeriodoCampanha,
  pathAvaliacaoCampanha,
} from "@/lib/riscos-campanha";
import {
  COPSOQ_DIMENSOES,
  COPSOQ_INSTRUMENTO,
} from "@/lib/copsoq";
import {
  buildParticipantesResumo,
  type RiscosCampanhaParticipanteRecord,
  type RiscosParticipanteInput,
} from "@/lib/riscos-campanha-participantes";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

interface RiscosPainelCardsProps {
  processo: RiscosPsicossociaisProcesso;
  participantes: RiscosCampanhaParticipanteRecord[];
  savingCampanha?: boolean;
  savingParticipante?: boolean;
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
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="mb-3">
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-sm font-extrabold text-navy">{title}</h3>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
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

function Metric({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: number | string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2.5 py-2 ${
        emphasize
          ? "border-[#fde68a] bg-[#fffbeb]"
          : "border-[#e8edf5] bg-[#f8fafc]"
      }`}
    >
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
  savingCampanha = false,
  savingParticipante = false,
  onCriarCampanha,
  onAbrirCampanha,
  onGarantirCodigoAcesso,
  onCriarParticipante,
  onEditarParticipante,
  onRemoverParticipante,
}: RiscosPainelCardsProps) {
  const campanha = processo.campanha;
  const [criarAberto, setCriarAberto] = useState(false);
  const [verParticipantes, setVerParticipantes] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataEncerramento, setDataEncerramento] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const participantesPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!verParticipantes) return;
    const timer = window.setTimeout(() => {
      participantesPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [verParticipantes]);

  const previstos = campanha?.quantidade_prevista ?? 0;
  const resumo = useMemo(
    () => buildParticipantesResumo(previstos, participantes),
    [previstos, participantes]
  );

  const faltamCadastrar = Math.max(0, resumo.previstos - resumo.cadastrados);

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

  const historico = buildHistorico(processo, participantes);
  const relatorioDisponivel = false;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Dados da pesquisa" eyebrow="Card 1">
          {!campanha && !criarAberto ? (
            <>
              <PlaceholderNote>
                Nenhuma pesquisa criada ainda. Cadastre o período e a quantidade
                prevista de colaboradores.
              </PlaceholderNote>
              <div className="mt-auto pt-4">
                <button
                  type="button"
                  className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                  disabled={savingCampanha}
                  onClick={() => setCriarAberto(true)}
                >
                  Criar pesquisa
                </button>
              </div>
            </>
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
            <>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                    Início
                  </dt>
                  <dd className="mt-0.5 font-semibold text-navy">
                    {formatDateIsoToBR(campanha.data_inicio.slice(0, 10))}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                    Encerramento previsto
                  </dt>
                  <dd className="mt-0.5 font-semibold text-navy">
                    {formatDateIsoToBR(campanha.data_encerramento.slice(0, 10))}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                    Qtd. prevista
                  </dt>
                  <dd className="mt-0.5 font-semibold text-navy">
                    {campanha.quantidade_prevista} colaboradores
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
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                    Situação
                  </dt>
                  <dd className="mt-0.5">
                    <span className="inline-flex rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[11px] font-extrabold text-[#4338ca]">
                      {RISCOS_CAMPANHA_STATUS_LABELS[campanha.status]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                    Data de criação
                  </dt>
                  <dd className="mt-0.5 font-semibold text-navy">
                    {campanha.created_at
                      ? formatDateIsoToBR(campanha.created_at.slice(0, 10))
                      : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                    Última atualização
                  </dt>
                  <dd className="mt-0.5 font-semibold text-navy">
                    {campanha.updated_at
                      ? formatDateIsoToBR(campanha.updated_at.slice(0, 10))
                      : "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-auto pt-4">
                <button
                  type="button"
                  className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
                  onClick={() =>
                    toast.message(
                      "Edição da pesquisa será disponibilizada em breve."
                    )
                  }
                >
                  Editar pesquisa
                </button>
              </div>
            </>
          ) : null}
        </PanelCard>

        <PanelCard title="Participantes" eyebrow="Card 2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Metric label="Previstos" value={resumo.previstos} />
            <Metric label="Cadastrados" value={resumo.cadastrados} />
            <Metric
              label="Faltam cadastrar"
              value={faltamCadastrar}
              emphasize={faltamCadastrar > 0}
            />
            <Metric label="Responderam" value={resumo.respondidos} />
            <Metric label="Pendentes" value={resumo.pendentes} />
          </div>
          {!campanha ? (
            <p className="mt-2 text-[11px] text-[#94a3b8]">
              Crie a pesquisa para gerenciar participantes.
            </p>
          ) : null}
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <button
              type="button"
              className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              disabled={!campanha}
              onClick={() => setVerParticipantes((v) => !v)}
            >
              {verParticipantes ? "Ocultar participantes" : "Ver participantes"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
              onClick={() =>
                toast.message(
                  "Importação por Excel será disponibilizada em etapa futura."
                )
              }
            >
              Importar lista
            </button>
          </div>
        </PanelCard>
      </div>

      {campanha && verParticipantes ? (
        <div
          ref={participantesPanelRef}
          className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4"
        >
          <RiscosCampanhaParticipantesSection
            campanha={campanha}
            participantes={participantes}
            saving={savingParticipante}
            onCriar={onCriarParticipante}
            onEditar={onEditarParticipante}
            onRemover={onRemoverParticipante}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Questionário" eyebrow="Card 3">
          <div className="space-y-2">
            <p className="text-sm font-extrabold text-navy">
              COPSOQ II-Br · Pesquisa Psicossocial
            </p>
            <dl className="grid gap-2 text-xs sm:grid-cols-3">
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
            <PlaceholderNote>
              Instrumento com 40 perguntas oficiais na sequência fixa. Dimensões
              organizam transições e cálculos futuros.
            </PlaceholderNote>
          </div>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
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
        </PanelCard>

        <PanelCard title="Resultados da Pesquisa" eyebrow="Card 4">
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
              <p className="text-[#64748b]">
                {faltamCadastrar} ainda não cadastrados
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Metric label="Participação" value={`${participacaoPct}%`} />
            <Metric label="Respondidos" value={resumo.respondidos} />
            <Metric label="Dimensões" value="—" />
            <Metric label="Risco geral" value="—" />
            <Metric
              label="Status"
              value={
                campanha
                  ? RISCOS_CAMPANHA_STATUS_LABELS[campanha.status]
                  : "—"
              }
            />
          </div>

          <div className="mt-auto pt-4">
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
        </PanelCard>

        <PanelCard title="Relatório Psicossocial" eyebrow="Card 5">
          <PlaceholderNote>
            Nenhum relatório disponível.
            <br />
            Será liberado após o encerramento da pesquisa.
          </PlaceholderNote>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <button
              type="button"
              className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              disabled={!relatorioDisponivel}
              title="Disponível após encerramento e implementação da geração"
            >
              Gerar relatório
            </button>
          </div>
        </PanelCard>

        <PanelCard title="Convites" eyebrow="Card 6">
          {campanha ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Link da pesquisa
                </p>
                <p className="mt-0.5 break-all font-mono text-xs font-semibold text-brand-blue">
                  {pathAvaliacaoCampanha(campanha.codigo_publico)}
                </p>
                <p className="mt-0.5 text-[11px] text-[#94a3b8]">
                  Código da campanha (URL/QR):{" "}
                  <span className="font-mono font-semibold text-navy">
                    {campanha.codigo_publico}
                  </span>
                </p>
                <p className="mt-2 text-[11px] text-[#64748b]">
                  O participante acessa pelo link informando CPF e data de
                  nascimento. Não é necessário código de acesso adicional.
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                  Status
                </p>
                <p className="mt-0.5 text-xs font-semibold text-navy">
                  {RISCOS_CAMPANHA_STATUS_LABELS[campanha.status]}
                </p>
              </div>
            </div>
          ) : (
            <PlaceholderNote>
              Crie a pesquisa para gerar o link e o QR Code da campanha.
            </PlaceholderNote>
          )}
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <button
              type="button"
              className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              disabled={!campanha}
              onClick={() => void handleCopiarLink()}
            >
              Copiar link
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
              disabled={
                !campanha ||
                savingCampanha ||
                campanha.status === "aberta" ||
                campanha.status === "encerrada"
              }
              onClick={() => void onAbrirCampanha()}
              title="Libera o portal para respostas (status Aberta)"
            >
              Abrir pesquisa
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
              disabled
              title="QR Code será disponibilizado em etapa futura"
            >
              Gerar QR Code
            </button>
          </div>
        </PanelCard>

        <PanelCard
          title="Histórico"
          eyebrow="Card 7"
          className="lg:col-span-2"
        >
          <ol className="relative ml-1 space-y-0 border-l-2 border-[#e2e8f0] pl-5">
            {historico.map((item) => (
              <li key={item.id} className="relative pb-4 last:pb-0">
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
        </PanelCard>
      </div>
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
