"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { NavarroLogo } from "@/components/layout/NavarroLogo";
import { Field, RequiredMark } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { MENSAGEM_VALIDACAO_GENERICA } from "@/lib/avaliacao-constantes";
import {
  AVALIACAO_DEMO_CAMPANHA_NOME,
  AVALIACAO_DEMO_EMPRESA,
  AVALIACAO_DEMO_PARTICIPANTE_NOME,
  isAvaliacaoDemoCodigo,
} from "@/lib/avaliacao-demo";
import {
  TERMO_COMPLETO_PARAGRAPHOS,
  TERMO_RESUMO_ITENS,
  TERMO_TITULO,
} from "@/lib/avaliacao-termos-navarro";
import {
  buildCopsoqFlow,
  getOpcoesEscala,
  type CopsoqFlowItem,
} from "@/lib/copsoq-ii-br";
import { isValidCPF, maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";
import {
  maskDataNascimentoInput,
  parseDataNascimentoBr,
} from "@/lib/date-br";

type Step =
  | "landing"
  | "identificacao"
  | "termos"
  | "orientacoes"
  | "questionario"
  | "final";

interface AvaliacaoPortalProps {
  codigo: string;
}

const { items: FLOW_ITEMS, totalPerguntas: TOTAL_PERGUNTAS } = buildCopsoqFlow();

export function AvaliacaoPortal({ codigo }: AvaliacaoPortalProps) {
  const codigoDisplay = codigo.trim().toUpperCase() || "";
  // Modo DEMO exclusivo para validação de UI/UX. Não utilizar para campanhas reais.
  const isDemo = isAvaliacaoDemoCodigo(codigoDisplay);
  const [step, setStep] = useState<Step>("landing");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [flowIndex, setFlowIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [empresaNome, setEmpresaNome] = useState(
    isDemo ? AVALIACAO_DEMO_EMPRESA : "Carregando…"
  );
  const [campanhaNome, setCampanhaNome] = useState(
    isDemo
      ? AVALIACAO_DEMO_CAMPANHA_NOME
      : "Pesquisa de Riscos Psicossociais"
  );
  const [disponivel, setDisponivel] = useState<boolean | null>(
    isDemo ? true : null
  );
  const [infoError, setInfoError] = useState<string | null>(null);
  const [validando, setValidando] = useState(false);
  const [erroIdentificacao, setErroIdentificacao] = useState<string | null>(
    null
  );
  const [participanteNome, setParticipanteNome] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const itemAtual = FLOW_ITEMS[flowIndex] ?? FLOW_ITEMS[0];

  const progresso = useMemo(() => {
    if (!itemAtual) {
      return { pct: 0, numero: 1, dimensaoNome: "" };
    }
    if (itemAtual.type === "pergunta") {
      return {
        pct: Math.round((itemAtual.numero / TOTAL_PERGUNTAS) * 100),
        numero: itemAtual.numero,
        dimensaoNome: itemAtual.dimensao.nome,
      };
    }
    const num = Math.min(
      itemAtual.primeiraPerguntaIndex + 1,
      TOTAL_PERGUNTAS
    );
    return {
      pct: Math.round((num / TOTAL_PERGUNTAS) * 100),
      numero: num,
      dimensaoNome: itemAtual.dimensao.nome,
    };
  }, [itemAtual]);

  const carregarInfo = useCallback(async () => {
    if (!codigoDisplay) {
      setInfoError("Campanha inválida.");
      setDisponivel(false);
      return;
    }

    // Modo DEMO exclusivo para validação de UI/UX. Não utilizar para campanhas reais.
    if (isAvaliacaoDemoCodigo(codigoDisplay)) {
      setEmpresaNome(AVALIACAO_DEMO_EMPRESA);
      setCampanhaNome(AVALIACAO_DEMO_CAMPANHA_NOME);
      setDisponivel(true);
      setInfoError(null);
      return;
    }

    try {
      const res = await fetch(`/api/avaliacao/${codigoDisplay}/info`);
      const json = (await res.json()) as {
        ok?: boolean;
        empresaNome?: string;
        campanhaNome?: string;
        disponivel?: boolean;
      };
      if (!res.ok || !json.ok) {
        setInfoError("Campanha não encontrada.");
        setDisponivel(false);
        setEmpresaNome("—");
        return;
      }
      setEmpresaNome(json.empresaNome || "—");
      setCampanhaNome(json.campanhaNome || "Pesquisa de Riscos Psicossociais");
      setDisponivel(Boolean(json.disponivel));
      setInfoError(
        json.disponivel
          ? null
          : "Esta pesquisa não está disponível no momento."
      );
    } catch {
      setInfoError("Não foi possível carregar a campanha.");
      setDisponivel(false);
    }
  }, [codigoDisplay]);

  const carregarSessao = useCallback(async () => {
    if (!codigoDisplay) return;
    // Modo DEMO exclusivo para validação de UI/UX. Não utilizar para campanhas reais.
    if (isAvaliacaoDemoCodigo(codigoDisplay)) return;

    try {
      const res = await fetch(
        `/api/avaliacao/sessao?codigoPublico=${encodeURIComponent(codigoDisplay)}`
      );
      const json = (await res.json()) as {
        ok?: boolean;
        autenticado?: boolean;
        empresaNome?: string;
        participanteNome?: string;
      };
      if (res.status === 403) {
        setAutenticado(false);
        return;
      }
      if (json.ok && json.autenticado) {
        setAutenticado(true);
        setEmpresaNome(json.empresaNome || empresaNome);
        setParticipanteNome(json.participanteNome || "");
        setStep((atual) =>
          atual === "landing" || atual === "identificacao" ? "termos" : atual
        );
      }
    } catch {
      // ignora
    }
  }, [codigoDisplay, empresaNome]);

  useEffect(() => {
    void carregarInfo();
    void carregarSessao();
  }, [carregarInfo, carregarSessao]);

  function goFlow(nextIndex: number) {
    setFlowIndex(nextIndex);
    setAnimKey((k) => k + 1);
  }

  async function handleValidar() {
    setErroIdentificacao(null);
    const digits = normalizeCpfDigits(cpf);
    const nascIso = parseDataNascimentoBr(dataNascimento);

    // Modo DEMO exclusivo para validação de UI/UX. Não utilizar para campanhas reais.
    if (isDemo) {
      if (!isValidCPF(digits) || !nascIso) {
        setErroIdentificacao(MENSAGEM_VALIDACAO_GENERICA);
        return;
      }
      setValidando(true);
      await new Promise((r) => setTimeout(r, 250));
      setAutenticado(true);
      setEmpresaNome(AVALIACAO_DEMO_EMPRESA);
      setParticipanteNome(AVALIACAO_DEMO_PARTICIPANTE_NOME);
      setTermosAceitos(false);
      setStep("termos");
      setValidando(false);
      return;
    }

    if (!isValidCPF(digits) || !nascIso) {
      setErroIdentificacao(MENSAGEM_VALIDACAO_GENERICA);
      return;
    }

    setValidando(true);
    try {
      const res = await fetch("/api/avaliacao/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigoPublico: codigoDisplay,
          cpf: digits,
          dataNascimento: nascIso,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        empresaNome?: string;
        participanteNome?: string;
      };
      if (!res.ok || !json.ok) {
        setErroIdentificacao(json.error || MENSAGEM_VALIDACAO_GENERICA);
        setAutenticado(false);
        return;
      }
      setAutenticado(true);
      setEmpresaNome(json.empresaNome || empresaNome);
      setParticipanteNome(json.participanteNome || "");
      setTermosAceitos(false);
      setStep("termos");
    } catch {
      setErroIdentificacao(MENSAGEM_VALIDACAO_GENERICA);
    } finally {
      setValidando(false);
    }
  }

  async function handleIniciarQuestionario() {
    if (!isDemo) {
      try {
        await fetch("/api/avaliacao/iniciar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigoPublico: codigoDisplay }),
        });
      } catch {
        // protótipo
      }
    }
    setFlowIndex(0);
    setAnimKey((k) => k + 1);
    setStep("questionario");
  }

  function handleProximaFlow() {
    const atual = FLOW_ITEMS[flowIndex];
    if (!atual) return;

    if (atual.type === "pergunta") {
      if (!respostas[atual.pergunta.id]) return;
    }

    if (flowIndex >= FLOW_ITEMS.length - 1) {
      setStep("final");
      return;
    }
    goFlow(flowIndex + 1);
  }

  function handleAnteriorFlow() {
    if (flowIndex <= 0) return;
    goFlow(flowIndex - 1);
  }

  async function handleEncerrar() {
    if (!isDemo) {
      try {
        await fetch("/api/avaliacao/logout", { method: "POST" });
      } catch {
        // ignore
      }
    }
    setAutenticado(false);
    setTermosAceitos(false);
    setStep("landing");
    setFlowIndex(0);
    setRespostas({});
    setCpf("");
    setDataNascimento("");
    setParticipanteNome("");
  }

  const podeIniciar = disponivel === true && !infoError;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden overflow-y-auto px-3 py-8 sm:px-4 sm:py-14">
      <PortalBackground />

      <div className="relative z-10 w-full max-w-[560px]">
        <div className="mb-5 flex flex-col items-center text-center sm:mb-6">
          <div className="mb-4 rounded-[20px] border border-white/10 bg-white px-6 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)] sm:mb-5 sm:px-8 sm:py-5">
            <NavarroLogo priority size="hero" />
          </div>
        </div>

        <div className="rounded-[26px] border border-white/20 bg-white/[0.97] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-8">
          {step === "landing" ? (
            <LandingStep
              empresaNome={empresaNome}
              campanhaNome={campanhaNome}
              codigoDisplay={codigoDisplay}
              disponivel={podeIniciar}
              mensagem={infoError}
              totalPerguntas={TOTAL_PERGUNTAS}
              isDemo={isDemo}
              onStart={() => setStep("identificacao")}
            />
          ) : null}

          {step === "identificacao" ? (
            <IdentificacaoStep
              cpf={cpf}
              dataNascimento={dataNascimento}
              erro={erroIdentificacao}
              loading={validando}
              isDemo={isDemo}
              onCpfChange={setCpf}
              onDataNascimentoChange={setDataNascimento}
              onBack={() => setStep("landing")}
              onContinue={() => void handleValidar()}
            />
          ) : null}

          {step === "termos" ? (
            <TermosStep
              participanteNome={participanteNome}
              aceito={termosAceitos}
              onAceitoChange={setTermosAceitos}
              onBack={() => setStep("identificacao")}
              onContinue={() => setStep("orientacoes")}
            />
          ) : null}

          {step === "orientacoes" ? (
            <OrientacoesStep
              totalPerguntas={TOTAL_PERGUNTAS}
              onBack={() => setStep("termos")}
              onStart={() => void handleIniciarQuestionario()}
            />
          ) : null}

          {step === "questionario" && itemAtual ? (
            <div
              key={animKey}
              className="avaliacao-step-enter"
            >
              {itemAtual.type === "transicao" ? (
                <TransicaoStep
                  progresso={progresso}
                  totalPerguntas={TOTAL_PERGUNTAS}
                  texto={itemAtual.dimensao.textoTransicao}
                  dimensaoNome={itemAtual.dimensao.nome}
                  podeVoltar={flowIndex > 0}
                  onAnterior={handleAnteriorFlow}
                  onProxima={handleProximaFlow}
                />
              ) : (
                <PerguntaStep
                  item={itemAtual}
                  progresso={progresso}
                  totalPerguntas={TOTAL_PERGUNTAS}
                  selecionada={respostas[itemAtual.pergunta.id] ?? ""}
                  isUltima={flowIndex >= FLOW_ITEMS.length - 1}
                  podeVoltar={flowIndex > 0}
                  onSelect={(valor) =>
                    setRespostas((prev) => ({
                      ...prev,
                      [itemAtual.pergunta.id]: valor,
                    }))
                  }
                  onAnterior={handleAnteriorFlow}
                  onProxima={handleProximaFlow}
                />
              )}
            </div>
          ) : null}

          {step === "final" ? (
            <FinalStep onFinish={() => void handleEncerrar()} />
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs font-medium text-white/40">
          Navarro Engenharia · Portal do Colaborador · Campanha {codigoDisplay}
        </p>
      </div>
    </div>
  );
}

function PortalBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#041024] via-[#0b1f4d] to-[#0d2a5c]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(79,99,255,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(56,189,248,0.08),transparent_50%)]" />
    </div>
  );
}

function ProgressHeader({
  pct,
  numero,
  total,
  dimensaoNome,
}: {
  pct: number;
  numero: number;
  total: number;
  dimensaoNome: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-[#64748b]">
            Pergunta {numero} de {total}
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-blue">
            {dimensaoNome}
          </p>
        </div>
        <p className="shrink-0 text-sm font-extrabold tabular-nums text-navy">
          {pct}%
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-blue to-[#6b7cff] transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

function LandingStep({
  empresaNome,
  campanhaNome,
  codigoDisplay,
  disponivel,
  mensagem,
  totalPerguntas,
  isDemo,
  onStart,
}: {
  empresaNome: string;
  campanhaNome: string;
  codigoDisplay: string;
  disponivel: boolean;
  mensagem: string | null;
  totalPerguntas: number;
  isDemo: boolean;
  onStart: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
          Avaliação psicossocial · COPSOQ II-Br
        </p>
        <h1 className="mt-1 text-xl font-extrabold tracking-[-0.3px] text-navy sm:text-2xl">
          {campanhaNome}
        </h1>
        <p className="mt-2 text-sm font-semibold text-[#475569]">{empresaNome}</p>
        <p className="mt-1 text-[11px] text-[#94a3b8]">
          Código da campanha:{" "}
          <span className="font-mono font-bold text-brand-blue">
            {codigoDisplay}
          </span>
        </p>
        {isDemo ? (
          <p className="mt-2 inline-flex rounded-full bg-brand-blue-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-blue">
            Modo demonstração · UI/UX
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-4 text-left text-sm text-[#475569]">
        <p>
          Leva poucos minutos e suas respostas são{" "}
          <span className="font-semibold text-navy">confidenciais</span>. Os
          resultados apoiam ações de saúde e segurança no trabalho.
        </p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-[#eef2f7] bg-white px-3 py-2">
            <dt className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Tempo estimado
            </dt>
            <dd className="mt-0.5 font-extrabold text-navy">8 a 12 minutos</dd>
          </div>
          <div className="rounded-xl border border-[#eef2f7] bg-white px-3 py-2">
            <dt className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Perguntas
            </dt>
            <dd className="mt-0.5 font-extrabold text-navy">{totalPerguntas}</dd>
          </div>
        </dl>
      </div>

      {mensagem ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {mensagem}
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary min-h-[52px] w-full justify-center py-3.5 text-[15px]"
        disabled={!disponivel}
        onClick={onStart}
      >
        Iniciar pesquisa
      </button>
    </div>
  );
}

function IdentificacaoStep({
  cpf,
  dataNascimento,
  erro,
  loading,
  isDemo,
  onCpfChange,
  onDataNascimentoChange,
  onBack,
  onContinue,
}: {
  cpf: string;
  dataNascimento: string;
  erro: string | null;
  loading: boolean;
  isDemo: boolean;
  onCpfChange: (v: string) => void;
  onDataNascimentoChange: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-extrabold text-navy">Identificação</h2>
        <p className="mt-1 text-sm text-[#64748b]">
          {isDemo
            ? "Demonstração: informe um CPF válido e qualquer data de nascimento válida (DD/MM/AAAA)."
            : "Informe seu CPF e sua data de nascimento para acessar a pesquisa."}
        </p>
      </div>

      <div className="space-y-3">
        <Field
          label={
            <>
              CPF <RequiredMark />
            </>
          }
        >
          <input
            className="field-input min-h-[48px] w-full text-base"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => onCpfChange(maskCPFInput(e.target.value))}
          />
        </Field>
        <Field
          label={
            <>
              Data de nascimento <RequiredMark />
            </>
          }
        >
          <input
            className="field-input min-h-[48px] w-full text-base"
            inputMode="numeric"
            autoComplete="bday"
            placeholder="DD/MM/AAAA"
            value={dataNascimento}
            onChange={(e) =>
              onDataNascimentoChange(maskDataNascimentoInput(e.target.value))
            }
          />
        </Field>
      </div>

      {erro ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erro}
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          className="btn min-h-[52px] justify-center text-[15px] sm:flex-1"
          disabled={loading}
          onClick={onBack}
        >
          Voltar
        </button>
        <button
          type="button"
          className="btn btn-primary min-h-[52px] justify-center text-[15px] sm:flex-1"
          disabled={loading}
          onClick={onContinue}
        >
          {loading ? "Validando…" : "Continuar"}
        </button>
      </div>
    </div>
  );
}

function TermosStep({
  participanteNome,
  aceito,
  onAceitoChange,
  onBack,
  onContinue,
}: {
  participanteNome: string;
  aceito: boolean;
  onAceitoChange: (v: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const primeiroNome = participanteNome.trim().split(/\s+/)[0];

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-extrabold text-navy">
          Termos de ciência e consentimento
        </h2>
        <p className="mt-1 text-sm text-[#64748b]">
          {primeiroNome ? `${primeiroNome}, a` : "A"}o continuar você declara
          ter lido e aceito os termos desta avaliação.
        </p>
      </div>

      <ul className="space-y-2.5 rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-4">
        {TERMO_RESUMO_ITENS.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-[#334155]">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-green-soft text-[11px] font-extrabold text-brand-green">
              ✓
            </span>
            <span className="font-semibold text-navy">{item}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="w-full text-center text-sm font-bold text-brand-blue underline-offset-2 hover:underline"
        onClick={() => setModalAberto(true)}
      >
        Ler termo completo
      </button>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e8edf5] bg-white px-4 py-3.5">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 rounded border-[#cbd5e1] text-brand-blue focus:ring-brand-blue/30"
          checked={aceito}
          onChange={(e) => onAceitoChange(e.target.checked)}
        />
        <span className="text-sm font-medium text-[#475569]">
          Li e aceito o Termo de Ciência e Consentimento da Navarro Engenharia.
        </span>
      </label>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          className="btn min-h-[52px] justify-center text-[15px] sm:flex-1"
          onClick={onBack}
        >
          Voltar
        </button>
        <button
          type="button"
          className="btn btn-primary min-h-[52px] justify-center text-[15px] sm:flex-1"
          disabled={!aceito}
          onClick={onContinue}
        >
          Continuar
        </button>
      </div>

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={TERMO_TITULO}
        size="wide"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-primary min-h-[44px] px-6"
              onClick={() => setModalAberto(false)}
            >
              Fechar
            </button>
          </div>
        }
      >
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1 text-sm leading-relaxed text-[#475569]">
          {TERMO_COMPLETO_PARAGRAPHOS.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function OrientacoesStep({
  totalPerguntas,
  onBack,
  onStart,
}: {
  totalPerguntas: number;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-navy">Bem-vindo!</h2>
        <p className="mt-2 text-sm text-[#64748b]">
          Antes de começar, confira as orientações da pesquisa.
        </p>
      </div>

      <ul className="space-y-3 rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-4 text-sm text-[#475569]">
        <OrientacaoItem titulo="Objetivo">
          Mapear fatores psicossociais no trabalho com o instrumento{" "}
          <span className="font-semibold text-navy">COPSOQ II-Br</span>, para
          apoiar melhorias no ambiente laboral.
        </OrientacaoItem>
        <OrientacaoItem titulo="Tempo médio">
          Cerca de 8 a 12 minutos.
        </OrientacaoItem>
        <OrientacaoItem titulo="Quantidade de perguntas">
          {totalPerguntas} perguntas, organizadas por dimensões (Demandas,
          Liderança, Saúde e Bem-estar, entre outras).
        </OrientacaoItem>
        <OrientacaoItem titulo="Confidencialidade">
          Suas respostas individuais não serão divulgadas a gestores. Apenas
          resultados consolidados.
        </OrientacaoItem>
        <OrientacaoItem titulo="Navegação">
          Você pode voltar e alterar respostas enquanto não finalizar.
        </OrientacaoItem>
        <OrientacaoItem titulo="Após concluir">
          Não será possível alterar as respostas.
        </OrientacaoItem>
      </ul>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          className="btn min-h-[52px] justify-center text-[15px] sm:flex-1"
          onClick={onBack}
        >
          Voltar
        </button>
        <button
          type="button"
          className="btn btn-primary min-h-[52px] justify-center text-[15px] sm:flex-1"
          onClick={onStart}
        >
          Iniciar questionário
        </button>
      </div>
    </div>
  );
}

function OrientacaoItem({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
      <div>
        <p className="font-bold text-navy">{titulo}</p>
        <p className="mt-0.5 leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function TransicaoStep({
  progresso,
  totalPerguntas,
  texto,
  dimensaoNome,
  podeVoltar,
  onAnterior,
  onProxima,
}: {
  progresso: { pct: number; numero: number; dimensaoNome: string };
  totalPerguntas: number;
  texto: string;
  dimensaoNome: string;
  podeVoltar: boolean;
  onAnterior: () => void;
  onProxima: () => void;
}) {
  return (
    <div className="space-y-6">
      <ProgressHeader
        pct={progresso.pct}
        numero={progresso.numero}
        total={totalPerguntas}
        dimensaoNome={dimensaoNome}
      />

      <div className="flex min-h-[180px] flex-col items-center justify-center px-1 py-6 text-center sm:min-h-[220px]">
        <p className="text-[10px] font-bold uppercase tracking-wide text-brand-blue">
          Nova dimensão
        </p>
        <p className="mt-3 text-lg font-extrabold leading-snug text-navy sm:text-xl">
          {texto}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          className="btn min-h-[52px] justify-center text-[15px] sm:flex-1"
          disabled={!podeVoltar}
          onClick={onAnterior}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn btn-primary min-h-[52px] justify-center text-[15px] sm:flex-1"
          onClick={onProxima}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

function PerguntaStep({
  item,
  progresso,
  totalPerguntas,
  selecionada,
  isUltima,
  podeVoltar,
  onSelect,
  onAnterior,
  onProxima,
}: {
  item: Extract<CopsoqFlowItem, { type: "pergunta" }>;
  progresso: { pct: number; numero: number; dimensaoNome: string };
  totalPerguntas: number;
  selecionada: string;
  isUltima: boolean;
  podeVoltar: boolean;
  onSelect: (valor: string) => void;
  onAnterior: () => void;
  onProxima: () => void;
}) {
  const opcoes = getOpcoesEscala(item.pergunta.escalaId);

  return (
    <div className="space-y-5">
      <ProgressHeader
        pct={progresso.pct}
        numero={item.numero}
        total={totalPerguntas}
        dimensaoNome={progresso.dimensaoNome}
      />

      <div>
        <h2 className="text-base font-extrabold leading-snug text-navy sm:text-lg">
          {item.pergunta.texto}
        </h2>
        {item.pergunta.ajuda ? (
          <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
            {item.pergunta.ajuda}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        {opcoes.map((opcao) => {
          const active = selecionada === opcao.valor;
          return (
            <button
              key={opcao.valor}
              type="button"
              className={`flex min-h-[52px] w-full items-center rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition ${
                active
                  ? "border-brand-blue bg-[#eef2ff] text-navy shadow-[0_0_0_1px_rgba(79,99,255,0.25)]"
                  : "border-[#e8edf5] bg-white text-[#475569] hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
              }`}
              onClick={() => onSelect(opcao.valor)}
            >
              <span
                className={`mr-3 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-extrabold ${
                  active
                    ? "border-brand-blue bg-brand-blue text-white"
                    : "border-[#cbd5e1] bg-white text-[#64748b]"
                }`}
              >
                {opcao.valor}
              </span>
              {opcao.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          className="btn min-h-[52px] justify-center text-[15px] sm:flex-1"
          disabled={!podeVoltar}
          onClick={onAnterior}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn btn-primary min-h-[52px] justify-center text-[15px] sm:flex-1"
          disabled={!selecionada}
          onClick={onProxima}
        >
          {isUltima ? "Finalizar pesquisa" : "Próxima"}
        </button>
      </div>
    </div>
  );
}

function FinalStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-green to-[#15803d] text-2xl font-extrabold text-white shadow-[0_12px_28px_rgba(31,157,85,0.35)]">
        ✓
      </div>
      <div>
        <h2 className="text-xl font-extrabold text-navy sm:text-2xl">
          Pesquisa concluída
        </h2>
        <p className="mt-2 text-base font-semibold text-[#334155]">
          Obrigado pela sua participação.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#64748b]">
          Sua contribuição é muito importante para a melhoria do ambiente de
          trabalho.
        </p>
      </div>

      <div className="space-y-2 rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-4 text-left text-sm text-[#475569]">
        <p>Suas respostas foram registradas com segurança.</p>
        <p>
          Nenhuma resposta individual será disponibilizada para gestores.
        </p>
        <p>
          Apenas resultados consolidados serão utilizados nas análises.
        </p>
      </div>

      <button
        type="button"
        className="btn btn-primary min-h-[52px] w-full justify-center py-3.5 text-[15px]"
        onClick={onFinish}
      >
        Encerrar
      </button>
    </div>
  );
}
