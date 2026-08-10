"use client";

import { useMemo, useState } from "react";
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
      className={`flex flex-col rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm ${className}`}
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

export function RiscosPainelCards({
  processo,
  participantes,
  savingCampanha = false,
  savingParticipante = false,
  onCriarCampanha,
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

  const previstos = campanha?.quantidade_prevista ?? 0;
  const resumo = useMemo(
    () => buildParticipantesResumo(previstos, participantes),
    [previstos, participantes]
  );

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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1. Dados da pesquisa */}
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
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
                    Situação
                  </dt>
                  <dd className="mt-0.5">
                    <span className="inline-flex rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[11px] font-extrabold text-[#4338ca]">
                      {RISCOS_CAMPANHA_STATUS_LABELS[campanha.status]}
                    </span>
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

        {/* 2. Participantes */}
        <PanelCard title="Participantes" eyebrow="Card 2">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Previstos" value={resumo.previstos} />
            <Metric label="Responderam" value={resumo.respondidos} />
            <Metric label="Pendentes" value={resumo.pendentes} />
          </div>
          <p className="mt-2 text-[11px] text-[#94a3b8]">
            Cadastrados: {resumo.cadastrados}
            {!campanha ? " · Crie a pesquisa para gerenciar participantes." : ""}
          </p>
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

        {/* 3. Distribuição */}
        <PanelCard title="Distribuição" eyebrow="Card 3">
          <div className="flex flex-1 items-center gap-5">
            <div
              className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#2563eb ${participacaoPct}%, #e2e8f0 0)`,
              }}
              aria-hidden
            >
              <div className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-white text-center">
                <span className="text-lg font-extrabold tabular-nums text-navy">
                  {participacaoPct}%
                </span>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-navy">
                {resumo.respondidos} responderam
              </p>
              <p className="text-[#64748b]">
                {resumo.pendentes} pendentes
                {resumo.cadastrados === 0 && resumo.previstos === 0
                  ? " · sem base ainda"
                  : ""}
              </p>
            </div>
          </div>
        </PanelCard>

        {/* 4. Convites */}
        <PanelCard title="Convites" eyebrow="Card 4">
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
                  Código: {campanha.codigo_publico}
                </p>
              </div>
              <PlaceholderNote>
                QR Code e envio de convites serão disponibilizados em etapa
                futura.
              </PlaceholderNote>
            </div>
          ) : (
            <PlaceholderNote>
              Crie a pesquisa para gerar o link e preparar os convites.
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
              className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
              onClick={() =>
                toast.message("Reenvio de convite será disponibilizado em breve.")
              }
            >
              Reenviar convite
            </button>
          </div>
        </PanelCard>

        {/* 5. Questionário */}
        <PanelCard title="Questionário" eyebrow="Card 5">
          <PlaceholderNote>
            Questionário padrão ainda não configurado nesta etapa. Visualização e
            edição das perguntas virão em seguida.
          </PlaceholderNote>
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

        {/* 6. Resultados */}
        <PanelCard title="Resultados" eyebrow="Card 6">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Respondidos" value={resumo.respondidos} />
            <Metric label="Participação" value={`${participacaoPct}%`} />
            <Metric label="Dimensões" value="—" />
          </div>
          <PlaceholderNote>
            Indicadores parciais ficarão disponíveis conforme as respostas forem
            registradas.
          </PlaceholderNote>
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

        {/* 7. Relatório */}
        <PanelCard title="Relatório" eyebrow="Card 7">
          {campanha?.status === "encerrada" ? (
            <>
              <p className="text-sm text-[#475569]">
                A pesquisa foi encerrada. Gere o relatório quando estiver pronto.
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <button
                  type="button"
                  className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white"
                  onClick={() =>
                    toast.message("Geração de relatório em breve.")
                  }
                >
                  Gerar relatório
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
                  onClick={() =>
                    toast.message("Visualização de relatório em breve.")
                  }
                >
                  Visualizar relatório
                </button>
              </div>
            </>
          ) : (
            <PlaceholderNote>
              Relatório ainda não disponível. Ficará liberado após o
              encerramento da pesquisa.
            </PlaceholderNote>
          )}
        </PanelCard>

        {/* 8. Histórico */}
        <PanelCard
          title="Histórico"
          eyebrow="Card 8"
          className="lg:col-span-2"
        >
          <ol className="space-y-3">
            {historico.map((item) => (
              <li key={item.id} className="flex gap-3 text-sm">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    item.done ? "bg-brand-blue" : "bg-[#cbd5e1]"
                  }`}
                />
                <div>
                  <p
                    className={`font-semibold ${
                      item.done ? "text-navy" : "text-[#94a3b8]"
                    }`}
                  >
                    {item.label}
                  </p>
                  {item.detail ? (
                    <p className="text-[11px] text-[#64748b]">{item.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </PanelCard>
      </div>

      {campanha && verParticipantes ? (
        <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4">
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
    </div>
  );
}

function Metric({
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
      label: "Lista de presença",
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
      id: "lista_importada",
      label: "Lista importada",
      detail:
        participantes.length > 0
          ? `${participantes.length} participante(s) cadastrado(s)`
          : "Aguardando importação ou cadastro",
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
      detail:
        participantes.some((p) => p.status === "respondido")
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
