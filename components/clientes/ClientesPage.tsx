"use client";

import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";

import { ClienteViewModal } from "@/components/modals/ClienteViewModal";

import { IconUsers } from "@/components/ui/icons/OutlineIcons";

import { ClienteForm } from "./ClienteForm";

import { ClienteFormActions } from "./ClienteFormActions";

import { ClienteTopActions } from "./ClienteTopActions";

import { ClienteContratoVencimentosPanel } from "./ClienteContratoVencimentosPanel";

import { ClientesSearchPanel } from "./ClientesSearchPanel";

import { ClientesTable } from "./ClientesTable";

import { useClienteForm } from "@/hooks/useClienteForm";

import { useClientesPaginatedList } from "@/hooks/useClientesPaginatedList";

import { useClientesPage } from "@/hooks/useClientesPage";

import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { AUDITORIA_ACOES, AUDITORIA_MODULOS } from "@/lib/auditoria";
import { hasActiveClientesListFilters } from "@/lib/cliente-filters";
import {
  periodoInicialVencimentos,
  type ConsultaVencimentoContrato,
} from "@/lib/cliente-contrato-vencimentos";
import { resolveClienteCnpjError } from "@/lib/cliente-cnpj";
import { salvarCliente } from "@/services/cliente.service";
import { registrarAuditoria } from "@/services/auditoria.service";

const VALIDATION_MESSAGE =
  "Preencha Nome da empresa e CNPJ antes de salvar.";

type AbaClientes = "cadastro" | "vencimentos";

export function ClientesPage() {
  const auditContext = useAuditoriaUsuario();
  const [showForm, setShowForm] = useState(false);
  const [aba, setAba] = useState<AbaClientes>("cadastro");
  const periodoInicial = periodoInicialVencimentos();
  const [vencimentoAno, setVencimentoAno] = useState(periodoInicial.ano);
  const [vencimentoMes, setVencimentoMes] = useState(periodoInicial.mes);
  const [vencimentoConsulta, setVencimentoConsulta] =
    useState<ConsultaVencimentoContrato>("principal");
  const [scrollToContratoSst, setScrollToContratoSst] = useState(false);

  const {
    form,
    setField,
    reset,
    buildPayload,
    validate,
    saving,
    setSaving,
  } = useClienteForm();

  const {
    clientes,
    renovacaoPorCliente,
    loading,
    error,
    page,
    total,
    totalPages,
    pageSize,
    filters,
    debouncedBusca,
    highlightClienteId,
    setPage,
    setFilter,
    clearFilters,
    showClienteAposCadastro,
    refresh,
  } = useClientesPaginatedList();

  const { viewCliente, viewLoading, handleAbrir, closeView, updateViewCliente } =
    useClientesPage();

  const abrirCliente = (id: string, focoContratoSst = false) => {
    setScrollToContratoSst(focoContratoSst);
    void handleAbrir(id);
  };

  const fecharCliente = () => {
    closeView();
    setScrollToContratoSst(false);
  };

  const resetForm = () => {
    reset();
  };

  const handleNovoCliente = () => {
    resetForm();
    setShowForm(true);

    requestAnimationFrame(() => {
      document
        .getElementById("cadastrar-cliente")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error(VALIDATION_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const id = await salvarCliente(payload, {
        usuarioNome: auditContext.usuarioNome,
      });
      await registrarAuditoria({
        usuarioId: auditContext.usuarioId,
        usuarioNome: auditContext.usuarioNome,
        usuarioEmail: auditContext.usuarioEmail,
        modulo: AUDITORIA_MODULOS.clientes,
        acao: AUDITORIA_ACOES.criacao,
        registroId: id,
        registroNome: payload.nome,
        descricao: `${auditContext.usuarioNome} criou o cliente ${payload.nome}.`,
      });
      if (payload.disponivel_agendamento === false) {
        await registrarAuditoria({
          usuarioId: auditContext.usuarioId,
          usuarioNome: auditContext.usuarioNome,
          usuarioEmail: auditContext.usuarioEmail,
          modulo: AUDITORIA_MODULOS.clientes,
          acao: AUDITORIA_ACOES.agendamento_cliente_bloqueado,
          registroId: id,
          registroNome: payload.nome,
          descricao: `${auditContext.usuarioNome} bloqueou o cliente ${payload.nome} para novos agendamentos.`,
          dadosDepois: {
            disponivel_agendamento: false,
            agendamento_bloqueio_manual: true,
          },
        });
      }
      toast.success("Cliente salvo com sucesso!");

      resetForm();
      setShowForm(false);
      await showClienteAposCadastro(id, payload.nome);

      requestAnimationFrame(() => {
        document
          .getElementById("clientes-cadastrados")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      console.error("Erro completo ao salvar:", err);
      const cnpjMessage = resolveClienteCnpjError(err);
      if (cnpjMessage) {
        toast.error(cnpjMessage);
        return;
      }
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      toast.error(message || "Erro ao salvar cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Clientes"
      subtitle="Cadastre e gerencie os clientes da Navarro Engenharia."
      icon={<IconUsers size={20} />}
    >
      <ClienteTopActions onNovoCliente={handleNovoCliente} />

      {showForm && (
        <>
          <ClienteForm form={form} onChange={setField} />

          <ClienteFormActions
            saving={saving}
            onClear={resetForm}
            onSave={handleSave}
          />
        </>
      )}

      <div
        className="mb-[18px] flex flex-wrap gap-2"
        role="tablist"
        aria-label="Seções de clientes"
      >
        {(
          [
            ["cadastro", "Clientes"],
            ["vencimentos", "Vencimentos de contratos"],
          ] as const
        ).map(([id, label]) => {
          const ativa = aba === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={ativa}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${
                ativa
                  ? "bg-white text-navy shadow-sm ring-1 ring-[#e8edf5]"
                  : "text-[#64748b]"
              }`}
              onClick={() => setAba(id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {aba === "cadastro" ? (
        <>
          <div className="mb-[18px]">
            <ClientesSearchPanel
              filters={filters}
              totalFiltrados={total}
              onChangeBusca={(value) => setFilter("busca", value)}
              onChangeAgendamento={(value) => setFilter("agendamento", value)}
              onClear={clearFilters}
            />
          </div>

          <div id="clientes-cadastrados">
            <ClientesTable
              clientes={clientes}
              loading={loading || viewLoading}
              error={error}
              page={page}
              total={total}
              totalPages={totalPages}
              pageSize={pageSize}
              hasActiveSearch={hasActiveClientesListFilters(filters)}
              highlightClienteId={highlightClienteId}
              renovacaoPorCliente={renovacaoPorCliente}
              onAbrir={(id) => abrirCliente(id)}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : (
        <ClienteContratoVencimentosPanel
          ano={vencimentoAno}
          mes={vencimentoMes}
          consulta={vencimentoConsulta}
          onAnoChange={setVencimentoAno}
          onMesChange={setVencimentoMes}
          onConsultaChange={setVencimentoConsulta}
          onAbrir={(id) => abrirCliente(id, true)}
        />
      )}

      <ClienteViewModal
        cliente={viewCliente}
        scrollToContratoSst={scrollToContratoSst}
        onClose={fecharCliente}
        onUpdated={(updated) => {
          updateViewCliente(updated);
          refresh();
        }}
      />

      {saving && (
        <div
          className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]"
          aria-hidden
        />
      )}
    </AppShell>
  );
}
