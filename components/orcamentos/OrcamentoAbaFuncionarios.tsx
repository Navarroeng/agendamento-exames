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
  avaliarUsoListaColaboradoresCliente,
  colaboradoresParaDefinirVaga,
  origemDoColaboradorLista,
  vagaListaRealmenteLivre,
  type ColaboradorListaCliente,
  type VagaListaCliente,
} from "@/lib/lista-colaboradores-contrato";
import {
  MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO,
  MENSAGEM_CADASTRE_COLABORADOR,
  MENSAGEM_CONFLITO_LISTA_VAGAS,
  mensagemAlteracaoDiretaImplantacao,
  mensagemConflitoVinculoLista,
  mensagemOcupacaoForaDaEmpresa,
} from "@/lib/colaborador-vaga-ocupacao";
import {
  CONTRATO_VAGA_STATUS_LABELS_CLASSIFICACAO,
  buildVagaDraftsIniciais,
  draftAposRemoverFuncionario,
  emptyVagaDraft,
  isNomeFuncionarioReal,
  normalizeNomeOcupante,
  validarDraftsListaVagas,
  vagaClassificacaoBloqueiaEdicaoOcupante,
  vagaPermiteRemoverFuncionario,
  statusClassificacaoVaga,
  textoConfirmacaoLiberarVaga,
  textoVinculoOuReservaVaga,
  vagaComprometidaResidual,
  vagaTemColaboradorVinculado,
  type ContextoClassificacaoDesligamentoVaga,
  type ContratoVagaDraft,
  type ContratoVagaRecord,
  type ContratoVagaStatusClassificacao,
} from "@/lib/contrato-vagas";
import {
  buildLinhasVisuaisListaFuncionarios,
  cycleListaFuncionariosNomeSort,
  resolveStatusListaFuncionarioPreview,
  type ListaFuncionariosNomeSort,
} from "@/lib/contrato-vagas-lista";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import { buscarContratoPorOrcamentoId } from "@/services/contrato-agendamentos.service";
import {
  carregarContextoDesligamentoVagasDoCliente,
  garantirVagasDoContrato,
  liberarFuncionarioDaVagaComprometida,
  listarVagasDoContrato,
  salvarListaVagasContrato,
} from "@/services/contrato-vagas.service";
import { buscarAprovacaoPorOrcamentoId } from "@/services/orcamento-aprovacao.service";
import type { ClienteContratoRecord } from "@/lib/types";

interface OrcamentoAbaFuncionariosProps {
  orcamentoId: string;
  orcamentoNumero?: string | null;
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
  onAbrirCliente?: () => void;
}

function mensagemFalhaLista(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    const message = (err as { message: string }).message.trim();
    if (message) return message;
  }
  return "Erro ao salvar a lista.";
}

function StatusBadge({ status }: { status: ContratoVagaStatusClassificacao }) {
  const map: Record<ContratoVagaStatusClassificacao, string> = {
    aberta: "bg-[#fffbeb] text-[#b45309]",
    comprometida: "bg-[#ffedd5] text-[#c2410c]",
    aso_aberto: "bg-[#e0f2fe] text-[#0369a1]",
    agendada: "bg-brand-green-soft text-brand-green",
    programada: "bg-[#eef2ff] text-[#4338ca]",
    desligado_admin: "bg-[#f1f5f9] text-[#475569]",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${map[status]}`}
    >
      {CONTRATO_VAGA_STATUS_LABELS_CLASSIFICACAO[status]}
    </span>
  );
}

function textoSomenteLeitura(value: string | null | undefined): string {
  const texto = normalizeNomeOcupante(value);
  return texto || "—";
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
  onAbrirCliente,
}: OrcamentoAbaFuncionariosProps) {
  const quantidadePrevista = Math.max(
    0,
    Number(aprovacao.quantidade_colaboradores) || 0
  );
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [savingLista, setSavingLista] = useState(false);
  const [contrato, setContrato] = useState<ClienteContratoRecord | null>(null);
  const [vagas, setVagas] = useState<ContratoVagaRecord[]>([]);
  const [desligamento, setDesligamento] =
    useState<ContextoClassificacaoDesligamentoVaga>({
      cpfsDesligadosAdmin: new Set(),
      cpfsComDemissionalAtivo: new Set(),
    });
  const [drafts, setDrafts] = useState<ContratoVagaDraft[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removerFuncionario, setRemoverFuncionario] = useState<{
    vagaId: string;
    indice: number;
    nome: string;
    temColaborador: boolean;
  } | null>(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisoListaCliente, setAvisoListaCliente] = useState<string | null>(null);
  const [avisoListaTipo, setAvisoListaTipo] = useState<"erro" | "info">("erro");
  const [nomeSort, setNomeSort] = useState<ListaFuncionariosNomeSort>("asc");
  const [definirIndice, setDefinirIndice] = useState<number | null>(null);
  const [buscaDefinir, setBuscaDefinir] = useState("");
  const [opcoesDefinir, setOpcoesDefinir] = useState<ColaboradorListaCliente[]>([]);
  const [carregandoDefinir, setCarregandoDefinir] = useState(false);

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
      const contratoRow = await buscarContratoPorOrcamentoId(orcamentoId);
      setContrato(contratoRow);
      const qtd =
        Number(aprovacao.quantidade_colaboradores) ||
        Number(contratoRow?.quantidade_colaboradores) ||
        0;
      if (!contratoRow) {
        setVagas([]);
        setDesligamento({
          cpfsDesligadosAdmin: new Set(),
          cpfsComDemissionalAtivo: new Set(),
        });
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
      const ctx = await carregarContextoDesligamentoVagasDoCliente(
        clienteId ?? contratoRow.cliente_id
      ).catch(() => ({
        cpfsDesligadosAdmin: new Set<string>(),
        cpfsComDemissionalAtivo: new Set<string>(),
      }));
      setDesligamento(ctx);
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
  }, [aprovacao.quantidade_colaboradores, orcamentoId, clienteId]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchDraft(indice: number, patch: Partial<ContratoVagaDraft>) {
    setDrafts((prev) =>
      prev.map((row) => {
        if (row.indice !== indice) return row;
        const next = { ...row, ...patch };
        const mudouPessoa =
          !("colaboradorOrigemId" in patch) &&
          (normalizeNomeOcupante(next.colaborador) !==
            normalizeNomeOcupante(row.colaborador) ||
            normalizeCpfDigits(next.colaboradorCpf) !==
              normalizeCpfDigits(row.colaboradorCpf) ||
            normalizeNomeOcupante(next.cargoNome) !==
              normalizeNomeOcupante(row.cargoNome));
        if (mudouPessoa) next.colaboradorOrigemId = null;
        return next;
      })
    );
  }

  async function lerColaboradoresDoCliente(
    idCliente: string
  ): Promise<ColaboradorListaCliente[]> {
    const res = await fetch(
      `/api/clientes/${encodeURIComponent(idCliente)}/colaboradores`,
      { cache: "no-store" }
    );
    const json = (await res.json().catch(() => ({}))) as {
      colaboradores?: ColaboradorListaCliente[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(json.error || "Não foi possível ler a lista de colaboradores.");
    }
    return json.colaboradores ?? [];
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
    const idClienteOcupacao = clienteId ?? contrato.cliente_id ?? "";
    if (!idClienteOcupacao) {
      const mensagem = "Este contrato não está vinculado a um cliente.";
      setAvisoListaTipo("erro");
      setAvisoListaCliente(mensagem);
      toast.error(mensagem);
      return;
    }
    try {
      const colaboradores = await lerColaboradoresDoCliente(idClienteOcupacao);
      const atuais = visiveis.map((row) => {
        const persistida = vagaByIndice.get(row.indice);
        return {
          indice: row.indice,
          id: persistida?.id ?? row.id,
          colaborador: persistida?.colaborador ?? null,
          colaboradorCpf: persistida?.colaborador_cpf ?? null,
          colaboradorOrigemId: persistida?.colaborador_origem ?? null,
          cargoNome: persistida?.cargo_nome ?? null,
          status: persistida?.status ?? "aberta",
          agendamentoId: persistida?.agendamento_id ?? null,
          periodicoFuturoId: persistida?.periodico_futuro_id ?? null,
          creditoAsoId: persistida?.credito_aso_id ?? null,
        };
      });
      const propostas = visiveis.map((row) => ({
        indice: row.indice,
        vagaId: row.id,
        colaborador: row.colaborador,
        colaboradorCpf: row.colaboradorCpf,
        colaboradorOrigemId: row.colaboradorOrigemId ?? null,
        cargoNome: row.cargoNome,
        manterAsoAberto: row.manterAsoAberto,
      }));
      const conflito = mensagemConflitoVinculoLista({
        atuais,
        propostas,
        pessoas: colaboradores,
      });
      const alteracaoDireta =
        conflito ??
        mensagemAlteracaoDiretaImplantacao({
          atuais,
          propostas,
          ativos: colaboradores,
        });
      const fora =
        alteracaoDireta ??
        mensagemOcupacaoForaDaEmpresa({
          atuais,
          propostas,
          ativos: colaboradores,
        });
      if (fora) {
        setAvisoListaTipo("erro");
        setAvisoListaCliente(fora);
        toast.error(fora);
        return;
      }
    } catch (err) {
      const mensagem = mensagemFalhaLista(err);
      setAvisoListaTipo("erro");
      setAvisoListaCliente(mensagem);
      toast.error(mensagem);
      return;
    }
    setError(null);
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
      setAvisoListaCliente(null);
      setDrafts(buildVagaDraftsIniciais(qtd, saved));
      const atualizada = await buscarAprovacaoPorOrcamentoId(orcamentoId);
      if (atualizada) onEtapaSalva(atualizada);
      toast.success("Lista de funcionários salva. Logo da empresa liberada.");
    } catch (err) {
      console.error(err);
      const message = mensagemFalhaLista(err);
      setError(message);
      if (
        message === MENSAGEM_CADASTRE_COLABORADOR ||
        message === MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO ||
        message === MENSAGEM_CONFLITO_LISTA_VAGAS
      ) {
        setAvisoListaTipo("erro");
        setAvisoListaCliente(message);
      }
      toast.error(message);
    } finally {
      setSavingLista(false);
    }
  }

  function montarVagasLista(qtd: number): VagaListaCliente[] {
    return drafts.slice(0, qtd).map((row) => {
      const persistida = vagaByIndice.get(row.indice);
      const sinais = {
        status: persistida?.status ?? "aberta",
        colaborador: persistida?.colaborador,
        colaboradorCpf: persistida?.colaborador_cpf,
        colaboradorOrigemId: persistida?.colaborador_origem,
        agendamentoId: persistida?.agendamento_id,
        periodicoFuturoId: persistida?.periodico_futuro_id,
        creditoAsoId: persistida?.credito_aso_id,
      };
      const residual = persistida ? vagaComprometidaResidual(sinais) : false;
      const status = persistida
        ? statusClassificacaoVaga(persistida, desligamento)
        : "aberta";
      const preenchida =
        isNomeFuncionarioReal(row.colaborador) ||
        normalizeCpfDigits(row.colaboradorCpf).length === 11 ||
        Boolean(String(row.colaboradorOrigemId ?? "").trim()) ||
        row.manterAsoAberto;
      const statusLista =
        residual && !preenchida
          ? "aberta"
          : preenchida && (status === "aberta" || residual)
            ? "comprometida"
            : status;
      return {
        indice: row.indice,
        vagaId: row.id ?? persistida?.id ?? null,
        status: statusLista,
        colaborador: row.colaborador,
        colaboradorCpf: row.colaboradorCpf,
        colaboradorOrigemId: row.colaboradorOrigemId ?? null,
        agendamentoId: persistida?.agendamento_id ?? null,
        periodicoFuturoId: persistida?.periodico_futuro_id ?? null,
        creditoAsoId: persistida?.credito_aso_id ?? null,
      };
    });
  }

  async function handleUsarListaCliente() {
    const idCliente = clienteId ?? contrato?.cliente_id ?? "";
    if (!idCliente) {
      const mensagem = "Este contrato não está vinculado a um cliente.";
      setAvisoListaTipo("erro");
      setAvisoListaCliente(mensagem);
      toast.error(mensagem);
      return;
    }
    const qtd = quantidadePrevista;
    setSavingLista(true);
    setAvisoListaCliente(null);
    try {
      const colaboradores = await lerColaboradoresDoCliente(idCliente);
      const resultado = avaliarUsoListaColaboradoresCliente({
        colaboradores,
        quantidadeContratada: qtd,
        vagas: montarVagasLista(qtd),
      });
      if (!resultado.ok) {
        setAvisoListaTipo("erro");
        setAvisoListaCliente(resultado.mensagem);
        toast.error(resultado.mensagem);
        return;
      }
      if (resultado.atribuicoes.length > 0) {
        setDrafts((prev) =>
          prev.map((row) => {
            const item = resultado.atribuicoes.find((atribuicao) =>
              atribuicao.vagaId && row.id
                ? atribuicao.vagaId === row.id
                : atribuicao.indice === row.indice
            );
            if (!item) return row;
            return {
              ...row,
              colaborador: normalizeNomeOcupante(item.nome),
              colaboradorCpf: item.cpfDigits,
              cargoNome: normalizeNomeOcupante(item.cargo),
              cargoId: null,
              manterAsoAberto: false,
              colaboradorOrigemId: item.origemId,
            };
          })
        );
      }
      if (resultado.mensagem) {
        setAvisoListaTipo("info");
        setAvisoListaCliente(resultado.mensagem);
        toast.success(resultado.mensagem);
        return;
      }
      setAvisoListaCliente(null);
      toast.success(
        "As vagas deste contrato já estão vinculadas a estes colaboradores."
      );
    } catch (err) {
      const mensagem =
        err instanceof Error
          ? err.message
          : "Não foi possível usar a lista de colaboradores.";
      setAvisoListaTipo("erro");
      setAvisoListaCliente(mensagem);
      toast.error(mensagem);
    } finally {
      setSavingLista(false);
    }
  }

  async function handleAbrirDefinir(indice: number) {
    const idCliente = clienteId ?? contrato?.cliente_id ?? "";
    if (!idCliente) {
      const mensagem = "Este contrato não está vinculado a um cliente.";
      setAvisoListaTipo("erro");
      setAvisoListaCliente(mensagem);
      toast.error(mensagem);
      return;
    }
    setCarregandoDefinir(true);
    setDefinirIndice(indice);
    setBuscaDefinir("");
    try {
      const colaboradores = await lerColaboradoresDoCliente(idCliente);
      setOpcoesDefinir(
        colaboradoresParaDefinirVaga({
          colaboradores,
          vagas: montarVagasLista(quantidadePrevista),
          indice,
        })
      );
    } catch (err) {
      setDefinirIndice(null);
      const mensagem =
        err instanceof Error
          ? err.message
          : "Não foi possível ler os colaboradores da empresa.";
      toast.error(mensagem);
    } finally {
      setCarregandoDefinir(false);
    }
  }

  function handleEscolherDefinir(pessoa: ColaboradorListaCliente) {
    if (definirIndice == null) return;
    const indice = definirIndice;
    patchDraft(indice, {
      colaborador: normalizeNomeOcupante(pessoa.nome),
      colaboradorCpf: pessoa.cpfDigits,
      cargoNome: normalizeNomeOcupante(
        pessoa.cargo === "—" ? "" : pessoa.cargo
      ),
      cargoId: null,
      manterAsoAberto: false,
      colaboradorOrigemId: origemDoColaboradorLista(pessoa),
    });
    setDefinirIndice(null);
    setBuscaDefinir("");
    const mensagem = `Vaga ${indice}: ${normalizeNomeOcupante(pessoa.nome)}. A seleção só é gravada ao clicar em Salvar lista.`;
    setAvisoListaTipo("info");
    setAvisoListaCliente(mensagem);
    toast.success(mensagem);
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

  async function handleConfirmRemoverFuncionario() {
    if (!removerFuncionario) return;
    setActionSaving(true);
    try {
      const atualizada = await liberarFuncionarioDaVagaComprometida({
        vagaId: removerFuncionario.vagaId,
        usuarioNome,
        numeroContrato: contrato?.numero ?? null,
      });
      setVagas((prev) =>
        prev.map((vaga) => (vaga.id === atualizada.id ? atualizada : vaga))
      );
      setDrafts((prev) =>
        prev.map((row) =>
          row.indice === removerFuncionario.indice
            ? draftAposRemoverFuncionario(row)
            : row
        )
      );
      const confirmacao = textoConfirmacaoLiberarVaga({
        temColaborador: removerFuncionario.temColaborador,
        nome: removerFuncionario.nome,
      });
      setRemoverFuncionario(null);
      toast.success(confirmacao.sucesso);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível remover o funcionário da vaga."
      );
    } finally {
      setActionSaving(false);
    }
  }

  const linhasVisuais = useMemo(
    () =>
      buildLinhasVisuaisListaFuncionarios(
        drafts.slice(0, quantidadePrevista),
        nomeSort
      ),
    [drafts, quantidadePrevista, nomeSort]
  );
  const termoDefinir = buscaDefinir.trim().toLocaleUpperCase("pt-BR");
  const termoCpfDefinir = buscaDefinir.replace(/\D/g, "");
  const opcoesFiltradas = opcoesDefinir.filter((pessoa) => {
    if (!termoDefinir) return true;
    const nome = pessoa.nome.toLocaleUpperCase("pt-BR");
    const cargo = (pessoa.cargo || "").toLocaleUpperCase("pt-BR");
    const cpf = pessoa.cpfDigits.replace(/\D/g, "");
    return (
      nome.includes(termoDefinir) ||
      cargo.includes(termoDefinir) ||
      (termoCpfDefinir.length > 0 && cpf.includes(termoCpfDefinir))
    );
  });

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
        Nome, CPF e cargo são somente leitura. Em uma vaga livre, use Definir
        colaborador ou Usar lista de colaboradores do cliente. A seleção só é
        gravada em Salvar lista. Cadastros e correções ficam em Clientes →
        Colaboradores, pelo botão Abrir Cliente.
      </div>

      {avisoListaCliente ? (
        <div
          className={
            avisoListaTipo === "info"
              ? "rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]"
              : "rounded-xl border border-[#fecaca] bg-[#fff5f5] px-4 py-3 text-sm text-[#9f1239]"
          }
        >
          {avisoListaCliente}
          {(avisoListaCliente === MENSAGEM_CADASTRE_COLABORADOR ||
            avisoListaCliente === MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO) &&
          onAbrirCliente ? (
            <button
              type="button"
              className="btn mt-3 text-xs"
              onClick={onAbrirCliente}
            >
              Abrir Cliente
            </button>
          ) : null}
          {avisoListaCliente === MENSAGEM_CONFLITO_LISTA_VAGAS ? (
            <button
              type="button"
              className="btn mt-3 text-xs"
              onClick={() => void load()}
            >
              Atualizar lista
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-primary text-xs"
          disabled={
            busy ||
            loading ||
            quantidadePrevista <= 0 ||
            (!clienteId && !contrato?.cliente_id)
          }
          title="Preencher as vagas com a lista de Clientes → Colaboradores"
          onClick={() => void handleUsarListaCliente()}
        >
          Usar lista de colaboradores do cliente
        </button>
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

      {!loading && linhasVisuais.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#e4ebf4] bg-white">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#f8fafc]">
              <tr>
                <th className="w-10 border-b px-2 py-2 font-bold text-navy">#</th>
                <th className="border-b px-2 py-2 font-bold text-navy">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-bold text-navy hover:text-brand-blue"
                    aria-label={
                      nomeSort === "asc"
                        ? "Ordenar nome Z–A"
                        : "Ordenar nome A–Z"
                    }
                    title={
                      nomeSort === "asc"
                        ? "Ordenado A–Z. Clique para Z–A."
                        : "Ordenado Z–A. Clique para A–Z."
                    }
                    onClick={() =>
                      setNomeSort((prev) => cycleListaFuncionariosNomeSort(prev))
                    }
                  >
                    Nome do funcionário
                    <span
                      className="text-[9px] leading-none text-brand-blue"
                      aria-hidden
                    >
                      {nomeSort === "asc" ? "▲" : "▼"}
                    </span>
                  </button>
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
              {linhasVisuais.map(({ numeroVisual, draft: row }) => {
                const persistida = vagaByIndice.get(row.indice);
                const statusPreview = resolveStatusListaFuncionarioPreview({
                  persistida,
                  draft: row,
                  desligamento,
                });
                const locked = vagaClassificacaoBloqueiaEdicaoOcupante(
                  statusPreview
                );
                const podeRemoverFuncionario = persistida
                  ? vagaPermiteRemoverFuncionario(persistida, desligamento)
                  : false;
                const sinaisLinha = {
                  status: persistida?.status ?? statusPreview,
                  colaborador: row.colaborador || persistida?.colaborador,
                  colaboradorCpf:
                    row.colaboradorCpf || persistida?.colaborador_cpf,
                  colaboradorOrigemId:
                    row.colaboradorOrigemId || persistida?.colaborador_origem,
                  agendamentoId: persistida?.agendamento_id,
                  periodicoFuturoId: persistida?.periodico_futuro_id,
                  creditoAsoId: persistida?.credito_aso_id,
                };
                const residual = persistida
                  ? vagaComprometidaResidual({
                      status: persistida.status,
                      colaborador: persistida.colaborador,
                      colaboradorCpf: persistida.colaborador_cpf,
                      colaboradorOrigemId: persistida.colaborador_origem,
                      agendamentoId: persistida.agendamento_id,
                      periodicoFuturoId: persistida.periodico_futuro_id,
                      creditoAsoId: persistida.credito_aso_id,
                    })
                  : false;
                const temColaborador = vagaTemColaboradorVinculado(sinaisLinha);
                const confirmacaoLinha = textoConfirmacaoLiberarVaga({
                  temColaborador,
                  nome:
                    normalizeNomeOcupante(row.colaborador) ||
                    normalizeNomeOcupante(persistida?.colaborador),
                });
                const motivoReserva = textoVinculoOuReservaVaga(sinaisLinha);
                const vazia =
                  !isNomeFuncionarioReal(row.colaborador) &&
                  normalizeCpfDigits(row.colaboradorCpf).length === 0;
                return (
                  <tr key={row.id ?? `indice-${row.indice}`} className="odd:bg-white even:bg-[#fbfdff]">
                    <td className="border-b border-[#eef2f7] px-2 py-1.5 font-bold tabular-nums text-navy">
                      {numeroVisual}
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-1">
                      <span
                        data-vaga-texto="nome"
                        className={`block min-h-8 px-2 py-1.5 text-xs ${
                          textoSomenteLeitura(row.colaborador) === "—"
                            ? "text-[#94a3b8]"
                            : "text-navy"
                        }`}
                      >
                        {textoSomenteLeitura(row.colaborador)}
                      </span>
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-1">
                      <span
                        data-vaga-texto="cpf"
                        className={`block min-h-8 px-2 py-1.5 text-xs ${
                          normalizeCpfDigits(row.colaboradorCpf).length === 0
                            ? "text-[#94a3b8]"
                            : "text-navy"
                        }`}
                      >
                        {normalizeCpfDigits(row.colaboradorCpf).length === 0
                          ? "—"
                          : maskCPFInput(row.colaboradorCpf)}
                      </span>
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-1">
                      <span
                        data-vaga-texto="cargo"
                        className={`block min-h-8 px-2 py-1.5 text-xs ${
                          textoSomenteLeitura(row.cargoNome) === "—"
                            ? "text-[#94a3b8]"
                            : "text-navy"
                        }`}
                      >
                        {textoSomenteLeitura(row.cargoNome)}
                      </span>
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={statusPreview} />
                        {motivoReserva ? (
                          <span className="text-[11px] font-medium text-[#64748b]">
                            {motivoReserva}
                          </span>
                        ) : null}
                        {persistida && podeRemoverFuncionario && !residual ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-red hover:underline disabled:opacity-50"
                            disabled={busy}
                            title={confirmacaoLinha.botao}
                            onClick={() =>
                              setRemoverFuncionario({
                                vagaId: persistida.id,
                                indice: row.indice,
                                nome:
                                  normalizeNomeOcupante(row.colaborador) ||
                                  normalizeNomeOcupante(persistida.colaborador) ||
                                  `Vaga ${row.indice}`,
                                temColaborador,
                              })
                            }
                          >
                            <IconTrash size={12} />
                            {confirmacaoLinha.botao}
                          </button>
                        ) : null}
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
                                colaboradorOrigemId: null,
                              })
                            }
                          >
                            {row.manterAsoAberto
                              ? "Desfazer ASO em aberto"
                              : "Manter ASO em aberto"}
                          </button>
                        ) : null}
                        {vagaListaRealmenteLivre({
                          indice: row.indice,
                          status: persistida?.status ?? "aberta",
                          colaborador: persistida?.colaborador ?? null,
                          colaboradorCpf: persistida?.colaborador_cpf ?? null,
                          colaboradorOrigemId: persistida?.colaborador_origem ?? null,
                          agendamentoId: persistida?.agendamento_id ?? null,
                          periodicoFuturoId: persistida?.periodico_futuro_id ?? null,
                          creditoAsoId: persistida?.credito_aso_id ?? null,
                        }) && !row.manterAsoAberto ? (
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-brand-blue hover:underline disabled:opacity-50"
                            disabled={busy || (!clienteId && !contrato?.cliente_id)}
                            onClick={() => void handleAbrirDefinir(row.indice)}
                          >
                            Definir colaborador
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      {definirIndice != null ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
            role="dialog"
            aria-labelledby="definir-colaborador-titulo"
          >
            <div className="border-b border-[#e4ebf4] px-4 py-3">
              <h3 id="definir-colaborador-titulo" className="text-sm font-bold text-navy">
                Definir colaborador da vaga {definirIndice}
              </h3>
              <p className="mt-1 text-xs text-[#64748b]">
                A seleção preenche só esta vaga e só é gravada ao clicar em Salvar lista.
              </p>
              <input
                className="field-input mt-3 h-9 px-3 text-sm"
                value={buscaDefinir}
                placeholder="Pesquisar nome, cargo ou CPF"
                onChange={(event) => setBuscaDefinir(event.target.value)}
              />
            </div>
            <div className="overflow-y-auto p-2">
              {carregandoDefinir ? (
                <p className="px-2 py-4 text-sm text-app-muted">
                  Carregando colaboradores ativos...
                </p>
              ) : null}
              {!carregandoDefinir && opcoesFiltradas.length === 0 ? (
                <p className="px-2 py-4 text-sm text-app-muted">
                  Nenhum colaborador ativo disponível.
                </p>
              ) : null}
              {!carregandoDefinir
                ? opcoesFiltradas.map((pessoa) => {
                    const cpf = normalizeCpfDigits(pessoa.cpfDigits);
                    return (
                      <button
                        key={origemDoColaboradorLista(pessoa)}
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left hover:bg-[#f8fafc]"
                        onClick={() => handleEscolherDefinir(pessoa)}
                      >
                        <span className="text-sm font-semibold text-navy">
                          {normalizeNomeOcupante(pessoa.nome)}
                        </span>
                        <span className="text-xs text-[#64748b]">
                          {normalizeNomeOcupante(
                            pessoa.cargo === "—" ? "" : pessoa.cargo
                          ) || "—"}
                          {" · "}
                          {cpf ? maskCPFInput(cpf) : "—"}
                        </span>
                      </button>
                    );
                  })
                : null}
            </div>
            <div className="border-t border-[#e4ebf4] px-4 py-3 text-right">
              <button
                type="button"
                className="btn text-xs"
                onClick={() => {
                  setDefinirIndice(null);
                  setBuscaDefinir("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <OrcamentoAnexoRemoverModal
        open={confirmOpen}
        titulo="Remover lista"
        mensagem="Tem certeza de que deseja remover a lista de funcionários anexada? As vagas preenchidas na tabela serão mantidas."
        saving={actionSaving}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirmRemover()}
      />
      <OrcamentoAnexoRemoverModal
        open={Boolean(removerFuncionario)}
        titulo={
          textoConfirmacaoLiberarVaga({
            temColaborador: removerFuncionario?.temColaborador === true,
            nome: removerFuncionario?.nome,
          }).titulo
        }
        mensagem={
          textoConfirmacaoLiberarVaga({
            temColaborador: removerFuncionario?.temColaborador === true,
            nome: removerFuncionario?.nome,
          }).mensagem
        }
        saving={actionSaving}
        cancelLabel="Cancelar"
        confirmLabel={
          textoConfirmacaoLiberarVaga({
            temColaborador: removerFuncionario?.temColaborador === true,
            nome: removerFuncionario?.nome,
          }).confirmLabel
        }
        onClose={() => {
          if (actionSaving) return;
          setRemoverFuncionario(null);
        }}
        onConfirm={() => void handleConfirmRemoverFuncionario()}
      />
    </div>
  );
}
