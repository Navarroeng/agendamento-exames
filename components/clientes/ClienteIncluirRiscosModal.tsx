"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useAuditoriaUsuario } from "@/contexts/AuthContext";
import { formatCNPJ } from "@/lib/cnpj";
import { formatClienteNomeDisplay } from "@/lib/cliente-display";
import { MSG_CAMPANHA_ATIVA_CLIENTE } from "@/lib/riscos-campanha-origem";
import type { ClienteRecord } from "@/lib/types";
import { formatResponsavelOrcamentoDisplay } from "@/lib/orcamento-responsavel";
import {
  buscarCampanhaAtivaPorCliente,
  criarCampanhaManualCliente,
} from "@/services/riscos-campanha.service";
import { listarUsuariosAtivosParaResponsavel } from "@/services/orcamento-responsavel.service";

type Props = {
  open: boolean;
  cliente: ClienteRecord;
  onClose: () => void;
  onCreated?: (codigoPublico: string) => void;
};

export function ClienteIncluirRiscosModal({
  open,
  cliente,
  onClose,
  onCreated,
}: Props) {
  const auditContext = useAuditoriaUsuario();
  const [responsaveis, setResponsaveis] = useState<
    Array<{ user_id: string; nome: string }>
  >([]);
  const [responsavelNome, setResponsavelNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataEncerramento, setDataEncerramento] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!open) return;
    setResponsavelNome(auditContext.usuarioNome?.trim() || "");
    setDataInicio(new Date().toISOString().slice(0, 10));
    setDataEncerramento("");
    setQuantidade("1");
    setObservacoes("");
    setLoadingUsers(true);
    void listarUsuariosAtivosParaResponsavel()
      .then((rows) => {
        setResponsaveis(
          rows.map((r) => ({
            user_id: r.user_id,
            nome: formatResponsavelOrcamentoDisplay(r.nome),
          }))
        );
      })
      .catch((err) => {
        console.error(err);
        toast.error("Não foi possível carregar os responsáveis.");
      })
      .finally(() => setLoadingUsers(false));
  }, [open, auditContext.usuarioNome]);

  if (!open) return null;

  const cnpjDigits = String(cliente.cnpj ?? "").replace(/\D/g, "");
  const cnpjDisplay =
    cnpjDigits.length === 14 ? formatCNPJ(cliente.cnpj) : cliente.cnpj || "—";

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const ativa = await buscarCampanhaAtivaPorCliente(cliente.id);
      if (ativa) {
        toast.error(MSG_CAMPANHA_ATIVA_CLIENTE);
        return;
      }

      const campanha = await criarCampanhaManualCliente(
        {
          clienteId: cliente.id,
          cnpj: cnpjDigits || String(cliente.cnpj ?? ""),
          empresaNome: cliente.nome,
          responsavel: responsavelNome.trim(),
          dataInicioIso: dataInicio,
          dataEncerramentoIso: dataEncerramento,
          quantidadePrevista: Number(quantidade),
          observacoes: observacoes.trim() || null,
        },
        { auditContext }
      );

      toast.success(
        `Pesquisa Psicossocial criada (${campanha.codigo_publico}).`
      );
      onCreated?.(campanha.codigo_publico);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível criar a Pesquisa Psicossocial."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Incluir em Riscos Psicossociais"
      subtitle="Criação manual para clientes antigos ou contratos fora do sistema."
      size="wide"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn !px-4 !py-2 text-xs"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary !px-4 !py-2 text-xs"
            onClick={() => void handleSubmit()}
            disabled={saving || loadingUsers}
          >
            {saving ? "Criando…" : "Criar Pesquisa Psicossocial"}
          </button>
        </div>
      }
    >
      <div className="grid gap-4">
        <Field label="Cliente">
          <input
            className="field-input"
            value={formatClienteNomeDisplay(cliente.nome)}
            readOnly
            disabled
          />
        </Field>
        <Field label="CNPJ">
          <input className="field-input" value={cnpjDisplay} readOnly disabled />
        </Field>
        <Field label={<>Responsável <RequiredMark /></>}>
          <select
            className="field-input"
            value={responsavelNome}
            onChange={(e) => setResponsavelNome(e.target.value)}
            disabled={loadingUsers || saving}
          >
            <option value="">Selecione…</option>
            {responsaveis.map((u) => (
              <option key={u.user_id} value={u.nome}>
                {u.nome}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={<>Data de início <RequiredMark /></>}>
            <input
              type="date"
              className="field-input"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              disabled={saving}
            />
          </Field>
          <Field label={<>Data de encerramento previsto <RequiredMark /></>}>
            <input
              type="date"
              className="field-input"
              value={dataEncerramento}
              onChange={(e) => setDataEncerramento(e.target.value)}
              disabled={saving}
            />
          </Field>
        </div>
        <Field label={<>Quantidade prevista de participantes <RequiredMark /></>}>
          <input
            type="number"
            min={1}
            step={1}
            className="field-input"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            disabled={saving}
          />
        </Field>
        <Field label="Observações">
          <textarea
            className="field-input min-h-[88px]"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            disabled={saving}
            placeholder="Opcional"
          />
        </Field>
      </div>
    </Modal>
  );
}
