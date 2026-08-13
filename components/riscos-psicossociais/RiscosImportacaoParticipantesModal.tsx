"use client";

import { Modal } from "@/components/ui/Modal";
import {
  situacaoImportacaoLabel,
  type LinhaAvaliacaoImportacao,
} from "@/lib/riscos-participantes-excel";

type Fase = "preview" | "resultado";

interface RiscosImportacaoParticipantesModalProps {
  open: boolean;
  fase: Fase;
  arquivoNome: string;
  linhasEncontradas: number;
  validos: number;
  comErro: number;
  avaliadas: LinhaAvaliacaoImportacao[];
  importados?: number;
  naoImportados?: number;
  saving?: boolean;
  onClose: () => void;
  onConfirmar: () => void;
}

export function RiscosImportacaoParticipantesModal({
  open,
  fase,
  arquivoNome,
  linhasEncontradas,
  validos,
  comErro,
  avaliadas,
  importados = 0,
  naoImportados = 0,
  saving = false,
  onClose,
  onConfirmar,
}: RiscosImportacaoParticipantesModalProps) {
  const titulo =
    fase === "preview"
      ? "Importação de participantes"
      : "Importação concluída";

  const erros = avaliadas.filter((a) => !a.pronto);

  return (
    <Modal
      open={open}
      onClose={() => {
        if (saving) return;
        onClose();
      }}
      title={titulo}
      subtitle={
        fase === "preview"
          ? "Conferir o arquivo antes de gravar. Somente linhas válidas serão importadas."
          : "Resumo da importação na campanha."
      }
      size="extraWide"
      closeOnOverlayClick={!saving}
      footer={
        fase === "preview" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-app-muted">
              {comErro > 0
                ? `${validos} válido(s) serão importados. ${comErro} linha(s) com erro serão ignoradas.`
                : `${validos} linha(s) pronta(s) para importar.`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-sm font-bold text-navy disabled:opacity-40"
                disabled={saving}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                disabled={saving || validos === 0}
                onClick={onConfirmar}
              >
                {saving ? "Importando…" : "Importar participantes"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-white"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        )
      }
    >
      {fase === "preview" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-3 text-sm text-navy">
            <p>
              <span className="font-semibold text-[#64748b]">Arquivo:</span>{" "}
              {arquivoNome || "—"}
            </p>
            <p className="mt-1">
              Linhas encontradas:{" "}
              <span className="font-extrabold tabular-nums">
                {linhasEncontradas}
              </span>
            </p>
            <p className="mt-1">
              Válidos:{" "}
              <span className="font-extrabold tabular-nums text-brand-green">
                {validos}
              </span>
              {" · "}
              Com erro:{" "}
              <span className="font-extrabold tabular-nums text-brand-red">
                {comErro}
              </span>
            </p>
          </div>

          <div className="max-h-[420px] overflow-auto rounded-xl border border-[#e8edf5]">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="sticky top-0 bg-[#f8fafc]">
                <tr className="border-b border-[#eef2f7] text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">CPF</th>
                  <th className="px-3 py-2">Data de nascimento</th>
                  <th className="px-3 py-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {avaliadas.map((a) => (
                  <tr
                    key={`${a.linha}-${a.cpfDigits || a.cpf}`}
                    className="border-b border-[#f1f5f9] last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-navy">
                      {a.nomeCompleto || "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{a.cpf || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {a.dataNascimento || "—"}
                    </td>
                    <td
                      className={`px-3 py-2 font-semibold ${
                        a.pronto ? "text-brand-green" : "text-brand-red"
                      }`}
                    >
                      {a.motivo || situacaoImportacaoLabel(a.situacao)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-3 text-sm text-navy">
            <p className="font-bold">Importação concluída.</p>
            <p className="mt-2">
              Importados:{" "}
              <span className="font-extrabold tabular-nums text-brand-green">
                {importados}
              </span>
            </p>
            <p>
              Não importados:{" "}
              <span className="font-extrabold tabular-nums text-brand-red">
                {naoImportados}
              </span>
            </p>
          </div>

          {erros.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#64748b]">
                Motivos dos não importados
              </p>
              <ul className="max-h-[280px] space-y-1 overflow-auto rounded-xl border border-[#e8edf5] bg-white p-3 text-xs text-navy">
                {erros.map((e) => (
                  <li key={`err-${e.linha}-${e.cpf}`}>
                    Linha {e.linha}
                    {e.cpf ? ` · CPF ${e.cpf}` : ""}: {e.motivo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
