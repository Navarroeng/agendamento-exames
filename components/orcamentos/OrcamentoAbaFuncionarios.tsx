"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { OrcamentoAnexoRemoverModal } from "@/components/orcamentos/OrcamentoAnexoRemoverModal";
import {
  OrcamentoArquivoPreview,
} from "@/components/orcamentos/OrcamentoEtapasExtras";
import {
  IconRefresh,
  IconTrash,
} from "@/components/ui/icons/OutlineIcons";
import { maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";
import {
  CONTRATO_VAGA_STATUS_LABELS,
  buildVagaDraftsIniciais,
  emptyVagaDraft,
  isNomeFuncionarioReal,
  resolveStatusVagaRascunho,
  validarDraftsListaVagas,
  vagaStatusBloqueiaEdicao,
  type ContratoVagaDraft,
  type ContratoVagaRecord,
  type ContratoVagaStatus,
} from "@/lib/contrato-vagas";
import {
  CONTRATO_VAGAS_IMPORT_MODELO_FILENAME,
  aplicarImportacaoNasVagas,
  gerarModeloListaFuncionariosXlsx,
  lerArquivoListaFuncionarios,
} from "@/lib/contrato-vagas-import";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import { buscarContratoPorOrcamentoId } from "@/services/contrato-agendamentos.service";
import {
  garantirVagasDoContrato,
  listarVagasDoContrato,
  salvarListaVagasContrato,
} from "@/services/contrato-vagas.service";
import { listarCargosAtivos } from "@/services/cargo.service";
import { buscarAprovacaoPorOrcamentoId } from "@/services/orcamento-aprovacao.service";
import type { CargoRecord, ClienteContratoRecord } from "@/lib/types";

interface OrcamentoAbaFuncionariosProps {
  orcamentoId: string;
  aprovacao: OrcamentoAprovacaoRecord;
  usuarioNome: string;
  clienteNome?: string | null;
  clienteCnpj?: string | null;
  clienteId?: string | null;
  file: File | null;
  savedName: string | null;
  savedUrl: string | null;
  savedTipo: string | null;
  saving: boolean;
  onFileChange: (file: File | null) => void;
  onEtapaSalva: (aprovacao: OrcamentoAprovacaoRecord) => void;
  onSubstituir: (file: File) => Promise<void>;
  onRemover: () => Promise<void>;
}

function StatusBadge({ status }: { status: ContratoVagaStatus }) {
  const map: Record<ContratoVagaStatus, string> = {
    aberta: "bg-[#fffbeb] text-[#b45309]",
    comprometida: "bg-[#ffedd5] text-[#c2410c]",
    aso_aberto: "bg-[#e0f2fe] text-[#0369a1]",
    agendada: "bg-brand-green-soft text-brand-green",
    programada: "bg-[#eef2ff] text-[#4338ca]",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${map[status]}`}
    >
      {CONTRATO_VAGA_STATUS_LABELS[status]}
    </span>
  );
}

function focusCell(row: number, col: number) {
  const el = document.querySelector<HTMLElement>(
    `[data-vaga-cell="${row}-${col}"]`
  );
  el?.focus();
}

export function OrcamentoAbaFuncionarios({
  orcamentoId,
  aprovacao,
  usuarioNome,
  clienteCnpj,
  clienteId,
  file,
  savedName,
  savedUrl,
  savedTipo,
  saving,
  onFileChange,
  onEtapaSalva,
  onSubstituir,
  onRemover,
}: OrcamentoAbaFuncionariosProps) {
  const quantidadePrevista = Math.max(
    0,
    Number(aprovacao.quantidade_colaboradores) || 0
  );
  const importInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [savingLista, setSavingLista] = useState(false);
  const [contrato, setContrato] = useState<ClienteContratoRecord | null>(null);
  const [vagas, setVagas] = useState<ContratoVagaRecord[]>([]);
  const [drafts, setDrafts] = useState<ContratoVagaDraft[]>([]);
  const [cargos, setCargos] = useState<CargoRecord[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSavedAnexo = Boolean(savedName);
  const hasPreview = Boolean(file || savedName);
  const busy = saving || savingLista || actionSaving;

  const vagaByIndice = useMemo(
    () => new Map(vagas.map((v) => [v.indice, v])),
    [vagas]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contratoRow, cargosAtivos] = await Promise.all([
        buscarContratoPorOrcamentoId(orcamentoId),
        listarCargosAtivos().catch(() => [] as CargoRecord[]),
      ]);
      setContrato(contratoRow);
      setCargos(cargosAtivos);
      const qtd =
        Number(aprovacao.quantidade_colaboradores) ||
        Number(contratoRow?.quantidade_colaboradores) ||
        0;
      if (!contratoRow) {
        setVagas([]);
        setDrafts(
          Array.from({ length: qtd }, (_, i) => emptyVagaDraft(i + 1))
        );
        return;
      }
      let existentes = await listarVagasDoContrato(contratoRow.id);
      if (existentes.length === 0 && qtd > 0) {
        existentes = await garantirVagasDoContrato({
          contratoId: contratoRow.id,
          orcamentoId,
          quantidadePrevista: qtd,
        });
      }
      setVagas(existentes);
      setDrafts(buildVagaDraftsIniciais(qtd, existentes));
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar a lista de funcionários."
      );
    } finally {
      setLoading(false);
    }
  }, [aprovacao.quantidade_colaboradores, orcamentoId]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchDraft(indice: number, patch: Partial<ContratoVagaDraft>) {
    setDrafts((prev) =>
      prev.map((row) => (row.indice === indice ? { ...row, ...patch } : row))
    );
  }

  async function handleSalvar() {
    if (!contrato) {
      toast.error("Contrato ainda não vinculado a este orçamento.");
      return;
    }
    const qtd =
      Number(aprovacao.quantidade_colaboradores) ||
      Number(contrato.quantidade_colaboradores) ||
      0;
    const visiveis = drafts.slice(0, qtd);
    const erro = validarDraftsListaVagas(visiveis, qtd);
    if (erro) {
      toast.error(erro);
      return;
    }
    setSavingLista(true);
    try {
      const saved = await salvarListaVagasContrato({
        contratoId: contrato.id,
        orcamentoId,
        aprovacaoId: aprovacao.id,
        clienteId: clienteId ?? contrato.cliente_id ?? null,
        clienteCnpj: clienteCnpj ?? null,
        quantidadePrevista: qtd,
        validoAte: contrato.data_fim ?? null,
        usuarioNome,
        numeroContrato: contrato.numero ?? null,
        rows: visiveis,
      });
      setVagas(saved);
      setDrafts(buildVagaDraftsIniciais(qtd, saved));
      const atualizada = await buscarAprovacaoPorOrcamentoId(orcamentoId);
      if (atualizada) onEtapaSalva(atualizada);
      toast.success("Lista de funcionários salva. Logo da empresa liberada.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar a lista."
      );
    } finally {
      setSavingLista(false);
    }
  }

  async function handleImportar(selected: File | null) {
    if (!selected) return;
    const parsed = await lerArquivoListaFuncionarios(selected);
    if (!parsed.ok) {
      toast.error(parsed.error || "Não foi possível importar a lista.");
      return;
    }
    if (parsed.duplicados.length > 0) {
      toast.error(
        `A planilha possui CPF duplicado: ${parsed.duplicados.join(", ")}.`
      );
      return;
    }

    const qtd = quantidadePrevista;
    const temPreenchido = drafts.slice(0, qtd).some(
      (row) =>
        isNomeFuncionarioReal(row.colaborador) ||
        normalizeCpfDigits(row.colaboradorCpf).length === 11 ||
        row.manterAsoAberto
    );
    let sobrescrever = false;
    if (temPreenchido) {
      const ok = window.confirm(
        "Já existem vagas preenchidas. Deseja substituir os dados atuais pelos da planilha? As vagas já agendadas ou programadas não serão alteradas."
      );
      if (!ok) {
        const onlyEmpty = window.confirm(
          "Importar apenas para as vagas ainda em aberto, sem sobrescrever o que já foi preenchido?"
        );
        if (!onlyEmpty) return;
        sobrescrever = false;
      } else {
        sobrescrever = true;
      }
    }

    if (parsed.rows.length > qtd) {
      const extras = parsed.rows
        .slice(qtd)
        .map((r) => r.nome || `linha ${r.linha}`)
        .join(", ");
      toast.error(
        `A lista possui mais funcionários do que a quantidade prevista no contrato (${qtd}). Os registros excedentes não foram transformados em vagas adicionais: ${extras}.`
      );
    }

    const locked = new Set(
      vagas
        .filter((v) => vagaStatusBloqueiaEdicao(v.status))
        .map((v) => v.indice)
    );
    const atuaisEditaveis = drafts.map((row) =>
      locked.has(row.indice) ? row : row
    );
    const result = aplicarImportacaoNasVagas({
      atuais: atuaisEditaveis.map((row) =>
        locked.has(row.indice)
          ? row
          : sobrescrever
            ? { ...row, colaborador: "", colaboradorCpf: "", cargoNome: "", cargoId: null, manterAsoAberto: false }
            : row
      ),
      importados: parsed.rows,
      quantidadePrevista: qtd,
      sobrescreverPreenchidas: sobrescrever,
      cargos,
    });
    setDrafts(
      result.drafts.map((row) => (locked.has(row.indice) ? drafts.find((d) => d.indice === row.indice) ?? row : row))
    );
    toast.success(
      result.aplicados === 1
        ? "1 funcionário importado para a tabela."
        : `${result.aplicados} funcionários importados para a tabela.`
    );
  }

  function handleBaixarModelo() {
    const buffer = gerarModeloListaFuncionariosXlsx();
    const blob = new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = CONTRATO_VAGAS_IMPORT_MODELO_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleReplaceSelected(selected: File | null) {
    if (!selected) return;
    setActionSaving(true);
    try {
      await onSubstituir(selected);
      onFileChange(null);
    } finally {
      setActionSaving(false);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  }

  async function handleConfirmRemover() {
    setActionSaving(true);
    try {
      await onRemover();
      onFileChange(null);
      setConfirmOpen(false);
    } finally {
      setActionSaving(false);
    }
  }

  const visiveis = drafts.slice(0, quantidadePrevista);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#e4ebf4] bg-white px-4 py-3 text-[12px] text-[#475569]">
        As vagas abaixo correspondem à quantidade prevista no contrato
        {quantidadePrevista > 0 ? (
          <>
            {" "}
            (<strong className="text-navy">{quantidadePrevista}</strong>{" "}
            colaborador{quantidadePrevista === 1 ? "" : "es"}).
          </>
        ) : (
          "."
        )}{" "}
        Preencha nome, CPF e cargo diretamente na tabela. O CPF identifica o
        funcionário no agendamento.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-muted text-xs"
          disabled={busy || loading}
          onClick={() => importInputRef.current?.click()}
        >
          Importar lista
        </button>
        <button
          type="button"
          className="btn btn-muted text-xs"
          disabled={busy}
          onClick={handleBaixarModelo}
        >
          Baixar modelo
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            e.target.value = "";
            void handleImportar(selected);
          }}
        />
      </div>

      {loading ? (
        <p className="px-1 py-6 text-center text-sm text-app-muted">
          Carregando vagas do contrato...
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-brand-red">{error}</p>
      ) : null}

      {!loading && quantidadePrevista <= 0 ? (
        <p className="text-sm text-app-muted">
          Quantidade de colaboradores não informada nas condições aprovadas.
        </p>
      ) : null}

      {!loading && visiveis.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#e4ebf4] bg-white">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#f8fafc]">
              <tr>
                <th className="w-10 border-b px-2 py-2 font-bold text-navy">#</th>
                <th className="border-b px-2 py-2 font-bold text-navy">
                  Nome do funcionário
                </th>
                <th className="w-40 border-b px-2 py-2 font-bold text-navy">
                  CPF
                </th>
                <th className="w-48 border-b px-2 py-2 font-bold text-navy">
                  Cargo
                </th>
                <th className="w-44 border-b px-2 py-2 font-bold text-navy">
                  Situação / Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((row, rowIdx) => {
                const persistida = vagaByIndice.get(row.indice);
                const locked = persistida
                  ? vagaStatusBloqueiaEdicao(persistida.status)
                  : false;
                const statusPreview = persistida
                  ? persistida.status
                  : resolveStatusVagaRascunho({
                      colaborador: row.colaborador,
                      colaboradorCpf: row.colaboradorCpf,
                      manterAsoAberto: row.manterAsoAberto,
                    });
                const vazia =
                  !isNomeFuncionarioReal(row.colaborador) &&
                  normalizeCpfDigits(row.colaboradorCpf).length === 0;
                return (
                  <tr key={row.indice} className="odd:bg-white even:bg-[#fbfdff]">
                    <td className="border-b border-[#eef2f7] px-2 py-1.5 font-bold tabular-nums text-navy">
                      {row.indice}
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-1">
                      <input
                        data-vaga-cell={`${rowIdx}-0`}
                        className="field-input h-8 px-2 text-xs"
                        value={row.colaborador}
                        disabled={busy || locked}
                        placeholder={locked ? undefined : "Nome"}
                        title={
                          locked
                            ? "Não é possível editar após o agendamento vinculado. Altere pelo agendamento, se necessário."
                            : undefined
                        }
                        onChange={(e) =>
                          patchDraft(row.indice, {
                            colaborador: e.target.value,
                            manterAsoAberto: false,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusCell(rowIdx + 1, 0);
                          }
                        }}
                      />
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-1">
                      <input
                        data-vaga-cell={`${rowIdx}-1`}
                        className="field-input h-8 px-2 text-xs"
                        value={maskCPFInput(row.colaboradorCpf)}
                        disabled={busy || locked}
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        title={
                          locked
                            ? "CPF bloqueado: vaga já agendada ou programada."
                            : undefined
                        }
                        onChange={(e) =>
                          patchDraft(row.indice, {
                            colaboradorCpf: maskCPFInput(e.target.value),
                            manterAsoAberto: false,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusCell(rowIdx + 1, 1);
                          }
                        }}
                      />
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-1">
                      <input
                        data-vaga-cell={`${rowIdx}-2`}
                        className="field-input h-8 px-2 text-xs"
                        list="contrato-vagas-cargos"
                        value={row.cargoNome}
                        disabled={busy || locked}
                        placeholder="Cargo"
                        onChange={(e) => {
                          const nome = e.target.value;
                          const found = cargos.find(
                            (c) =>
                              c.nome.toLocaleLowerCase("pt-BR") ===
                              nome.trim().toLocaleLowerCase("pt-BR")
                          );
                          patchDraft(row.indice, {
                            cargoNome: nome,
                            cargoId: found?.id ?? null,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusCell(rowIdx + 1, 2);
                          }
                        }}
                      />
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={statusPreview} />
                        {!locked && vazia ? (
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-brand-blue hover:underline disabled:opacity-50"
                            disabled={busy}
                            onClick={() =>
                              patchDraft(row.indice, {
                                manterAsoAberto: !row.manterAsoAberto,
                                colaborador: "",
                                colaboradorCpf: "",
                                cargoNome: "",
                                cargoId: null,
                              })
                            }
                          >
                            {row.manterAsoAberto
                              ? "Desfazer ASO em aberto"
                              : "Manter ASO em aberto"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <datalist id="contrato-vagas-cargos">
            {cargos.map((c) => (
              <option key={c.id} value={c.nome} />
            ))}
          </datalist>
        </div>
      ) : null}

      {hasPreview ? (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Anexo histórico
          </p>
          <OrcamentoArquivoPreview
            file={file}
            savedUrl={savedUrl}
            savedName={savedName}
            savedTipo={savedTipo}
          />
          {hasSavedAnexo ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe3ef] bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-[#f8fafc] disabled:opacity-60"
                disabled={busy}
                onClick={() => replaceInputRef.current?.click()}
              >
                <IconRefresh size={14} />
                Substituir anexo
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#fecaca] bg-white px-3 py-1.5 text-xs font-semibold text-brand-red hover:bg-[#fef2f2] disabled:opacity-60"
                disabled={busy}
                onClick={() => setConfirmOpen(true)}
              >
                <IconTrash size={14} />
                Remover anexo
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <input
        ref={replaceInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          void handleReplaceSelected(e.target.files?.[0] ?? null);
        }}
      />

      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || loading || !contrato || quantidadePrevista <= 0}
          onClick={() => void handleSalvar()}
        >
          {savingLista ? "Salvando..." : "Salvar lista"}
        </button>
      </div>

      <OrcamentoAnexoRemoverModal
        open={confirmOpen}
        titulo="Remover lista"
        mensagem="Tem certeza de que deseja remover a lista de funcionários anexada? As vagas preenchidas na tabela serão mantidas."
        saving={actionSaving}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirmRemover()}
      />
    </div>
  );
}
