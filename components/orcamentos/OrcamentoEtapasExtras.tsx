"use client";

import { useEffect, useRef, useState } from "react";
import { RequiredMark } from "@/components/ui/Field";
import { OrcamentoAnexoRemoverModal } from "@/components/orcamentos/OrcamentoAnexoRemoverModal";
import {
  IconRefresh,
  IconTrash,
} from "@/components/ui/icons/OutlineIcons";

interface OrcamentoAbaProcuracaoProps {
  status: "ativa" | "inativa";
  observacoes: string;
  saving: boolean;
  onChangeStatus: (value: "ativa" | "inativa") => void;
  onChangeObservacoes: (value: string) => void;
  onSalvar: () => void;
}

export function OrcamentoAbaProcuracao({
  status,
  observacoes,
  saving,
  onChangeStatus,
  onChangeObservacoes,
  onSalvar,
}: OrcamentoAbaProcuracaoProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#e4ebf4] bg-white px-4 py-3 text-[12px] text-[#475569]">
        Defina o status da procuração do cliente. Somente com status{" "}
        <strong className="text-navy">Ativa</strong> a próxima etapa é liberada.
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-bold text-navy">
          Status da procuração
        </legend>
        <label className="flex items-center gap-2 text-sm text-[#334155]">
          <input
            type="radio"
            name="procuracao_status"
            checked={status === "inativa"}
            disabled={saving}
            onChange={() => onChangeStatus("inativa")}
          />
          Inativa
        </label>
        <label className="flex items-center gap-2 text-sm text-[#334155]">
          <input
            type="radio"
            name="procuracao_status"
            checked={status === "ativa"}
            disabled={saving}
            onChange={() => onChangeStatus("ativa")}
          />
          Ativa
        </label>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-navy">
          Observações
        </span>
        <textarea
          className="field-input min-h-[96px] resize-y"
          value={observacoes}
          disabled={saving}
          onChange={(e) => onChangeObservacoes(e.target.value)}
        />
      </label>

      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={onSalvar}
        >
          {saving ? "Salvando..." : "Salvar Procuração"}
        </button>
      </div>
    </div>
  );
}

interface PreviewTableProps {
  rows: string[][];
}

function PreviewTable({ rows }: PreviewTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-app-muted">Não foi possível ler a planilha.</p>
    );
  }
  const header = rows[0];
  const body = rows.slice(1, 51);
  return (
    <div className="max-h-[360px] overflow-auto rounded-xl border border-[#e4ebf4]">
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 bg-[#f8fafc]">
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="border-b px-2 py-1.5 font-bold text-navy">
                {cell || `Coluna ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="odd:bg-white even:bg-[#fbfdff]">
              {header.map((_, ci) => (
                <td key={ci} className="border-b border-[#eef2f7] px-2 py-1">
                  {row[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 51 ? (
        <p className="px-2 py-1 text-[11px] text-app-muted">
          Exibindo as primeiras 50 linhas de {rows.length - 1}.
        </p>
      ) : null}
    </div>
  );
}

export function OrcamentoArquivoPreview({
  file,
  savedUrl,
  savedName,
  savedTipo,
}: {
  file: File | null;
  savedUrl?: string | null;
  savedName?: string | null;
  savedTipo?: string | null;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);

  const displayName = file?.name || savedName || "Arquivo";
  const tipo = (file?.type || savedTipo || "").toLowerCase();
  const nameLower = displayName.toLowerCase();
  const isImage =
    tipo.startsWith("image/") ||
    /\.(png|jpe?g|svg)$/i.test(nameLower);
  const isPdf = tipo.includes("pdf") || nameLower.endsWith(".pdf");
  const isCsv = tipo.includes("csv") || nameLower.endsWith(".csv");
  const isExcel =
    tipo.includes("sheet") ||
    tipo.includes("excel") ||
    /\.(xlsx|xls)$/i.test(nameLower);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    let cancelled = false;
    async function loadCsv() {
      if (!file || !isCsv) {
        setCsvRows([]);
        return;
      }
      const text = await file.text();
      if (cancelled) return;
      const rows = text
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .map((line) => line.split(/[;,]/).map((c) => c.trim()));
      setCsvRows(rows);
    }
    void loadCsv();
    return () => {
      cancelled = true;
    };
  }, [file, isCsv]);

  useEffect(() => {
    let cancelled = false;
    async function loadExcel() {
      if (!file || !isExcel) {
        setSheetRows([]);
        return;
      }
      try {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        if (cancelled) return;
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          defval: "",
        }) as string[][];
        setSheetRows(rows.map((r) => r.map((c) => String(c ?? ""))));
      } catch {
        if (!cancelled) setSheetRows([]);
      }
    }
    void loadExcel();
    return () => {
      cancelled = true;
    };
  }, [file, isExcel]);

  const previewSrc = objectUrl || savedUrl || null;

  return (
    <div className="space-y-3 rounded-2xl border border-[#e4ebf4] bg-[#f8fafc] p-4">
      <p className="text-xs font-bold text-navy">{displayName}</p>
      {isImage && previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt={displayName}
          className="mx-auto max-h-[420px] w-auto max-w-full rounded-xl border border-[#e2e8f0] bg-white object-contain"
        />
      ) : null}
      {isPdf && previewSrc ? (
        <iframe
          title={displayName}
          src={previewSrc}
          className="h-[420px] w-full rounded-xl border border-[#e2e8f0] bg-white"
        />
      ) : null}
      {isCsv && csvRows.length > 0 ? <PreviewTable rows={csvRows} /> : null}
      {isExcel && sheetRows.length > 0 ? <PreviewTable rows={sheetRows} /> : null}
      {!isImage && !isPdf && !isCsv && !isExcel ? (
        <p className="text-sm text-app-muted">
          Arquivo selecionado. Salve para registrar a etapa.
        </p>
      ) : null}
    </div>
  );
}

interface OrcamentoAbaFuncionariosProps {
  file: File | null;
  savedName: string | null;
  savedUrl: string | null;
  savedTipo: string | null;
  saving: boolean;
  onFileChange: (file: File | null) => void;
  onSalvar: () => void;
  onSubstituir: (file: File) => Promise<void>;
  onRemover: () => Promise<void>;
}

function AnexoAcoes({
  saving,
  onSubstituirClick,
  onRemoverClick,
  substituirLabel,
  removerLabel,
}: {
  saving: boolean;
  onSubstituirClick: () => void;
  onRemoverClick: () => void;
  substituirLabel: string;
  removerLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe3ef] bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-[#f8fafc] disabled:opacity-60"
        disabled={saving}
        onClick={onSubstituirClick}
      >
        <IconRefresh size={14} />
        {substituirLabel}
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#fecaca] bg-white px-3 py-1.5 text-xs font-semibold text-brand-red hover:bg-[#fef2f2] disabled:opacity-60"
        disabled={saving}
        onClick={onRemoverClick}
      >
        <IconTrash size={14} />
        {removerLabel}
      </button>
    </div>
  );
}

export function OrcamentoAbaFuncionarios({
  file,
  savedName,
  savedUrl,
  savedTipo,
  saving,
  onFileChange,
  onSalvar,
  onSubstituir,
  onRemover,
}: OrcamentoAbaFuncionariosProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const hasSaved = Boolean(savedName);
  const hasPreview = Boolean(file || savedName);
  const busy = saving || actionSaving;

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

  return (
    <div className="space-y-4">
      {!hasSaved ? (
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-navy">
            Anexar lista de funcionários <RequiredMark />
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
            className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-[#eef2ff] file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-navy"
            disabled={busy}
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-[11px] text-app-muted">
            Aceita XLS, XLSX, CSV, PDF, JPG, JPEG e PNG (máx. 10 MB).
          </p>
        </label>
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

      {hasPreview ? (
        <div className="space-y-3">
          <OrcamentoArquivoPreview
            file={file}
            savedUrl={savedUrl}
            savedName={savedName}
            savedTipo={savedTipo}
          />
          {hasSaved ? (
            <AnexoAcoes
              saving={busy}
              onSubstituirClick={() => replaceInputRef.current?.click()}
              onRemoverClick={() => setConfirmOpen(true)}
              substituirLabel="Substituir"
              removerLabel="Remover"
            />
          ) : null}
        </div>
      ) : null}

      {!hasSaved ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || (!file && !savedName)}
            onClick={onSalvar}
          >
            {busy ? "Salvando..." : "Salvar Lista"}
          </button>
        </div>
      ) : null}

      <OrcamentoAnexoRemoverModal
        open={confirmOpen}
        titulo="Remover lista"
        mensagem="Tem certeza de que deseja remover a lista de funcionários anexada?"
        saving={actionSaving}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirmRemover()}
      />
    </div>
  );
}

interface OrcamentoAbaLogoProps {
  possuiLogo: boolean | null;
  file: File | null;
  savedName: string | null;
  savedUrl: string | null;
  savedTipo: string | null;
  saving: boolean;
  onChangePossuiLogo: (value: boolean) => void;
  onFileChange: (file: File | null) => void;
  onSalvar: () => void;
  onSubstituir: (file: File) => Promise<void>;
  onRemover: () => Promise<void>;
}

export function OrcamentoAbaLogo({
  possuiLogo,
  file,
  savedName,
  savedUrl,
  savedTipo,
  saving,
  onChangePossuiLogo,
  onFileChange,
  onSalvar,
  onSubstituir,
  onRemover,
}: OrcamentoAbaLogoProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const showUpload = possuiLogo === true;
  const hasSaved = Boolean(savedName);
  const hasPreview = Boolean(file || savedName);
  const busy = saving || actionSaving;
  const canSave =
    possuiLogo === false ||
    (possuiLogo === true && Boolean(file || savedName));

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

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-bold text-navy">
          Gostaria de incluir a logomarca da empresa?
        </legend>
        <label className="flex items-center gap-2 text-sm text-[#334155]">
          <input
            type="radio"
            name="possui_logo"
            checked={possuiLogo === true}
            disabled={busy}
            onChange={() => onChangePossuiLogo(true)}
          />
          Sim
        </label>
        <label className="flex items-center gap-2 text-sm text-[#334155]">
          <input
            type="radio"
            name="possui_logo"
            checked={possuiLogo === false}
            disabled={busy}
            onChange={() => onChangePossuiLogo(false)}
          />
          Não
        </label>
      </fieldset>

      {showUpload ? (
        <>
          {!hasSaved ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-navy">
                Upload da logomarca <RequiredMark />
              </span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-[#eef2ff] file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-navy"
                disabled={busy}
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-[11px] text-app-muted">
                Aceita PNG, JPG, JPEG e SVG (máx. 10 MB).
              </p>
            </label>
          ) : null}

          <input
            ref={replaceInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              void handleReplaceSelected(e.target.files?.[0] ?? null);
            }}
          />

          {hasPreview ? (
            <div className="space-y-3">
              <OrcamentoArquivoPreview
                file={file}
                savedUrl={savedUrl}
                savedName={savedName}
                savedTipo={savedTipo}
              />
              {hasSaved ? (
                <AnexoAcoes
                  saving={busy}
                  onSubstituirClick={() => replaceInputRef.current?.click()}
                  onRemoverClick={() => setConfirmOpen(true)}
                  substituirLabel="Substituir"
                  removerLabel="Remover"
                />
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {!(showUpload && hasSaved) ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !canSave}
            onClick={onSalvar}
          >
            {busy ? "Salvando..." : "Salvar"}
          </button>
        </div>
      ) : null}

      <OrcamentoAnexoRemoverModal
        open={confirmOpen}
        titulo="Remover logomarca"
        mensagem="Tem certeza de que deseja remover a logomarca anexada?"
        saving={actionSaving}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirmRemover()}
      />
    </div>
  );
}

interface OrcamentoAbaVisitaProps {
  necessaria: boolean | null;
  data: string;
  endereco: string;
  observacoes: string;
  mensagem: string;
  saving: boolean;
  onChangeNecessaria: (value: boolean) => void;
  onChangeData: (value: string) => void;
  onChangeEndereco: (value: string) => void;
  onChangeObservacoes: (value: string) => void;
  onCopiarMensagem: () => void;
  onSalvar: () => void;
}

export function OrcamentoAbaVisitaTecnica({
  necessaria,
  data,
  endereco,
  observacoes,
  mensagem,
  saving,
  onChangeNecessaria,
  onChangeData,
  onChangeEndereco,
  onChangeObservacoes,
  onCopiarMensagem,
  onSalvar,
}: OrcamentoAbaVisitaProps) {
  const showFields = necessaria === true;

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-bold text-navy">
          Necessita visita técnica?
        </legend>
        <label className="flex items-center gap-2 text-sm text-[#334155]">
          <input
            type="radio"
            name="visita_necessaria"
            checked={necessaria === true}
            disabled={saving}
            onChange={() => onChangeNecessaria(true)}
          />
          Sim
        </label>
        <label className="flex items-center gap-2 text-sm text-[#334155]">
          <input
            type="radio"
            name="visita_necessaria"
            checked={necessaria === false}
            disabled={saving}
            onChange={() => onChangeNecessaria(false)}
          />
          Não
        </label>
      </fieldset>

      {showFields ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-navy">
                Data da visita <RequiredMark />
              </span>
              <input
                type="date"
                className="field-input"
                value={data}
                disabled={saving}
                onChange={(e) => onChangeData(e.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-navy">
                Endereço da visita <RequiredMark />
              </span>
              <input
                type="text"
                className="field-input"
                value={endereco}
                disabled={saving}
                onChange={(e) => onChangeEndereco(e.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-navy">
                Observações
              </span>
              <textarea
                className="field-input min-h-[80px] resize-y"
                value={observacoes}
                disabled={saving}
                onChange={(e) => onChangeObservacoes(e.target.value)}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-[#dbeafe] bg-gradient-to-br from-[#eff6ff] to-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-extrabold uppercase tracking-wide text-navy">
                Mensagem para WhatsApp
              </p>
              <button
                type="button"
                className="rounded-lg bg-brand-blue-soft px-2.5 py-1 text-[11px] font-bold text-brand-blue"
                onClick={onCopiarMensagem}
              >
                📋 Copiar mensagem
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded-xl bg-white p-3 text-[13px] leading-relaxed text-[#334155]">
              {mensagem}
            </pre>
          </div>
        </>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving || necessaria == null}
          onClick={onSalvar}
        >
          {saving ? "Salvando..." : "Salvar Visita Técnica"}
        </button>
      </div>
    </div>
  );
}
