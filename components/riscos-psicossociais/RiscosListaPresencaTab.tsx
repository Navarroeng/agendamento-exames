"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  isRecebimentoListaConcluido,
  isSolicitacaoListaConcluida,
  isValidEmailListaPresenca,
  type RiscosListaPresencaDados,
} from "@/lib/riscos-lista-presenca";
import type { RiscosPsicossociaisProcesso } from "@/lib/riscos-psicossociais";

interface RiscosListaPresencaTabProps {
  processo: RiscosPsicossociaisProcesso;
  saving: boolean;
  onSalvarSolicitacao: (input: {
    dataSolicitacaoIso: string;
    email: string;
  }) => Promise<void>;
  onSalvarRecebimento: (file: File) => Promise<void>;
  onRemoverAnexo: () => Promise<void>;
  onVisualizarAnexo: () => Promise<void>;
}

function StatusBadge({ concluido }: { concluido: boolean }) {
  return concluido ? (
    <span className="inline-flex rounded-full bg-brand-green-soft px-2.5 py-0.5 text-[10px] font-extrabold text-brand-green">
      Concluído
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[10px] font-extrabold text-[#b45309]">
      Pendente
    </span>
  );
}

function BlockCard({
  title,
  concluido,
  children,
}: {
  title: string;
  concluido: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        concluido
          ? "border-[#bbf7d0]/80 bg-[#f0fdf4]/40"
          : "border-[#e8edf5] bg-white"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-navy">{title}</h3>
        <StatusBadge concluido={concluido} />
      </div>
      {children}
    </div>
  );
}

export function RiscosListaPresencaTab({
  processo,
  saving,
  onSalvarSolicitacao,
  onSalvarRecebimento,
  onRemoverAnexo,
  onVisualizarAnexo,
}: RiscosListaPresencaTabProps) {
  const dados: RiscosListaPresencaDados = processo.listaPresenca;

  const [solicitadaSim, setSolicitadaSim] = useState(dados.lista_solicitada);
  const [dataSolicitacao, setDataSolicitacao] = useState(
    dados.lista_solicitada_em?.slice(0, 10) ?? ""
  );
  const [email, setEmail] = useState(dados.lista_solicitada_email ?? "");

  const [recebidaSim, setRecebidaSim] = useState(dados.lista_recebida);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setSolicitadaSim(dados.lista_solicitada);
    setDataSolicitacao(dados.lista_solicitada_em?.slice(0, 10) ?? "");
    setEmail(dados.lista_solicitada_email ?? "");
    setRecebidaSim(dados.lista_recebida);
    setFile(null);
  }, [dados]);

  const solicitacaoConcluida = useMemo(
    () => isSolicitacaoListaConcluida(dados),
    [dados]
  );
  const recebimentoConcluido = useMemo(
    () => isRecebimentoListaConcluido(dados),
    [dados]
  );

  const handleSalvarSolicitacao = async () => {
    if (!solicitadaSim) {
      toast.error("Selecione Sim para registrar a solicitação.");
      return;
    }
    if (!dataSolicitacao.trim()) {
      toast.error("Informe a data da solicitação.");
      return;
    }
    if (!isValidEmailListaPresenca(email)) {
      toast.error("Informe um e-mail válido do cliente.");
      return;
    }
    await onSalvarSolicitacao({
      dataSolicitacaoIso: dataSolicitacao,
      email,
    });
  };

  const handleSalvarRecebimento = async () => {
    if (!recebidaSim) {
      toast.error("Selecione Sim para registrar o recebimento.");
      return;
    }
    if (!file && !dados.lista_anexo_path) {
      toast.error("Anexe a lista de presença enviada pelo cliente.");
      return;
    }
    if (!file) {
      toast.error("Selecione um arquivo para salvar o recebimento.");
      return;
    }
    await onSalvarRecebimento(file);
  };

  return (
    <div className="space-y-4">
      <BlockCard title="1. Solicitação da lista" concluido={solicitacaoConcluida}>
        {solicitacaoConcluida ? (
          <div className="space-y-1 text-sm text-[#334155]">
            <p className="font-semibold text-navy">
              ✓ Solicitada em{" "}
              {dados.lista_solicitada_em
                ? formatDateIsoToBR(dados.lista_solicitada_em.slice(0, 10))
                : "—"}
            </p>
            <p>
              E-mail:{" "}
              <span className="font-medium">{dados.lista_solicitada_email}</span>
            </p>
            {dados.lista_solicitada_por ? (
              <p className="text-[11px] text-[#64748b]">
                Registrado por {dados.lista_solicitada_por}
                {dados.lista_solicitada_registrado_em
                  ? ` em ${formatDateIsoToBR(
                      dados.lista_solicitada_registrado_em.slice(0, 10)
                    )}`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-navy">
              Lista de presença solicitada ao cliente?
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="lista-solicitada"
                  checked={solicitadaSim === true}
                  disabled={saving}
                  onChange={() => setSolicitadaSim(true)}
                />
                Sim
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="lista-solicitada"
                  checked={solicitadaSim === false}
                  disabled={saving}
                  onChange={() => setSolicitadaSim(false)}
                />
                Não
              </label>
            </div>

            {solicitadaSim ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Data da solicitação
                  </label>
                  <input
                    type="date"
                    className="field-input"
                    value={dataSolicitacao}
                    disabled={saving}
                    onChange={(e) => setDataSolicitacao(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    E-mail do cliente
                  </label>
                  <input
                    type="email"
                    className="field-input"
                    placeholder="cliente@empresa.com.br"
                    value={email}
                    disabled={saving}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={() => {
                      void handleSalvarSolicitacao();
                    }}
                  >
                    {saving ? "Salvando..." : "Salvar solicitação"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-app-muted">
                A etapa permanece pendente até a solicitação ser registrada.
              </p>
            )}
          </div>
        )}
      </BlockCard>

      <BlockCard
        title="2. Recebimento da lista"
        concluido={recebimentoConcluido}
      >
        {!solicitacaoConcluida ? (
          <p className="text-sm text-app-muted">
            Salve a solicitação da lista para liberar o recebimento.
          </p>
        ) : recebimentoConcluido ? (
          <div className="space-y-3 text-sm text-[#334155]">
            <p className="font-semibold text-navy">
              ✓ Lista recebida
              {dados.lista_recebida_em
                ? ` em ${formatDateIsoToBR(
                    dados.lista_recebida_em.slice(0, 10)
                  )}`
                : ""}
            </p>
            <p>
              Arquivo:{" "}
              <span className="font-medium">
                {dados.lista_anexo_nome ?? "—"}
              </span>
            </p>
            {dados.lista_recebida_por ? (
              <p className="text-[11px] text-[#64748b]">
                Registrado por {dados.lista_recebida_por}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn"
                disabled={saving}
                onClick={() => {
                  void onVisualizarAnexo();
                }}
              >
                Visualizar / baixar
              </button>
              <button
                type="button"
                className="btn text-brand-red"
                disabled={saving}
                onClick={() => {
                  void onRemoverAnexo();
                }}
              >
                Remover anexo
              </button>
            </div>
            <div className="border-t border-[#e8edf5] pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Substituir arquivo
              </p>
              <input
                type="file"
                accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
                disabled={saving}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <button
                  type="button"
                  className="btn btn-primary mt-2"
                  disabled={saving}
                  onClick={() => {
                    void handleSalvarRecebimento();
                  }}
                >
                  {saving ? "Salvando..." : "Salvar substituição"}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-navy">
              Lista enviada pelo cliente?
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="lista-recebida"
                  checked={recebidaSim === true}
                  disabled={saving}
                  onChange={() => setRecebidaSim(true)}
                />
                Sim
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="lista-recebida"
                  checked={recebidaSim === false}
                  disabled={saving}
                  onChange={() => {
                    setRecebidaSim(false);
                    setFile(null);
                  }}
                />
                Não
              </label>
            </div>

            {!recebidaSim ? (
              <p className="text-sm text-app-muted">
                Aguardando envio do cliente. Cadastro da Empresa permanece
                bloqueado.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Anexar lista de presença
                  </label>
                  <input
                    type="file"
                    className="block w-full text-sm"
                    accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
                    disabled={saving}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="mt-1 text-[10px] text-[#94a3b8]">
                    PDF, Excel (.xlsx / .xls) ou imagem (.jpg / .jpeg / .png)
                  </p>
                </div>
                {file ? (
                  <p className="text-xs text-[#64748b]">
                    Selecionado: <span className="font-medium">{file.name}</span>
                  </p>
                ) : null}
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || !file}
                  onClick={() => {
                    void handleSalvarRecebimento();
                  }}
                >
                  {saving ? "Salvando..." : "Salvar recebimento"}
                </button>
              </div>
            )}
          </div>
        )}
      </BlockCard>

      {processo.listaPresencaConcluida ? (
        <p className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-xs font-semibold text-brand-green">
          Lista de Presença concluída. Cadastro da Empresa liberado.
        </p>
      ) : (
        <p className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs font-semibold text-[#b45309]">
          Cadastro da Empresa só libera após solicitação, recebimento e anexo
          da lista.
        </p>
      )}
    </div>
  );
}
