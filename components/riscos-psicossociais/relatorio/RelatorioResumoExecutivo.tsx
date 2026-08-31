"use client";

import type { ReactNode } from "react";
import {
  IconChart,
  IconChecklist,
  IconShield,
  IconUsers,
} from "@/components/ui/icons/OutlineIcons";
import {
  formatTaxaParticipacao,
  type RiscosRelatorioRecord,
} from "@/lib/riscos-relatorio";
import {
  bgSuavePorClassificacaoId,
  contarFaixasClassificacao,
  corPorClassificacaoId,
  statusGeralResumo,
} from "@/lib/riscos-relatorio-view";
import { indicadoresComplementaresDeRelatorio } from "@/lib/riscos-indicadores-complementares";

function labelCurtoClassificacao(label: string): string {
  return String(label ?? "")
    .replace(/^Situação\s+/i, "")
    .trim() || "—";
}

function CardMetric({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  valueClassName,
  hintClassName,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "info";
  valueClassName?: string;
  hintClassName?: string;
}) {
  const tones = {
    neutral: "border-[#e8edf5] bg-white",
    ok: "border-[#bbf7d0] bg-[#f0fdf4]",
    warn: "border-[#fde68a] bg-[#fefce8]",
    danger: "border-[#fecaca] bg-[#fef2f2]",
    info: "border-[#c7d2fe] bg-[#eef1ff]",
  } as const;

  return (
    <div
      className={`relatorio-visao-metric flex h-full min-w-0 flex-col rounded-xl border px-3.5 py-2.5 ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
            {label}
          </p>
          <p
            className={
              valueClassName ??
              "mt-1 text-[17px] font-extrabold tabular-nums leading-none text-navy"
            }
          >
            {value}
          </p>
        </div>
        <div className="shrink-0 rounded-md bg-white/80 p-1.5 text-navy ring-1 ring-[#e8edf5]">
          {icon}
        </div>
      </div>
      {hint ? (
        <p
          className={
            hintClassName ??
            "relatorio-visao-metric-hint mt-1 min-w-0 break-words text-[10px] leading-snug text-app-muted"
          }
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function CategoriaAtencaoLinha({
  nome,
  classificacaoId,
  classificacaoLabel,
}: {
  nome: string;
  classificacaoId?: string | null;
  classificacaoLabel: string;
}) {
  const curto = labelCurtoClassificacao(classificacaoLabel);
  const cor = corPorClassificacaoId(classificacaoId);
  const bg = bgSuavePorClassificacaoId(classificacaoId);

  return (
    <li className="flex items-start justify-between gap-2 border-b border-[#eef2f7] py-1.5 last:border-b-0">
      <span className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-navy">
        {nome}
      </span>
      <span
        className="relatorio-barra-badge shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold leading-none"
        style={{
          backgroundColor: bg,
          color: cor,
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {curto}
      </span>
    </li>
  );
}

export function RelatorioResumoExecutivo({
  relatorio,
}: {
  relatorio: RiscosRelatorioRecord;
}) {
  const json = relatorio.resultado_json;
  const resumo = json?.resumoExecutivo;
  const capa = json?.capa;
  const faixas = contarFaixasClassificacao(json?.dimensoes ?? []);
  const emAtencao =
    faixas.emAtencao || (resumo?.dimensoesCriticas?.length ?? 0);
  const status = statusGeralResumo({
    riscoIntermediarioCount: faixas.intermediario,
    riscoParaSaudeCount: faixas.riscoParaSaude,
    // Snapshot antigo sem dimensoes: agregado só como atenção/monitoramento.
    dimensoesCriticasCount: json?.dimensoes?.length
      ? undefined
      : resumo?.dimensoesCriticas?.length,
  });

  const empresa = capa?.empresaNome || relatorio.empresa_nome;
  const codigo = capa?.codigoPublico || relatorio.codigo_publico || "—";
  const participantes = capa?.participantes ?? relatorio.participantes ?? 0;
  const respondentes = capa?.respondentes ?? relatorio.respondentes ?? 0;
  const taxa = formatTaxaParticipacao(
    resumo?.participacaoPercentual ??
      capa?.taxaParticipacao ??
      relatorio.taxa_participacao
  );
  const totalDimensoes =
    resumo?.quantidadeDimensoes ??
    (json?.dimensoes ?? []).filter((d) => d.entraNoCalculo).length;

  const statusTone =
    status.tom === "critico"
      ? "danger"
      : status.tom === "atencao"
        ? "warn"
        : status.tom === "ok"
          ? "ok"
          : "neutral";

  const atencaoTone =
    faixas.riscoParaSaude > 0
      ? "danger"
      : emAtencao > 0
        ? "warn"
        : "ok";

  const criticas = resumo?.dimensoesCriticas ?? [];
  const meioCriticas = Math.ceil(criticas.length / 2);
  const criticasColunas = [
    criticas.slice(0, meioCriticas),
    criticas.slice(meioCriticas),
  ] as const;
  const classificacaoPorId = new Map(
    (json?.dimensoes ?? []).map((d) => [d.id, d.classificacaoId])
  );

  const indicadoresComplementares = indicadoresComplementaresDeRelatorio(relatorio);
  const indicadoresTone =
    indicadoresComplementares.statusGeral === "requer_atencao"
      ? "warn"
      : indicadoresComplementares.statusGeral === "sem_dados" ||
          indicadoresComplementares.statusGeral === "indisponivel"
        ? "neutral"
        : "ok";

  return (
    <section className="relatorio-visao-executiva">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
          Visão executiva
        </p>
        <h3 className="mt-3 text-lg font-extrabold text-navy">Objetivo</h3>
      </div>

      <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-5 py-5">
        <div className="space-y-3.5 text-[13px] leading-relaxed text-navy">
          <p>
            O presente relatório apresenta os resultados da Avaliação de Riscos
            Psicossociais da organização <strong>{empresa}</strong> (campanha{" "}
            <strong>{codigo}</strong>), realizada por meio do instrumento{" "}
            <strong>COPSOQ II-Br</strong>, referência reconhecida para análise
            de fatores psicossociais no trabalho.
          </p>
          <p>
            Foram considerados{" "}
            <strong>{participantes} participante(s) elegível(is)</strong>, com{" "}
            <strong>{respondentes} respondente(s) válido(s)</strong> e taxa de
            participação de <strong>{taxa}</strong>. A análise contempla{" "}
            <strong>{totalDimensoes} categorias</strong>, permitindo distinguir
            fatores de risco e fatores de proteção conforme as Orientações
            oficiais do instrumento.
          </p>
          <p>
            Este relatório tem como finalidade subsidiar a empresa na
            identificação de fatores de atenção relacionados aos riscos
            psicossociais, contribuindo para o desenvolvimento de estratégias
            preventivas, ações de melhoria organizacional e fortalecimento das
            práticas voltadas à promoção da saúde e segurança ocupacional.
          </p>
          <p>
            Além do atendimento às exigências normativas aplicáveis, a presente
            avaliação busca apoiar a construção de um ambiente de trabalho mais
            saudável, equilibrado e produtivo, promovendo melhores condições
            organizacionais e contribuindo para o bem-estar físico, emocional e
            psicossocial dos trabalhadores.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 items-stretch gap-3">
        <CardMetric
          label="Participação"
          value={formatTaxaParticipacao(
            resumo?.participacaoPercentual ?? capa?.taxaParticipacao
          )}
          hint={`${capa?.respondentes ?? 0} de ${capa?.participantes ?? 0} concluíram`}
          icon={<IconChart size={16} />}
          tone="info"
        />
        <CardMetric
          label="Respondentes"
          value={capa?.respondentes ?? relatorio.respondentes ?? 0}
          hint="Sessões concluídas válidas"
          icon={<IconUsers size={16} />}
        />
        <CardMetric
          label="Categorias avaliadas"
          value={resumo?.quantidadeDimensoes ?? 0}
          hint="Categorias COPSOQ no cálculo"
          icon={<IconChecklist size={16} />}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 items-stretch gap-3">
        <CardMetric
          label="Categorias em atenção"
          value={emAtencao}
          hint={
            emAtencao > 0
              ? "Moderada ou Desfavorável"
              : "Nenhuma categoria em atenção"
          }
          icon={<IconShield size={16} />}
          tone={atencaoTone}
        />
        <CardMetric
          label="Status geral"
          value={status.label}
          hint={status.mensagem}
          icon={<IconShield size={16} />}
          tone={statusTone}
          valueClassName="relatorio-visao-status-value mt-1 min-w-0 break-words text-[15px] font-extrabold leading-tight tracking-tight text-navy"
          hintClassName="relatorio-visao-status-hint mt-1 min-w-0 break-words text-[9px] leading-snug tracking-tight text-app-muted"
        />
      </div>

      {indicadoresComplementares.disponivel ? (
        <div className="mt-3">
          <CardMetric
            label="Indicadores complementares"
            value={indicadoresComplementares.labelStatusGeral}
            hint="Comportamentos ofensivos · separado das 10 categorias COPSOQ"
            icon={<IconShield size={16} />}
            tone={indicadoresTone}
            valueClassName="mt-1 min-w-0 break-words text-[14px] font-extrabold leading-tight tracking-tight text-navy"
            hintClassName="mt-1 min-w-0 break-words text-[9px] leading-snug tracking-tight text-app-muted"
          />
        </div>
      ) : null}

      {criticas.length > 0 ? (
        <div className="riscos-relatorio-print-card mt-6 rounded-xl border border-[#e8edf5] bg-white px-5 py-4">
          <p className="text-sm font-extrabold text-navy">
            Categorias em atenção
          </p>
          <p className="mt-1 text-xs text-app-muted">
            {emAtencao}{" "}
            {emAtencao === 1
              ? "categoria requer monitoramento"
              : "categorias requerem monitoramento"}
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-x-5">
            {criticasColunas.map((coluna, colIdx) => (
              <ul
                key={colIdx}
                className={
                  colIdx === 0 ? "border-r border-[#eef2f7] pr-4" : "pl-1"
                }
              >
                {coluna.map((d) => (
                  <CategoriaAtencaoLinha
                    key={d.id}
                    nome={d.nome}
                    classificacaoId={classificacaoPorId.get(d.id)}
                    classificacaoLabel={d.classificacaoLabel}
                  />
                ))}
              </ul>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
