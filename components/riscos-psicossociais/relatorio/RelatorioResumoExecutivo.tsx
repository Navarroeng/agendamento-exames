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
  contarFaixasClassificacao,
  statusGeralResumo,
} from "@/lib/riscos-relatorio-view";

function CardMetric({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "info";
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
      className={`rounded-2xl border px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-navy sm:text-[1.65rem]">
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 text-xs leading-snug text-app-muted">{hint}</p>
          ) : null}
        </div>
        <div className="rounded-xl bg-white/80 p-2 text-navy shadow-sm ring-1 ring-[#e8edf5]">
          {icon}
        </div>
      </div>
    </div>
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

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Visão executiva
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
            Objetivo
          </h3>
        </div>
      </div>

      <div className="mb-4 rounded-3xl border border-[#e8edf5] bg-gradient-to-br from-[#f8fafc] to-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="space-y-3 text-sm leading-relaxed text-navy">
          <p>
            O presente relatório apresenta os resultados da Avaliação de Riscos
            Psicossociais da organização <strong>{empresa}</strong> (campanha{" "}
            <strong>{codigo}</strong>), realizada por meio do instrumento{" "}
            <strong>COPSOQ II-Br</strong>, referência reconhecida para análise
            de fatores psicossociais no ambiente de trabalho.
          </p>
          <p>
            Foram considerados{" "}
            <strong>{participantes} participante(s) elegível(is)</strong>, com{" "}
            <strong>{respondentes} respondente(s) válido(s)</strong> e taxa de
            participação de <strong>{taxa}</strong>. A análise contempla{" "}
            <strong>{totalDimensoes} categorias</strong>, permitindo distinguir
            fatores de risco e fatores de proteção conforme as orientações
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CardMetric
          label="Participação"
          value={formatTaxaParticipacao(
            resumo?.participacaoPercentual ?? capa?.taxaParticipacao
          )}
          hint={`${capa?.respondentes ?? 0} de ${capa?.participantes ?? 0} concluíram`}
          icon={<IconChart size={18} />}
          tone="info"
        />
        <CardMetric
          label="Respondentes"
          value={capa?.respondentes ?? relatorio.respondentes ?? 0}
          hint="Sessões concluídas válidas"
          icon={<IconUsers size={18} />}
        />
        <CardMetric
          label="Dimensões avaliadas"
          value={resumo?.quantidadeDimensoes ?? 0}
          hint="Dimensões COPSOQ no cálculo"
          icon={<IconChecklist size={18} />}
        />
        <CardMetric
          label="Dimensões em atenção"
          value={emAtencao}
          hint={
            emAtencao > 0
              ? "Moderada ou Desfavorável"
              : "Nenhuma dimensão em atenção"
          }
          icon={<IconShield size={18} />}
          tone={atencaoTone}
        />
        <CardMetric
          label="Status geral"
          value={status.label}
          hint={status.mensagem}
          icon={<IconShield size={18} />}
          tone={statusTone}
        />
      </div>

      {(resumo?.dimensoesCriticas?.length ?? 0) > 0 ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 ${
            faixas.riscoParaSaude > 0
              ? "border-[#fecaca] bg-[#fef2f2]"
              : "border-[#fde68a] bg-[#fefce8]"
          }`}
        >
          <p
            className={`text-xs font-extrabold ${
              faixas.riscoParaSaude > 0 ? "text-[#b91c1c]" : "text-[#a16207]"
            }`}
          >
            Dimensões em atenção
          </p>
          <p
            className={`mt-0.5 text-[11px] ${
              faixas.riscoParaSaude > 0
                ? "text-[#b91c1c]/80"
                : "text-[#a16207]/80"
            }`}
          >
            Moderada ou Desfavorável
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {resumo!.dimensoesCriticas.map((d) => (
              <li
                key={d.id}
                className={`text-xs font-semibold ${
                  faixas.riscoParaSaude > 0
                    ? "text-[#7f1d1d]"
                    : "text-[#854d0e]"
                }`}
              >
                • {d.nome}
                <span className="font-medium opacity-70">
                  {" "}
                  — {d.classificacaoLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
