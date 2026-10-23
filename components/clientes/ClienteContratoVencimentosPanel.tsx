"use client";

import { Panel } from "@/components/ui/Panel";
import { IconClipboard } from "@/components/ui/icons/OutlineIcons";
import { useClienteContratoVencimentos } from "@/hooks/useClienteContratoVencimentos";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  VENCIMENTOS_ENCERRADOS_VAZIO,
  VENCIMENTOS_VAZIO,
  anosDoSeletor,
  periodoInicialVencimentos,
  resumoVencimentos,
  type ConsultaVencimentoContrato,
} from "@/lib/cliente-contrato-vencimentos";
import { formatDateBR } from "@/lib/format";
import { formatMesLabel } from "@/lib/listagem-meses";

interface ClienteContratoVencimentosPanelProps {
  ano: number;
  mes: number;
  consulta: ConsultaVencimentoContrato;
  onAnoChange: (ano: number) => void;
  onMesChange: (mes: number) => void;
  onConsultaChange: (consulta: ConsultaVencimentoContrato) => void;
  onAbrir: (clienteId: string) => void;
}

const MESES = Array.from({ length: 12 }, (_, index) => index + 1);

export function ClienteContratoVencimentosPanel({
  ano,
  mes,
  consulta,
  onAnoChange,
  onMesChange,
  onConsultaChange,
  onAbrir,
}: ClienteContratoVencimentosPanelProps) {
  const { linhas, loading, error } = useClienteContratoVencimentos(
    ano,
    mes,
    consulta
  );
  const anoAtual = periodoInicialVencimentos().ano;
  const anos = anosDoSeletor(anoAtual, ano);
  const vazio =
    consulta === "encerrados" ? VENCIMENTOS_ENCERRADOS_VAZIO : VENCIMENTOS_VAZIO;

  return (
    <Panel
      title="Vencimentos de contratos"
      icon={<IconClipboard />}
      iconTone="purple"
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
          Mês
          <select
            className="field-input field-input-compact w-[150px] text-sm"
            value={mes}
            aria-label="Mês do término previsto"
            onChange={(event) => onMesChange(Number(event.target.value))}
          >
            {MESES.map((numero) => (
              <option key={numero} value={numero}>
                {formatMesLabel({ year: ano, month: numero })}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
          Ano
          <select
            className="field-input field-input-compact w-[110px] text-sm"
            value={ano}
            aria-label="Ano do término previsto"
            onChange={(event) => onAnoChange(Number(event.target.value))}
          >
            {anos.map((numero) => (
              <option key={numero} value={numero}>
                {numero}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
          Exibir
          <select
            className="field-input field-input-compact w-[280px] text-sm"
            value={consulta}
            aria-label="Filtro de contratos cancelados e encerrados"
            onChange={(event) =>
              onConsultaChange(event.target.value as ConsultaVencimentoContrato)
            }
          >
            <option value="principal">Término previsto</option>
            <option value="encerrados">
              Cancelados e encerrados antecipadamente
            </option>
          </select>
        </label>
      </div>

      {!loading && !error ? (
        <p className="mb-4 text-sm font-extrabold text-navy">
          {resumoVencimentos({ ano, mes, total: linhas.length, consulta })}
        </p>
      ) : null}

      {loading ? (
        <p className="py-8 text-center text-sm text-app-muted">
          Carregando vencimentos...
        </p>
      ) : null}

      {!loading && error ? (
        <p className="py-8 text-center text-sm text-brand-red">{error}</p>
      ) : null}

      {!loading && !error && linhas.length === 0 ? (
        <p className="py-8 text-center text-sm text-app-muted">{vazio}</p>
      ) : null}

      {!loading && !error && linhas.length > 0 ? (
        <div className="table-wrap -mx-5 overflow-auto px-5">
          <table className="table-premium w-full min-w-[860px]">
            <thead>
              <tr>
                {[
                  "Cliente",
                  "CNPJ",
                  "Contrato",
                  "Início",
                  "Fim previsto",
                  "Situação",
                  "Ação",
                ].map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.contratoId}>
                  <td className="font-bold text-navy">
                    {formatClienteNomeDisplay(linha.clienteNome)}
                  </td>
                  <td>{linha.clienteCnpj ? formatCNPJ(linha.clienteCnpj) : "—"}</td>
                  <td className="font-semibold text-navy">{linha.contratoNumero}</td>
                  <td>{linha.inicioIso ? formatDateBR(linha.inicioIso) : "—"}</td>
                  <td>{formatDateBR(linha.fimPrevisto)}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${linha.situacaoClassName}`}
                      >
                        {linha.situacao}
                      </span>
                      {linha.renovacao ? (
                        <span
                          className="inline-flex rounded-full bg-[#e0e7ff] px-2 py-0.5 text-[10px] font-extrabold text-[#3730a3]"
                          title={
                            linha.renovacao.numero
                              ? `Renovação vinculada: ${linha.renovacao.numero}, início ${formatDateBR(linha.renovacao.dataInicio)}.`
                              : `Renovação vinculada com início em ${formatDateBR(linha.renovacao.dataInicio)}.`
                          }
                        >
                          Renovado
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="rounded-lg bg-brand-blue-soft px-2.5 py-1 text-[10px] font-bold text-brand-blue"
                      onClick={() => onAbrir(linha.clienteId)}
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}
