"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  IconReceipt,
  IconWallet,
} from "@/components/ui/icons/OutlineIcons";
import { FaturaDuplicidadeModal } from "./FaturaDuplicidadeModal";
import { FaturaEnvioEmailModal } from "./FaturaEnvioEmailModal";
import { FaturaLembreteModal } from "./FaturaLembreteModal";
import { FaturaLembretesHojeBar } from "./FaturaLembretesHojeBar";
import { FaturaLembretesSecao } from "./FaturaLembretesSecao";
import { FaturaLembretesVencidasBar } from "./FaturaLembretesVencidasBar";
import { FaturaPreviewModal } from "./FaturaPreviewModal";
import { FaturaPagamentoModal } from "./FaturaPagamentoModal";
import { AjustarPeriodoCustosModal } from "./AjustarPeriodoCustosModal";
import { FaturaConferenciaModal } from "./FaturaConferenciaModal";
import { FaturasMesPanel } from "./FaturasMesPanel";
import { useFaturasPage } from "@/hooks/useFaturasPage";
import type { FaturaTipo } from "@/lib/types";
import { useState } from "react";

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
      "Visualize os custos de cada clínica no próprio período de fechamento, com conferência e vencimento.",
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
    mesSelecionado,
    filterOptions,
    mesReferenciaValido,
    resumoMes,
    loading,
    saving,
    previewOpen,
    preview,
    auditOptions,
    handleFilterChange,
    handleMesChange,
    handleYearChange,
    abaSemVencimento,
    handleSemVencimento,
    handleClosePreview,
    handleSaveDraft,
    handleEmit,
    handleGeneratePdf,
    handleVisualizar,
    handleFaturaAtualizada,
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
    handleVerFaturaClinica,
    conferenciaOpen,
    conferenciaFatura,
    handleCloseConferencia,
    handleConfirmConferencia,
    handleMarcarPendente,
    faturaDuplicidadeOpen,
    faturaDuplicidadeInfo,
    faturaDuplicidadeTipo,
    handleCloseFaturaDuplicidade,
    handleVisualizarAgendamentos,
    handleEmitirReferencia,
    handleReabrirConferencia,
    handleReemitirFatura,
    envioEmailModalOpen,
    envioEmailFatura,
    envioEmailSugerido,
    envioEmailModalOrigem,
    handleCloseEnvioEmailModal,
    handleEnviarEmailMenu,
    handleFaturaEnvioEmailEnviado,
    lembreteModalOpen,
    lembreteFatura,
    lembreteEmailSugerido,
    lembreteHistoricoInicial,
    handleAbrirLembrete,
    handleCloseLembreteModal,
    handleLembreteEnviado,
    ajusteRow,
    ajusteErro,
    handleAbrirAjustePeriodo,
    handleFecharAjustePeriodo,
    handleSalvarAjustePeriodo,
  } = useFaturasPage(tipo);
  const [lembreteTick, setLembreteTick] = useState(0);
  const [pagamentoTick, setPagamentoTick] = useState(0);
  const [loteEmEnvio, setLoteEmEnvio] = useState<"hoje" | "vencidas" | null>(
    null
  );

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
          mesSelecionado={mesSelecionado}
          options={filterOptions}
          rows={resumoMes?.rows ?? []}
          resumo={resumoMes?.resumo ?? null}
          mesValido={mesReferenciaValido}
          loading={loading}
          saving={saving}
          onChange={handleFilterChange}
          onMesChange={handleMesChange}
          onYearChange={handleYearChange}
          semVencimento={tipo === "clinica" && abaSemVencimento}
          onSemVencimento={
            tipo === "clinica" ? handleSemVencimento : undefined
          }
          onVisualizarAgendamentos={handleVisualizarAgendamentos}
          onEmitir={handleEmitirReferencia}
          onVisualizarFatura={handleVisualizar}
          onGerarPdf={handleHistoricoPdf}
          onCancelar={handleCancelar}
          onMarcarPago={handleMarcarPago}
          onEditarPagamento={handleEditarPagamento}
          onMarcarPendente={handleMarcarPendente}
          onVerComprovante={handleVerComprovante}
          onVerFaturaClinica={
            tipo === "clinica" ? handleVerFaturaClinica : undefined
          }
          onReemitir={handleReemitirFatura}
          onReabrirConferencia={
            tipo === "clinica" ? handleReabrirConferencia : undefined
          }
          onAjustarPeriodo={
            tipo === "clinica" ? handleAbrirAjustePeriodo : undefined
          }
          onEnviarEmail={
            tipo === "cliente" ? handleEnviarEmailMenu : undefined
          }
          onEnviarLembrete={
            tipo === "cliente" ? (id) => void handleAbrirLembrete(id, false) : undefined
          }
          onConsultarLembrete={
            tipo === "cliente" ? (id) => void handleAbrirLembrete(id, true) : undefined
          }
          lembretes={
            tipo === "cliente" ? (
              <FaturaLembretesSecao competencia={filters.mesReferencia}>
                <FaturaLembretesHojeBar
                  competencia={filters.mesReferencia}
                  atualizarEm={lembreteTick}
                  pagamentoEm={pagamentoTick}
                  bloqueado={loteEmEnvio === "vencidas"}
                  onOcupacaoChange={(ocupado) =>
                    setLoteEmEnvio(ocupado ? "hoje" : null)
                  }
                  onEnviado={(params) => {
                    handleLembreteEnviado(params);
                    setLembreteTick((valor) => valor + 1);
                  }}
                />
                <FaturaLembretesVencidasBar
                  competencia={filters.mesReferencia}
                  atualizarEm={lembreteTick}
                  pagamentoEm={pagamentoTick}
                  bloqueado={loteEmEnvio === "hoje"}
                  onOcupacaoChange={(ocupado) =>
                    setLoteEmEnvio(ocupado ? "vencidas" : null)
                  }
                  onEnviado={(params) => {
                    handleLembreteEnviado(params);
                    setLembreteTick((valor) => valor + 1);
                  }}
                />
              </FaturaLembretesSecao>
            ) : undefined
          }
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
        auditOptions={auditOptions}
        onFaturaAtualizada={handleFaturaAtualizada}
        onAbrirFaturaRelacionada={handleVisualizar}
        onVerFaturaClinica={
          tipo === "clinica" ? handleVerFaturaClinica : undefined
        }
      />

      <FaturaPagamentoModal
        open={pagamentoOpen}
        mode={pagamentoMode}
        fatura={pagamentoFatura}
        saving={saving}
        onClose={handleClosePagamento}
        onConfirm={async (dataPagamentoIso, observacao, comprovanteFile) => {
          await handleConfirmPagamento(
            dataPagamentoIso,
            observacao,
            comprovanteFile
          );
          if (tipo === "cliente") setPagamentoTick((valor) => valor + 1);
        }}
        onVerComprovante={handleVerComprovante}
      />

      {tipo === "clinica" && ajusteRow ? (
        <AjustarPeriodoCustosModal
          open
          clinicaNome={ajusteRow.referenciaNome}
          mesFechamento={filters.mesReferencia}
          inicioInicial={ajusteRow.periodoInicio ?? ""}
          fimInicial={ajusteRow.periodoFim ?? ""}
          saving={saving}
          erro={ajusteErro}
          onClose={handleFecharAjustePeriodo}
          onSave={(params) => void handleSalvarAjustePeriodo(params)}
        />
      ) : null}

      {tipo === "clinica" && (
        <FaturaConferenciaModal
          open={conferenciaOpen}
          fatura={conferenciaFatura}
          saving={saving}
          onClose={handleCloseConferencia}
          onConfirm={handleConfirmConferencia}
          onVerFatura={handleVerFaturaClinica}
        />
      )}

      <FaturaDuplicidadeModal
        open={faturaDuplicidadeOpen}
        fatura={faturaDuplicidadeInfo}
        tipo={faturaDuplicidadeTipo}
        onClose={handleCloseFaturaDuplicidade}
      />

      {tipo === "cliente" && (
        <FaturaEnvioEmailModal
          open={envioEmailModalOpen}
          fatura={envioEmailFatura}
          emailSugerido={envioEmailSugerido}
          origem={envioEmailModalOrigem}
          saving={saving}
          auditOptions={auditOptions}
          onClose={handleCloseEnvioEmailModal}
          onEnviado={handleFaturaEnvioEmailEnviado}
        />
      )}

      {tipo === "cliente" && (
        <FaturaLembreteModal
          open={lembreteModalOpen}
          fatura={lembreteFatura}
          emailSugerido={lembreteEmailSugerido}
          historicoInicial={lembreteHistoricoInicial}
          onClose={handleCloseLembreteModal}
          onEnviado={(params) => {
            handleLembreteEnviado(params);
            setLembreteTick((valor) => valor + 1);
          }}
        />
      )}
    </AppShell>
  );
}
