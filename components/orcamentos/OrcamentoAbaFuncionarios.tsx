"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { OrcamentoAnexoRemoverModal } from "@/components/orcamentos/OrcamentoAnexoRemoverModal";
import {
  OrcamentoArquivoPreview,
} from "@/components/orcamentos/OrcamentoEtapasExtras";
import {
  IconDownload,
  IconRefresh,
  IconTrash,
} from "@/components/ui/icons/OutlineIcons";
import { maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";
import {
  avaliarUsoListaColaboradoresCliente,
  mensagemBloqueioSalvarListaCliente,
  type ColaboradorListaCliente,
} from "@/lib/lista-colaboradores-contrato";
import {
  MENSAGEM_CADASTRE_COLABORADOR,
  mensagemOcupacaoForaDaEmpresa,
  planilhaTemPessoaForaDaEmpresa,
} from "@/lib/colaborador-vaga-ocupacao";
import { formatUppercaseInput } from "@/lib/text-normalize";
import {
  CONTRATO_VAGA_STATUS_DESLIGADO_ADMIN,
  CONTRATO_VAGA_STATUS_LABELS_CLASSIFICACAO,
  buildVagaDraftsIniciais,
  draftAposRemoverFuncionario,
  emptyVagaDraft,
  isNomeFuncionarioReal,
  normalizeNomeOcupante,
  validarDraftsListaVagas,
  vagaClassificacaoBloqueiaEdicaoOcupante,
  vagaPermiteCorrigirCargoOcupante,
  vagaPermiteCorrigirNomeOcupante,
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
  aplicarImportacaoNasVagas,
  downloadListaFuncionariosXlsx,
  downloadModeloListaFuncionariosXlsx,
  lerArquivoListaFuncionarios,
  mensagemExcessoVagasListaFuncionarios,
  resumirErrosImportacaoListaFuncionarios,
} from "@/lib/contrato-vagas-import";
import {
  buildLinhasVisuaisListaFuncionarios,
  buildListaFuncionariosExportRows,
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
import { listarCargosAtivos } from "@/services/cargo.service";
import { buscarAprovacaoPorOrcamentoId } from "@/services/orcamento-aprovacao.service";
import type { CargoRecord, ClienteContratoRecord } from "@/lib/types";

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

function focusCell(row: number, col: number) {
  const el = document.querySelector<HTMLElement>(
    `[data-vaga-cell="${row}-${col}"]`
  );
  el?.focus();
}

export function OrcamentoAbaFuncionarios({
  orcamentoId,
  orcamentoNumero,
  aprovacao,
  usuarioNome,
  clienteNome,
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
  const importInputRef = useRef<HTMLInputElement>(null);
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
  const [cargos, setCargos] = useState<CargoRecord[]>([]);
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
  const [listaClienteAplicada, setListaClienteAplicada] = useState(false);
  const [nomeSort, setNomeSort] = useState<ListaFuncionariosNomeSort>("asc");

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
      const [contratoRow, cargosAtivos] = await Promise.all([
        buscarContratoPorOrcamentoId(orcamentoId),
        listarCargosAtivos().catch(() => [] as CargoRecord[]),
      ]);
      setContrato(contratoRow);
      setCargos(cargosAtivos);
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
    const veioDaListaCliente =
      listaClienteAplicada ||
      visiveis.some((row) => String(row.colaboradorOrigemId ?? "").trim());
    if (veioDaListaCliente) {
      const idCliente = clienteId ?? contrato.cliente_id ?? "";
      if (!idCliente) {
        const mensagem = "Este contrato não está vinculado a um cliente.";
        setAvisoListaTipo("erro");
        setAvisoListaCliente(mensagem);
        toast.error(mensagem);
        return;
      }
      try {
        const colaboradores = await lerColaboradoresDoCliente(idCliente);
        const ativos = colaboradores.filter((item) => item.situacao === "ativo").length;
        const bloqueio = mensagemBloqueioSalvarListaCliente(ativos, qtd);
        if (bloqueio) {
          setAvisoListaTipo("erro");
          setAvisoListaCliente(bloqueio);
          toast.error(bloqueio);
          return;
        }
      } catch (err) {
        const mensagem =
          err instanceof Error
            ? err.message
            : "Não foi possível conferir a lista de colaboradores.";
        setAvisoListaTipo("erro");
        setAvisoListaCliente(mensagem);
        toast.error(mensagem);
        return;
      }
    }
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
      const fora = mensagemOcupacaoForaDaEmpresa({
        atuais: visiveis.map((row) => {
          const persistida = vagaByIndice.get(row.indice);
          return {
            indice: row.indice,
            colaborador: persistida?.colaborador ?? null,
            colaboradorCpf: persistida?.colaborador_cpf ?? null,
            colaboradorOrigemId: persistida?.colaborador_origem ?? null,
          };
        }),
        propostas: visiveis.map((row) => ({
          indice: row.indice,
          colaborador: row.colaborador,
          colaboradorCpf: row.colaboradorCpf,
          colaboradorOrigemId: row.colaboradorOrigemId ?? null,
        })),
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
      if (message === MENSAGEM_CADASTRE_COLABORADOR) {
        setAvisoListaTipo("erro");
        setAvisoListaCliente(message);
      }
      toast.error(message);
    } finally {
      setSavingLista(false);
    }
  }

  async function handleImportar(selected: File | null) {
    if (!selected) return;
    const parsed = await lerArquivoListaFuncionarios(selected);
    if (!parsed.ok) {
      const detalhe =
        parsed.errosLinha.length > 0
          ? resumirErrosImportacaoListaFuncionarios(parsed.errosLinha)
          : parsed.error || "Não foi possível importar a lista.";
      toast.error(detalhe);
      return;
    }

    const qtd = quantidadePrevista;
    if (parsed.rows.length > qtd) {
      toast.error(
        mensagemExcessoVagasListaFuncionarios(qtd, parsed.rows.length)
      );
      return;
    }

    const temPreenchido = drafts.slice(0, qtd).some(
      (row) =>
        isNomeFuncionarioReal(row.colaborador) ||
        normalizeCpfDigits(row.colaboradorCpf).length === 11 ||
        row.manterAsoAberto
    );
    let sobrescrever = false;
    if (temPreenchido) {
      const ok = window.confirm(
        "Já existem vagas preenchidas. Deseja substituir os dados atuais pelos da planilha? As vagas já agendadas ou programadas não serão alteradas."
      );
      if (!ok) {
        const onlyEmpty = window.confirm(
          "Importar apenas para as vagas ainda em aberto, sem sobrescrever o que já foi preenchido?"
        );
        if (!onlyEmpty) return;
        sobrescrever = false;
      } else {
        sobrescrever = true;
      }
    }

    const idClienteImportacao = clienteId ?? contrato?.cliente_id ?? "";
    if (!idClienteImportacao) {
      const mensagem = "Este contrato não está vinculado a um cliente.";
      setAvisoListaTipo("erro");
      setAvisoListaCliente(mensagem);
      toast.error(mensagem);
      return;
    }
    let ativosImportacao: ColaboradorListaCliente[] = [];
    try {
      const colaboradores = await lerColaboradoresDoCliente(idClienteImportacao);
      ativosImportacao = colaboradores.filter((item) => item.situacao === "ativo");
    } catch (err) {
      const mensagem = mensagemFalhaLista(err);
      setAvisoListaTipo("erro");
      setAvisoListaCliente(mensagem);
      toast.error(mensagem);
      return;
    }
    if (planilhaTemPessoaForaDaEmpresa(parsed.rows, ativosImportacao)) {
      setAvisoListaTipo("erro");
      setAvisoListaCliente(MENSAGEM_CADASTRE_COLABORADOR);
      toast.error(MENSAGEM_CADASTRE_COLABORADOR);
      return;
    }

    const locked = new Set(
      vagas
        .filter((v) =>
          vagaClassificacaoBloqueiaEdicaoOcupante(
            statusClassificacaoVaga(v, desligamento)
          )
        )
        .map((v) => v.indice)
    );
    const atuaisEditaveis = drafts.map((row) =>
      locked.has(row.indice) ? row : row
    );
    const result = aplicarImportacaoNasVagas({
      atuais: atuaisEditaveis.map((row) =>
        locked.has(row.indice)
          ? row
          : sobrescrever
            ? {
                ...row,
                colaborador: "",
                colaboradorCpf: "",
                cargoNome: "",
                cargoId: null,
                manterAsoAberto: false,
              }
            : row
      ),
      importados: parsed.rows,
      quantidadePrevista: qtd,
      sobrescreverPreenchidas: sobrescrever,
      cargos,
    });
    const anterior = new Map(drafts.map((row) => [row.indice, row]));
    setDrafts(
      result.drafts.map((row) => {
        const prev = anterior.get(row.indice);
        if (locked.has(row.indice)) return prev ?? row;
        const mudou =
          !prev ||
          prev.colaborador !== row.colaborador ||
          prev.colaboradorCpf !== row.colaboradorCpf ||
          prev.cargoNome !== row.cargoNome;
        const cpf = normalizeCpfDigits(row.colaboradorCpf);
        const ativo = ativosImportacao.find((item) => item.cpfDigits === cpf);
        return {
          ...row,
          colaboradorOrigemId: ativo
            ? ativo.cadastroId || ativo.id
            : mudou
              ? null
              : prev?.colaboradorOrigemId ?? null,
        };
      })
    );
    if (result.aplicados > 0) setListaClienteAplicada(false);
    toast.success(
      result.aplicados === 1
        ? "1 funcionário importado para a tabela. Revise e clique em Salvar lista."
        : `${result.aplicados} funcionários importados para a tabela. Revise e clique em Salvar lista.`
    );
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
        vagas: drafts.slice(0, qtd).map((row) => {
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
            row.manterAsoAberto;
          const statusLista =
            residual && !preenchida
              ? "aberta"
              : preenchida && (status === "aberta" || residual)
                ? "comprometida"
                : status;
          return {
            indice: row.indice,
            status: statusLista,
            colaborador: row.colaborador,
            colaboradorCpf: row.colaboradorCpf,
            colaboradorOrigemId: row.colaboradorOrigemId ?? null,
            agendamentoId: persistida?.agendamento_id ?? null,
            periodicoFuturoId: persistida?.periodico_futuro_id ?? null,
            creditoAsoId: persistida?.credito_aso_id ?? null,
          };
        }),
      });
      if (!resultado.ok) {
        setAvisoListaTipo("erro");
        setAvisoListaCliente(resultado.mensagem);
        toast.error(resultado.mensagem);
        return;
      }
      if (resultado.atribuicoes.length > 0) {
        const porIndice = new Map(
          resultado.atribuicoes.map((item) => [item.indice, item])
        );
        setDrafts((prev) =>
          prev.map((row) => {
            const item = porIndice.get(row.indice);
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
      setListaClienteAplicada(true);
      if (resultado.omitidos > 0 && resultado.mensagem) {
        setAvisoListaTipo("info");
        setAvisoListaCliente(resultado.mensagem);
        toast.success(resultado.mensagem);
        return;
      }
      setAvisoListaCliente(null);
      toast.success(
        resultado.atribuicoes.length === 0
          ? resultado.mensagem ??
              "As vagas deste contrato já estão vinculadas a estes colaboradores."
          : "Lista do cliente aplicada nas vagas livres. Revise e clique em Salvar lista."
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

  function handleBaixarModelo() {
    try {
      downloadModeloListaFuncionariosXlsx({
        quantidadePrevista,
        numeroOrcamento: orcamentoNumero ?? contrato?.numero ?? null,
      });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível baixar o modelo Excel.");
    }
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

  function handleExportarLista() {
    try {
      const rows = buildListaFuncionariosExportRows({
        linhas: linhasVisuais,
        vagaByIndice,
        desligamento,
      });
      downloadListaFuncionariosXlsx({
        rows,
        clienteNome,
      });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível exportar a lista.");
    }
  }

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
        Preencha a vaga com um colaborador que já está ativo em Clientes →
        Colaboradores. Para incluir alguém novo, cadastre primeiro na empresa.
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
          {avisoListaCliente === MENSAGEM_CADASTRE_COLABORADOR && onAbrirCliente ? (
            <button
              type="button"
              className="btn mt-3 text-xs"
              onClick={onAbrirCliente}
            >
              Abrir Cliente
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
        <button
          type="button"
          className="btn btn-muted inline-flex items-center gap-1.5 text-xs"
          disabled={busy || loading || quantidadePrevista <= 0}
          title="Baixar planilha modelo para preencher e importar"
          onClick={handleBaixarModelo}
        >
          <IconDownload size={14} />
          Baixar modelo Excel
        </button>
        <button
          type="button"
          className="btn btn-muted text-xs"
          disabled={busy || loading}
          onClick={() => importInputRef.current?.click()}
        >
          Importar lista
        </button>
        <button
          type="button"
          className="btn btn-muted inline-flex items-center gap-1.5 text-xs"
          disabled={busy || loading || quantidadePrevista <= 0}
          title="Exportar a lista de funcionários atualmente exibida"
          onClick={handleExportarLista}
        >
          <IconDownload size={14} />
          Exportar lista
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            e.target.value = "";
            void handleImportar(selected);
          }}
        />
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
              {linhasVisuais.map(({ numeroVisual, draft: row }, rowIdx) => {
                const persistida = vagaByIndice.get(row.indice);
                const statusPreview = resolveStatusListaFuncionarioPreview({
                  persistida,
                  draft: row,
                  desligamento,
                });
                const locked = vagaClassificacaoBloqueiaEdicaoOcupante(
                  statusPreview
                );
                const nomeBloqueado =
                  !vagaPermiteCorrigirNomeOcupante(statusPreview);
                const cargoBloqueado =
                  locked && !vagaPermiteCorrigirCargoOcupante(statusPreview);
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
                      <input
                        data-vaga-cell={`${rowIdx}-0`}
                        className="field-input h-8 px-2 text-xs"
                        value={formatUppercaseInput(row.colaborador)}
                        disabled={busy || nomeBloqueado}
                        placeholder={nomeBloqueado ? undefined : "Nome"}
                        title={
                          nomeBloqueado
                            ? statusPreview === "desligado_admin"
                              ? "Vaga consumida por desligamento administrativo. Não é possível atribuir outro funcionário."
                              : "Não é possível editar após o agendamento vinculado. Altere pelo agendamento, se necessário."
                            : undefined
                        }
                        onChange={(e) =>
                          patchDraft(row.indice, {
                            colaborador: formatUppercaseInput(e.target.value),
                            manterAsoAberto: false,
                          })
                        }
                        onBlur={() =>
                          patchDraft(row.indice, {
                            colaborador: normalizeNomeOcupante(row.colaborador),
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusCell(rowIdx + 1, 0);
                          }
                        }}
                      />
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-1">
                      <input
                        data-vaga-cell={`${rowIdx}-1`}
                        className="field-input h-8 px-2 text-xs"
                        value={maskCPFInput(row.colaboradorCpf)}
                        disabled={busy || locked}
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        title={
                          locked
                            ? "CPF bloqueado: vaga já agendada ou programada."
                            : undefined
                        }
                        onChange={(e) =>
                          patchDraft(row.indice, {
                            colaboradorCpf: maskCPFInput(e.target.value),
                            manterAsoAberto: false,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusCell(rowIdx + 1, 1);
                          }
                        }}
                      />
                    </td>
                    <td className="border-b border-[#eef2f7] px-2 py-1">
                      <input
                        data-vaga-cell={`${rowIdx}-2`}
                        className="field-input h-8 px-2 text-xs"
                        list="contrato-vagas-cargos"
                        value={formatUppercaseInput(row.cargoNome)}
                        disabled={busy || cargoBloqueado}
                        placeholder="Cargo"
                        title={
                          statusPreview === CONTRATO_VAGA_STATUS_DESLIGADO_ADMIN
                            ? "Desligamento administrativo não permite alterar o cargo por aqui."
                            : vagaPermiteCorrigirCargoOcupante(statusPreview)
                              ? "Corrige só o cargo. CPF, ocupante, exames e status permanecem."
                              : undefined
                        }
                        onChange={(e) => {
                          const nome = formatUppercaseInput(e.target.value);
                          const found = cargos.find(
                            (c) =>
                              normalizeNomeOcupante(c.nome) ===
                              normalizeNomeOcupante(nome)
                          );
                          patchDraft(row.indice, {
                            cargoNome: nome,
                            cargoId: found?.id ?? null,
                          });
                        }}
                        onBlur={() => {
                          const cargoNome = normalizeNomeOcupante(row.cargoNome);
                          const found = cargos.find(
                            (c) => normalizeNomeOcupante(c.nome) === cargoNome
                          );
                          patchDraft(row.indice, {
                            cargoNome,
                            cargoId: found?.id ?? null,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusCell(rowIdx + 1, 2);
                          }
                        }}
                      />
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
                              })
                            }
                          >
                            {row.manterAsoAberto
                              ? "Desfazer ASO em aberto"
                              : "Manter ASO em aberto"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <datalist id="contrato-vagas-cargos">
            {cargos.map((c) => (
              <option key={c.id} value={c.nome} />
            ))}
          </datalist>
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
