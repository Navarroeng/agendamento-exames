"use client";

import { Modal } from "@/components/ui/Modal";
import {
  formatDataHoraRelatorio,
  formatTaxaParticipacao,
  type RiscosRelatorioRecord,
} from "@/lib/riscos-relatorio";
import { formatPeriodoCampanha } from "@/lib/riscos-campanha";

interface RiscosRelatorioViewerModalProps {
  open: boolean;
  relatorio: RiscosRelatorioRecord | null;
  onClose: () => void;
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 text-base font-extrabold tabular-nums text-navy">
        {value}
      </p>
    </div>
  );
}

export function RiscosRelatorioViewerModal({
  open,
  relatorio,
  onClose,
}: RiscosRelatorioViewerModalProps) {
  if (!open || !relatorio) return null;
  const json = relatorio.resultado_json;
  const capa = json?.capa;
  const resumo = json?.resumoExecutivo;
  const { data, hora } = formatDataHoraRelatorio(relatorio.gerado_em);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Relatório Final — Riscos Psicossociais"
      subtitle={`${relatorio.empresa_nome} · ${relatorio.codigo_publico}`}
      size="xxl"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-white"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      }
    >
      <div className="max-h-[70vh] space-y-8 overflow-y-auto pr-1">
        {/* CAPA */}
        <section className="rounded-2xl border border-[#e8edf5] bg-gradient-to-br from-[#f8fafc] to-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Capa
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-navy">
            {capa?.empresaNome || relatorio.empresa_nome}
          </h2>
          <p className="mt-1 text-sm text-app-muted">
            Período:{" "}
            {formatPeriodoCampanha(
              capa?.dataInicio || "",
              capa?.dataEncerramento || ""
            )}
          </p>
          <p className="text-sm text-app-muted">
            Código da campanha:{" "}
            <span className="font-bold text-navy">
              {capa?.codigoPublico || relatorio.codigo_publico}
            </span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Participantes" value={capa?.participantes ?? 0} />
            <Stat label="Respondentes" value={capa?.respondentes ?? 0} />
            <Stat
              label="Taxa de participação"
              value={formatTaxaParticipacao(capa?.taxaParticipacao)}
            />
            <Stat label="Gerado em" value={`${data} ${hora}`} />
          </div>
          <p className="mt-3 text-xs text-app-muted">
            Responsável:{" "}
            <span className="font-semibold text-navy">
              {relatorio.gerado_por || "—"}
            </span>
          </p>
        </section>

        {/* RESUMO EXECUTIVO */}
        <section>
          <h3 className="text-sm font-extrabold text-navy">Resumo executivo</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat
              label="Participação"
              value={formatTaxaParticipacao(resumo?.participacaoPercentual)}
            />
            <Stat
              label="Dimensões"
              value={resumo?.quantidadeDimensoes ?? 0}
            />
            <Stat
              label="Dimensões críticas"
              value={resumo?.dimensoesCriticas?.length ?? 0}
            />
            <Stat label="Status geral" value="Ver dimensões" />
          </div>
          <p className="mt-3 text-xs text-app-muted">
            {resumo?.statusGeralMensagem}
          </p>
          {(resumo?.dimensoesCriticas?.length ?? 0) > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-navy">
              {resumo!.dimensoesCriticas.map((d) => (
                <li key={d.id}>
                  • {d.nome} — {d.classificacaoLabel}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* RESULTADO GERAL (placeholder gráfico) */}
        <section>
          <h3 className="text-sm font-extrabold text-navy">Resultado geral</h3>
          <div className="mt-3 rounded-2xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-8 text-center text-sm text-app-muted">
            Gráfico principal será disponibilizado na próxima versão.
            <br />
            Análise por dimensão abaixo (instrumento COPSOQ II-Br).
          </div>
        </section>

        {/* DIMENSÕES */}
        <section>
          <h3 className="text-sm font-extrabold text-navy">Dimensões COPSOQ</h3>
          <div className="mt-3 space-y-3">
            {(json?.dimensoes ?? []).map((d) => (
              <article
                key={d.id}
                className="rounded-xl border border-[#e8edf5] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-navy">{d.nome}</h4>
                    <p className="mt-0.5 text-xs text-app-muted">{d.descricao}</p>
                  </div>
                  <span
                    className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white"
                    style={{ backgroundColor: d.cor }}
                  >
                    {d.classificacaoLabel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Stat
                    label="Média"
                    value={
                      d.media == null
                        ? "—"
                        : d.media.toFixed(2).replace(".", ",")
                    }
                  />
                  <Stat
                    label="Respondentes válidos"
                    value={d.respondentesValidos}
                  />
                  <Stat label="Tipo" value={d.tipo} />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CONCLUSÃO / RECOMENDAÇÕES */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] p-4">
            <h3 className="text-sm font-extrabold text-navy">Conclusão</h3>
            <p className="mt-2 text-xs text-app-muted">
              Placeholder — no futuro será elaborada automaticamente com apoio de
              IA, com base nas dimensões e no instrumento oficial.
            </p>
          </div>
          <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] p-4">
            <h3 className="text-sm font-extrabold text-navy">Recomendações</h3>
            <p className="mt-2 text-xs text-app-muted">
              Placeholder — recomendações personalizadas serão geradas em etapa
              futura.
            </p>
          </div>
        </section>
      </div>
    </Modal>
  );
}
