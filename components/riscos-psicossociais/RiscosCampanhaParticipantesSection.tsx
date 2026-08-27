"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/format";
import {
  RISCOS_PARTICIPANTE_STATUS_LABELS,
  buildParticipantesResumo,
  maskCpfParticipante,
  type RiscosCampanhaParticipanteRecord,
  type RiscosParticipanteInput,
  type RiscosParticipanteStatus,
} from "@/lib/riscos-campanha-participantes";
import { acoesMenuParticipantePorStatus } from "@/lib/riscos-participante-acoes";
import { precisaConfirmacaoForteRemocao } from "@/lib/riscos-remocao-participante";
import {
  campanhaPermiteImportacaoParticipantes,
  downloadModeloImportacaoParticipantesExcel,
  type LinhaAvaliacaoImportacao,
  type LinhaImportacaoParticipante,
} from "@/lib/riscos-participantes-excel";
import type { RiscosCampanhaRecord } from "@/lib/riscos-campanha";
import { RiscosParticipanteFormModal } from "@/components/riscos-psicossociais/RiscosParticipanteFormModal";
import { RiscosImportacaoParticipantesModal } from "@/components/riscos-psicossociais/RiscosImportacaoParticipantesModal";

interface RiscosCampanhaParticipantesSectionProps {
  campanha: RiscosCampanhaRecord;
  participantes: RiscosCampanhaParticipanteRecord[];
  saving?: boolean;
  /** Somente admin vê/usa Editar e Remover participante. */
  podeGerenciarParticipante?: boolean;
  somenteConsulta?: boolean;
  avisoCadastro?: string | null;
  onCriar: (input: RiscosParticipanteInput) => Promise<void>;
  onEditar: (
    participanteId: string,
    input: RiscosParticipanteInput
  ) => Promise<void>;
  onRemover: (participanteId: string) => Promise<void>;
  onPrepararImportacaoExcel?: (
    file: File
  ) => Promise<{
    arquivoNome: string;
    linhasEncontradas: number;
    validos: number;
    comErro: number;
    avaliadas: LinhaAvaliacaoImportacao[];
    linhasProntas: LinhaImportacaoParticipante[];
  }>;
  onConfirmarImportacaoExcel?: (
    linhas: LinhaImportacaoParticipante[]
  ) => Promise<{
    importados: number;
    ignorados: number;
    erros: Array<{ linha?: number; cpf: string; motivo: string }>;
  }>;
}

export function RiscosCampanhaParticipantesSection({
  campanha,
  participantes,
  saving = false,
  podeGerenciarParticipante = false,
  somenteConsulta = false,
  avisoCadastro = null,
  onCriar,
  onEditar,
  onRemover,
  onPrepararImportacaoExcel,
  onConfirmarImportacaoExcel,
}: RiscosCampanhaParticipantesSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] =
    useState<RiscosCampanhaParticipanteRecord | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importFase, setImportFase] = useState<"preview" | "resultado">(
    "preview"
  );
  const [importSaving, setImportSaving] = useState(false);
  const [arquivoNome, setArquivoNome] = useState("");
  const [linhasEncontradas, setLinhasEncontradas] = useState(0);
  const [validos, setValidos] = useState(0);
  const [comErro, setComErro] = useState(0);
  const [avaliadas, setAvaliadas] = useState<LinhaAvaliacaoImportacao[]>([]);
  const [linhasProntas, setLinhasProntas] = useState<
    LinhaImportacaoParticipante[]
  >([]);
  const [importados, setImportados] = useState(0);
  const [naoImportados, setNaoImportados] = useState(0);

  const bloqueioImportacao = somenteConsulta
    ? "Processo cancelado. O histórico permanece disponível somente para consulta."
    : campanhaPermiteImportacaoParticipantes(campanha.status);
  const podeImportar =
    Boolean(onPrepararImportacaoExcel && onConfirmarImportacaoExcel) &&
    !bloqueioImportacao;

  const resumo = useMemo(
    () => buildParticipantesResumo(participantes),
    [participantes]
  );

  async function handleSalvar(input: RiscosParticipanteInput) {
    if (editando) {
      await onEditar(editando.id, input);
      setEditando(null);
      setFormOpen(false);
      return;
    }
    await onCriar(input);
    setFormOpen(false);
  }

  function handleAbrirEditar(p: RiscosCampanhaParticipanteRecord) {
    if (!podeGerenciarParticipante) return;
    const acoes = acoesMenuParticipantePorStatus(p.status);
    if (!acoes.exibirEditar) {
      toast.error(
        "Só é possível editar participantes com status Pendente."
      );
      return;
    }
    setMenuOpenId(null);
    setEditando(p);
    setFormOpen(true);
  }

  async function handleRemover(p: RiscosCampanhaParticipanteRecord) {
    if (!podeGerenciarParticipante) return;
    setMenuOpenId(null);
    const forte = precisaConfirmacaoForteRemocao(p.status);
    const ok = window.confirm(
      forte
        ? `Este participante já concluiu a pesquisa.\n\nAo remover este participante, sua participação deixará de compor os resultados desta campanha e ele não poderá mais acessar esta pesquisa.\n\nDeseja continuar?`
        : `Remover o participante ${p.nome_completo}?\n\nEle deixará de estar autorizado nesta campanha.`
    );
    if (!ok) return;
    await onRemover(p.id);
  }

  async function handleArquivoSelecionado(file: File) {
    if (!onPrepararImportacaoExcel) return;
    if (bloqueioImportacao) {
      toast.error(bloqueioImportacao);
      return;
    }
    try {
      const preview = await onPrepararImportacaoExcel(file);
      setArquivoNome(preview.arquivoNome);
      setLinhasEncontradas(preview.linhasEncontradas);
      setValidos(preview.validos);
      setComErro(preview.comErro);
      setAvaliadas(preview.avaliadas);
      setLinhasProntas(preview.linhasProntas);
      setImportados(0);
      setNaoImportados(0);
      setImportFase("preview");
      setImportOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao ler a planilha."
      );
    }
  }

  async function handleConfirmarImportacao() {
    if (!onConfirmarImportacaoExcel) return;
    if (linhasProntas.length === 0) {
      toast.error("Nenhuma linha válida para importar.");
      return;
    }
    setImportSaving(true);
    try {
      const result = await onConfirmarImportacaoExcel(linhasProntas);
      setImportados(result.importados);
      setNaoImportados(result.ignorados);
      if (result.erros.length > 0) {
        setAvaliadas((prev) => {
          const byLinha = new Map(
            result.erros.map((e) => [e.linha, e.motivo] as const)
          );
          return prev.map((a) => {
            if (a.pronto) return a;
            const motivoServer = byLinha.get(a.linha);
            return motivoServer ? { ...a, motivo: motivoServer } : a;
          });
        });
      }
      setImportFase("resultado");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao importar participantes."
      );
    } finally {
      setImportSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void handleArquivoSelecionado(file);
          }}
        />
        <button
          type="button"
          className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
          disabled={saving || importSaving || !podeImportar}
          onClick={() => fileInputRef.current?.click()}
          title={
            bloqueioImportacao
              ? bloqueioImportacao
              : podeImportar
                ? "Importar planilha (NOME COMPLETO | CPF | DATA DE NASCIMENTO)"
                : "Importação indisponível"
          }
        >
          Importar Excel
        </button>
        <button
          type="button"
          className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
          onClick={() => {
            try {
              downloadModeloImportacaoParticipantesExcel();
            } catch {
              toast.error("Não foi possível baixar o modelo.");
            }
          }}
          title="Baixar modelo_importacao_participantes_riscos.xlsx"
        >
          Baixar modelo
        </button>
        <button
          type="button"
          className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          disabled={saving || Boolean(bloqueioImportacao)}
          title={bloqueioImportacao ?? undefined}
          onClick={() => {
            if (bloqueioImportacao) {
              toast.error(bloqueioImportacao);
              return;
            }
            setEditando(null);
            setFormOpen(true);
          }}
        >
          + Cadastrar participante
        </button>
      </div>

      {avisoCadastro ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-900">
          {avisoCadastro}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <ResumoCard label="Cadastrados" value={resumo.cadastrados} />
        <ResumoCard label="Responderam" value={resumo.respondidos} />
      </div>

      {participantes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-6 text-center text-sm text-app-muted">
          Nenhum participante cadastrado. Use “+ Cadastrar participante” ou
          “Importar Excel” para incluir.
        </p>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-[#e8edf5] bg-white">
          <table className="w-full min-w-[720px] table-fixed text-left text-xs">
            <thead>
              <tr className="border-b border-[#eef2f7] bg-[#f8fafc] text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                <th className="w-[28%] px-3 py-2.5">Nome</th>
                <th className="w-[16%] px-3 py-2.5">CPF</th>
                <th className="w-[14%] px-3 py-2.5">Data de nasc.</th>
                <th className="w-[14%] px-3 py-2.5">Status</th>
                <th className="w-[14%] px-3 py-2.5">Cadastro</th>
                <th className="w-[72px] px-3 py-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {participantes.map((p) => {
                const acoes = acoesMenuParticipantePorStatus(p.status);
                const mostraMenu =
                  podeGerenciarParticipante &&
                  (acoes.exibirEditar || acoes.exibirRemover);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[#f1f5f9] last:border-0"
                  >
                    <td className="px-3 py-2.5 font-medium text-navy">
                      <span className="line-clamp-2 break-words">
                        {p.nome_completo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                      {maskCpfParticipante(p.cpf)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-[#64748b]">
                      {p.data_nascimento
                        ? formatDateBR(p.data_nascimento.slice(0, 10))
                        : "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-[#64748b]">
                      {p.created_at
                        ? formatDateBR(p.created_at.slice(0, 10))
                        : "-"}
                    </td>
                    <td className="relative px-3 py-2.5 text-center">
                      {mostraMenu ? (
                        <ParticipanteActionsMenu
                          open={menuOpenId === p.id}
                          disabled={saving}
                          exibirEditar={acoes.exibirEditar}
                          exibirRemover={acoes.exibirRemover}
                          onToggle={() =>
                            setMenuOpenId((id) => (id === p.id ? null : p.id))
                          }
                          onClose={() => setMenuOpenId(null)}
                          onEditar={() => handleAbrirEditar(p)}
                          onRemover={() => void handleRemover(p)}
                        />
                      ) : (
                        <span className="text-[11px] text-[#94a3b8]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <RiscosParticipanteFormModal
        open={formOpen}
        mode={editando ? "edit" : "create"}
        saving={saving}
        initial={
          editando
            ? {
                nomeCompleto: editando.nome_completo,
                cpf: editando.cpf,
                dataNascimento: editando.data_nascimento ?? "",
              }
            : null
        }
        onClose={() => {
          if (saving) return;
          setFormOpen(false);
          setEditando(null);
        }}
        onSave={handleSalvar}
      />

      <RiscosImportacaoParticipantesModal
        open={importOpen}
        fase={importFase}
        arquivoNome={arquivoNome}
        linhasEncontradas={linhasEncontradas}
        validos={validos}
        comErro={comErro}
        avaliadas={avaliadas}
        importados={importados}
        naoImportados={naoImportados}
        saving={importSaving}
        onClose={() => {
          if (importSaving) return;
          setImportOpen(false);
        }}
        onConfirmar={() => void handleConfirmarImportacao()}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: RiscosParticipanteStatus }) {
  const className =
    status === "respondido"
      ? "bg-brand-green-soft text-brand-green"
      : status === "iniciado"
        ? "bg-brand-blue-soft text-brand-blue"
        : "bg-[#fef3c7] text-[#b45309]";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${className}`}
    >
      {RISCOS_PARTICIPANTE_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ResumoCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold tabular-nums text-navy">
        {value}
      </p>
    </div>
  );
}

function ParticipanteActionsMenu({
  open,
  disabled,
  exibirEditar,
  exibirRemover,
  onToggle,
  onClose,
  onEditar,
  onRemover,
}: {
  open: boolean;
  disabled?: boolean;
  exibirEditar: boolean;
  exibirRemover: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEditar: () => void;
  onRemover: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
    // Captura: o dialog do Modal faz stopPropagation no mousedown/click.
    document.addEventListener("mousedown", onDoc, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative inline-flex justify-center">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold text-[#64748b] hover:bg-[#f1f5f9] hover:text-navy disabled:opacity-40"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Ações do participante"
        onClick={onToggle}
      >
        ⋮
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[#e8edf5] bg-white py-1 text-left shadow-lg"
        >
          {exibirEditar ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-navy transition hover:bg-[#f8fafc]"
              onClick={() => {
                onClose();
                onEditar();
              }}
            >
              Editar
            </button>
          ) : null}
          {exibirRemover ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-brand-red transition hover:bg-[#fef2f2]"
              onClick={() => {
                onClose();
                onRemover();
              }}
            >
              Remover participante
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
