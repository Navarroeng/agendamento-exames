"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  IconReceipt,
  IconWallet,
} from "@/components/ui/icons/OutlineIcons";
import { FaturaDuplicidadeModal } from "./FaturaDuplicidadeModal";
import { FaturaPreviewModal } from "./FaturaPreviewModal";
import { FaturaPagamentoModal } from "./FaturaPagamentoModal";
import { FaturasFiltersPanel } from "./FaturasFiltersPanel";
import { FaturasClientesMesPanel } from "./FaturasClientesMesPanel";
import { FaturasHistoricoTable } from "./FaturasHistoricoTable";
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
      "Controle de custos operacionais das clínicas credenciadas.",
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
    historicoFilters,
    filterOptions,
    agendamentosFiltrados,
    mesReferenciaValido,
    resumoClientesMes,
    faturas,
    faturasFiltradas,
    faturasPaginadas,
    historicoPage,
    totalHistoricoPages,
    loading,
    historicoLoading,
    saving,
    previewOpen,
    preview,
    handleFilterChange,
    handleClearFilters,
    handleHistoricoFilterChange,
    handleClearHistoricoFilters,
    handleHistoricoPageChange,
    handlePrevia,
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
    handleMarcarPendente,
    faturaDuplicidadeOpen,
    faturaDuplicidadeInfo,
    faturaDuplicidadeTipo,
    handleCloseFaturaDuplicidade,
    handleVisualizarAgendamentosCliente,
    handleEmitirFaturaCliente,
  } = useFaturasPage(tipo);

  const isCliente = tipo === "cliente";

  return (
    <AppShell
      title={meta.title}
      subtitle={meta.subtitle}
      icon={meta.icon}
    >
      <div className="space-y-5">
        {isCliente ? (
          <FaturasClientesMesPanel
            filters={filters}
            options={{ clientes: filterOptions.clientes }}
            rows={resumoClientesMes?.rows ?? []}
            resumo={resumoClientesMes?.resumo ?? null}
            mesValido={mesReferenciaValido}
            loading={loading}
            saving={saving}
            onChange={handleFilterChange}
            onVisualizarAgendamentos={handleVisualizarAgendamentosCliente}
            onEmitirFatura={handleEmitirFaturaCliente}
            onVisualizarFatura={handleVisualizar}
            onGerarPdf={handleHistoricoPdf}
            onCancelar={handleCancelar}
            onMarcarPago={handleMarcarPago}
            onEditarPagamento={handleEditarPagamento}
            onMarcarPendente={handleMarcarPendente}
          />
        ) : (
          <>
            <FaturasFiltersPanel
              variant={tipo}
              filters={filters}
              options={filterOptions}
              loading={loading}
              saving={saving}
              totalFiltrados={agendamentosFiltrados.length}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
              onPrevia={handlePrevia}
            />

            <FaturasHistoricoTable
              variant={tipo}
              faturas={faturasPaginadas}
              totalFiltradas={faturasFiltradas.length}
              totalGeral={faturas.length}
              historicoFilters={historicoFilters}
              loading={historicoLoading}
              page={historicoPage}
              totalPages={totalHistoricoPages}
              onPageChange={handleHistoricoPageChange}
              onHistoricoFilterChange={handleHistoricoFilterChange}
              onClearHistoricoFilters={handleClearHistoricoFilters}
              onVisualizar={handleVisualizar}
              onGerarPdf={handleHistoricoPdf}
              onCancelar={handleCancelar}
              onMarcarPago={handleMarcarPago}
              onEditarPagamento={handleEditarPagamento}
              onMarcarPendente={handleMarcarPendente}
            />
          </>
        )}
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
