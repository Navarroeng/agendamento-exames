"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  IconReceipt,
  IconWallet,
} from "@/components/ui/icons/OutlineIcons";
import { FaturaDuplicidadeModal } from "./FaturaDuplicidadeModal";
import { FaturaPreviewModal } from "./FaturaPreviewModal";
import { FaturaPagamentoModal } from "./FaturaPagamentoModal";
import { FaturasMesPanel } from "./FaturasMesPanel";
import { useFaturasPage } from "@/hooks/useFaturasPage";
import type { FaturaTipo } from "@/lib/types";

const PAGE_META: Record<
  FaturaTipo,
  { title: string; subtitle: string; icon: React.ReactNode }
> = {
  cliente: {
    title: "Faturas Clientes",
    subtitle:
      "Visualize o faturamento mensal por cliente, com valores em tempo real e status das faturas.",
    icon: <IconReceipt size={20} />,
  },
  clinica: {
    title: "Custos Clínicas",
    subtitle:
      "Visualize os custos mensais por clínica, com valores em tempo real e status dos registros.",
    icon: <IconWallet size={20} />,
  },
};

interface FaturasPageProps {
  tipo: FaturaTipo;
}

export function FaturasPage({ tipo }: FaturasPageProps) {
  const meta = PAGE_META[tipo];
  const {
    filters,
    filterOptions,
    mesReferenciaValido,
    resumoMes,
    loading,
    saving,
    previewOpen,
    preview,
    handleFilterChange,
    handleClosePreview,
    handleSaveDraft,
    handleEmit,
    handleGeneratePdf,
    handleVisualizar,
    handleHistoricoPdf,
    handleCancelar,
    pagamentoOpen,
    pagamentoMode,
    pagamentoFatura,
    handleMarcarPago,
    handleEditarPagamento,
    handleClosePagamento,
    handleConfirmPagamento,
    handleVerComprovante,
    handleMarcarPendente,
    faturaDuplicidadeOpen,
    faturaDuplicidadeInfo,
    faturaDuplicidadeTipo,
    handleCloseFaturaDuplicidade,
    handleVisualizarAgendamentos,
    handleEmitirReferencia,
    handleReemitirFatura,
  } = useFaturasPage(tipo);

  return (
    <AppShell
      title={meta.title}
      subtitle={meta.subtitle}
      icon={meta.icon}
    >
      <div className="space-y-5">
        <FaturasMesPanel
          variant={tipo}
          filters={filters}
          options={filterOptions}
          rows={resumoMes?.rows ?? []}
          resumo={resumoMes?.resumo ?? null}
          mesValido={mesReferenciaValido}
          loading={loading}
          saving={saving}
          onChange={handleFilterChange}
          onVisualizarAgendamentos={handleVisualizarAgendamentos}
          onEmitir={handleEmitirReferencia}
          onVisualizarFatura={handleVisualizar}
          onGerarPdf={handleHistoricoPdf}
          onCancelar={handleCancelar}
          onMarcarPago={handleMarcarPago}
          onEditarPagamento={handleEditarPagamento}
          onMarcarPendente={handleMarcarPendente}
          onVerComprovante={handleVerComprovante}
          onReemitir={handleReemitirFatura}
        />
      </div>

      <FaturaPreviewModal
        open={previewOpen}
        preview={preview}
        saving={saving}
        onClose={handleClosePreview}
        onSaveDraft={handleSaveDraft}
        onEmit={handleEmit}
        onGeneratePdf={handleGeneratePdf}
      />

      <FaturaPagamentoModal
        open={pagamentoOpen}
        mode={pagamentoMode}
        fatura={pagamentoFatura}
        saving={saving}
        onClose={handleClosePagamento}
        onConfirm={handleConfirmPagamento}
        onVerComprovante={handleVerComprovante}
      />

      <FaturaDuplicidadeModal
        open={faturaDuplicidadeOpen}
        fatura={faturaDuplicidadeInfo}
        tipo={faturaDuplicidadeTipo}
        onClose={handleCloseFaturaDuplicidade}
      />
    </AppShell>
  );
}
