"use client";

import { useEffect, useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import {
  RISCOS_CAMPANHA_STATUS_LABELS,
  formatPeriodoCampanha,
  pathAvaliacaoCampanha,
  type RiscosCampanhaRecord,
} from "@/lib/riscos-campanha";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

interface RiscosCampanhaTabProps {
  processo: RiscosPsicossociaisProcesso;
  saving?: boolean;
  onCriarCampanha: (input: {
    dataInicioIso: string;
    dataEncerramentoIso: string;
    quantidadePrevista: number;
  }) => Promise<void>;
}

export function RiscosCampanhaTab({
  processo,
  saving = false,
  onCriarCampanha,
}: RiscosCampanhaTabProps) {
  const campanha = processo.campanha;
  const { orcamento } = processo.implantacao;
  const [showForm, setShowForm] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataEncerramento, setDataEncerramento] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campanha) {
      setShowForm(false);
      setError(null);
    }
  }, [campanha]);

  async function handleSalvar() {
    setError(null);
    const qtd = Number(quantidade);
    if (!dataInicio.trim()) {
      setError("Informe a data de início.");
      return;
    }
    if (!dataEncerramento.trim()) {
      setError("Informe a data de encerramento.");
      return;
    }
    if (!Number.isFinite(qtd) || qtd < 1 || !Number.isInteger(qtd)) {
      setError("Informe a quantidade prevista (inteiro ≥ 1).");
      return;
    }
    await onCriarCampanha({
      dataInicioIso: dataInicio,
      dataEncerramentoIso: dataEncerramento,
      quantidadePrevista: qtd,
    });
  }

  if (campanha) {
    return <CampanhaCard campanha={campanha} />;
  }

  if (!showForm) {
    return (
      <div className="rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-5 py-10 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
          Campanha de Avaliação
        </p>
        <p className="mt-2 text-sm font-extrabold text-navy">
          Nenhuma campanha criada
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-app-muted">
          Crie a campanha de avaliação psicossocial para{" "}
          <span className="font-semibold text-navy">
            {formatClienteNomeDisplay(orcamento.cliente_nome)}
          </span>
          .
        </p>
        <button
          type="button"
          className="btn mt-5 justify-center sm:w-auto"
          disabled={saving}
          onClick={() => setShowForm(true)}
        >
          Criar campanha
        </button>
      </div>
    );
  }

  const cnpj = orcamento.cliente_cnpj;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
          Campanha de Avaliação
        </p>
        <p className="mt-1 text-sm font-extrabold text-navy">Nova campanha</p>
      </div>

      <dl className="grid gap-3 rounded-xl border border-[#e8edf5] bg-[#f8fafc] p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Empresa
          </dt>
          <dd className="mt-0.5 font-semibold text-navy">
            {formatClienteNomeDisplay(orcamento.cliente_nome)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            CNPJ
          </dt>
          <dd className="mt-0.5 tabular-nums text-navy">
            {cnpj
              ? cnpj.replace(/\D/g, "").length === 14
                ? formatCNPJ(cnpj)
                : cnpj
              : "—"}
          </dd>
        </div>
      </dl>

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
            disabled={saving}
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
            disabled={saving}
            onChange={(e) => setDataEncerramento(e.target.value)}
          />
        </Field>
        <Field
          label={
            <>
              Qtd. prevista de colaboradores <RequiredMark />
            </>
          }
        >
          <input
            type="number"
            min={1}
            step={1}
            className="field-input w-full"
            value={quantidade}
            disabled={saving}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </Field>
      </div>

      {error ? (
        <p className="text-xs font-medium text-brand-red">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-xs font-bold text-navy disabled:opacity-40"
          disabled={saving}
          onClick={() => {
            setShowForm(false);
            setError(null);
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
          disabled={saving}
          onClick={() => void handleSalvar()}
        >
          {saving ? "Salvando..." : "Salvar campanha"}
        </button>
      </div>
    </div>
  );
}

function CampanhaCard({ campanha }: { campanha: RiscosCampanhaRecord }) {
  const cnpj = campanha.cnpj;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
          Campanha de Avaliação
        </p>
        <p className="mt-1 text-sm font-extrabold text-navy">Campanha criada</p>
      </div>

      <div className="rounded-2xl border border-[#dbeafe] bg-gradient-to-br from-[#f8fbff] to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Empresa
            </p>
            <p className="mt-0.5 text-base font-extrabold text-navy">
              {formatClienteNomeDisplay(campanha.empresa_nome)}
            </p>
            <p className="mt-1 text-xs tabular-nums text-[#64748b]">
              CNPJ{" "}
              {cnpj.replace(/\D/g, "").length === 14
                ? formatCNPJ(cnpj)
                : cnpj || "—"}
            </p>
          </div>
          <span className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-[11px] font-extrabold text-[#4338ca]">
            {RISCOS_CAMPANHA_STATUS_LABELS[campanha.status]}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Período
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-navy">
              {formatPeriodoCampanha(
                campanha.data_inicio,
                campanha.data_encerramento
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Quantidade prevista
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-navy">
              {campanha.quantidade_prevista} colaboradores
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Código da campanha
            </dt>
            <dd className="mt-0.5 font-mono text-sm font-extrabold tracking-wide text-brand-blue">
              {campanha.codigo_publico}
            </dd>
            <dd className="mt-0.5 text-[11px] text-[#94a3b8]">
              Futuro: {pathAvaliacaoCampanha(campanha.codigo_publico)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
