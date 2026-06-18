"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { filterClinicaExamesCatalog } from "@/lib/clinica-filters";
import { formatCurrency, formatMoney, parseMoney } from "@/lib/money";
import { listarExamesAtivos } from "@/services/exame.service";
import {
  atualizarClinicaExame,
  criarClinicaExame,
  listarClinicaExames,
} from "@/services/clinica-exame.service";
import { registrarHistoricoClinicaExame } from "@/services/clinica-exame-historico.service";
import type { ClinicaExameWithExame, ExameRecord } from "@/lib/types";

interface UseClinicaExamesTabOptions {
  clinicaId: string;
  usuario: string;
  auditContext?: import("@/lib/auditoria").AuditoriaUsuarioContext;
  clinicaNome?: string | null;
}

export function useClinicaExamesTab({
  clinicaId,
  usuario,
  auditContext,
  clinicaNome,
}: UseClinicaExamesTabOptions) {
  const [items, setItems] = useState<ClinicaExameWithExame[]>([]);
  const [catalogo, setCatalogo] = useState<ExameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addExameId, setAddExameId] = useState("");
  const [addCusto, setAddCusto] = useState("");
  const [addPrazo, setAddPrazo] = useState("");
  const [addObs, setAddObs] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCusto, setEditCusto] = useState("");
  const [editValorNavarro, setEditValorNavarro] = useState("");
  const [editPrazo, setEditPrazo] = useState("");
  const [editObs, setEditObs] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vinculos, exames] = await Promise.all([
        listarClinicaExames(clinicaId),
        listarExamesAtivos(),
      ]);
      setItems(vinculos);
      setCatalogo(exames);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar exames da clínica.");
    } finally {
      setLoading(false);
    }
  }, [clinicaId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => filterClinicaExamesCatalog(items, search),
    [items, search]
  );

  const examesDisponiveis = useMemo(() => {
    const vinculados = new Set(items.map((i) => i.exame_id));
    return catalogo.filter((e) => !vinculados.has(e.id));
  }, [catalogo, items]);

  const handleAdd = async () => {
    if (!addExameId || !addCusto.trim()) {
      toast.error("Selecione o exame e informe o custo da clínica.");
      return;
    }

    const exame = catalogo.find((e) => e.id === addExameId);
    if (!exame) return;

    setSaving(true);
    try {
      const id = await criarClinicaExame({
        clinica_id: clinicaId,
        exame_id: addExameId,
        custo_clinica: parseMoney(addCusto),
        valor_navarro: Number(exame.valor_navarro),
        prazo_resultado: addPrazo.trim() || null,
        observacoes: addObs.trim() || null,
        ativo: true,
      });

      await registrarHistoricoClinicaExame(
        clinicaId,
        usuario,
        [
          {
            acao: "Inclusão",
            detalhes: `${usuario} vinculou o exame ${exame.nome} com custo ${formatMoney(parseMoney(addCusto))}.`,
          },
        ],
        id,
        {
          auditContext,
          registroNome: clinicaNome ?? exame.nome,
        }
      );

      toast.success("Exame adicionado à clínica.");
      setShowAdd(false);
      setAddExameId("");
      setAddCusto("");
      setAddPrazo("");
      setAddObs("");
      load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      toast.error(message || "Erro ao adicionar exame.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: ClinicaExameWithExame) => {
    setEditingId(item.id);
    setEditCusto(formatCurrency(Number(item.custo_clinica)));
    setEditValorNavarro(
      formatCurrency(Number(item.valor_navarro ?? item.exames.valor_navarro))
    );
    setEditPrazo(item.prazo_resultado ?? "");
    setEditObs(item.observacoes ?? "");
  };

  const handleSaveEdit = async (item: ClinicaExameWithExame) => {
    if (!editCusto.trim()) {
      toast.error("Informe o custo da clínica.");
      return;
    }
    if (!editValorNavarro.trim()) {
      toast.error("Informe o valor Navarro.");
      return;
    }

    const novoCusto = parseMoney(editCusto);
    const novoValorNavarro = parseMoney(editValorNavarro);
    const custoAnterior = Number(item.custo_clinica);
    const valorNavarroAnterior = Number(
      item.valor_navarro ?? item.exames.valor_navarro
    );

    setSaving(true);
    try {
      await atualizarClinicaExame(item.id, {
        clinica_id: clinicaId,
        exame_id: item.exame_id,
        custo_clinica: novoCusto,
        valor_navarro: novoValorNavarro,
        prazo_resultado: editPrazo.trim() || null,
        observacoes: editObs.trim() || null,
        ativo: item.ativo,
      });

      const entries = [];
      if (custoAnterior !== novoCusto) {
        entries.push({
          acao: "Alteração de custo",
          detalhes: `${usuario} alterou custo de ${item.exames.nome} de ${formatMoney(custoAnterior)} para ${formatMoney(novoCusto)}.`,
        });
      }
      if (valorNavarroAnterior !== novoValorNavarro) {
        entries.push({
          acao: "Alteração de valor Navarro",
          detalhes: `${usuario} alterou valor Navarro de ${item.exames.nome} de ${formatMoney(valorNavarroAnterior)} para ${formatMoney(novoValorNavarro)}.`,
        });
      }
      if (entries.length > 0) {
        await registrarHistoricoClinicaExame(
          clinicaId,
          usuario,
          entries,
          item.id,
          {
            auditContext,
            registroNome: clinicaNome ?? item.exames.nome,
          }
        );
      }

      toast.success("Exame atualizado.");
      setEditingId(null);
      load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "";
      toast.error(message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (item: ClinicaExameWithExame) => {
    setSaving(true);
    try {
      const novoAtivo = !item.ativo;
      await atualizarClinicaExame(item.id, {
        clinica_id: clinicaId,
        exame_id: item.exame_id,
        custo_clinica: Number(item.custo_clinica),
        valor_navarro: Number(item.valor_navarro ?? item.exames.valor_navarro),
        prazo_resultado: item.prazo_resultado,
        observacoes: item.observacoes,
        ativo: novoAtivo,
      });

      await registrarHistoricoClinicaExame(
        clinicaId,
        usuario,
        [
          {
            acao: novoAtivo ? "Ativação" : "Desativação",
            detalhes: `${usuario} ${novoAtivo ? "ativou" : "desativou"} o exame ${item.exames.nome} nesta clínica.`,
          },
        ],
        item.id,
        {
          auditContext,
          registroNome: clinicaNome ?? item.exames.nome,
        }
      );

      toast.success(novoAtivo ? "Exame ativado." : "Exame desativado.");
      load();
    } catch {
      toast.error("Erro ao alterar status do exame.");
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    search,
    setSearch,
    showAdd,
    setShowAdd,
    addExameId,
    setAddExameId,
    addCusto,
    setAddCusto,
    addPrazo,
    setAddPrazo,
    addObs,
    setAddObs,
    editingId,
    setEditingId,
    editCusto,
    setEditCusto,
    editValorNavarro,
    setEditValorNavarro,
    editPrazo,
    setEditPrazo,
    editObs,
    setEditObs,
    filtered,
    examesDisponiveis,
    handleAdd,
    startEdit,
    handleSaveEdit,
    handleToggleAtivo,
  };
}
