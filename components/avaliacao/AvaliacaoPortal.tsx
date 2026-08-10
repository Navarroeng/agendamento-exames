"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NavarroLogo } from "@/components/layout/NavarroLogo";
import { Field, RequiredMark } from "@/components/ui/Field";
import { MENSAGEM_VALIDACAO_GENERICA } from "@/lib/avaliacao-constantes";
import { isValidCPF, maskCPFInput, normalizeCpfDigits } from "@/lib/cpf";

type Step = "landing" | "identificacao" | "apresentacao" | "questionario" | "final";

const TOTAL_PERGUNTAS = 35;

const PERGUNTAS_PROTOTIPO = [
  "Com que frequência você se sente sobrecarregado(a) pelas demandas do trabalho?",
  "Com que frequência você consegue conciliar as exigências do trabalho com sua vida pessoal?",
  "Com que frequência você se sente reconhecido(a) pelo trabalho que realiza?",
  "Com que frequência você tem clareza sobre suas responsabilidades no trabalho?",
  "Com que frequência você se sente à vontade para expressar opiniões no ambiente de trabalho?",
];

const OPCOES = [
  "Nunca",
  "Raramente",
  "Às vezes",
  "Frequentemente",
  "Sempre",
] as const;

interface AvaliacaoPortalProps {
  codigo: string;
}

export function AvaliacaoPortal({ codigo }: AvaliacaoPortalProps) {
  const codigoDisplay = codigo.trim().toUpperCase() || "";
  const [step, setStep] = useState<Step>("landing");
  const [cpf, setCpf] = useState("");
  const [codigoAcesso, setCodigoAcesso] = useState("");
  const [perguntaIndex, setPerguntaIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [empresaNome, setEmpresaNome] = useState("Carregando…");
  const [campanhaNome, setCampanhaNome] = useState(
    "Pesquisa de Riscos Psicossociais"
  );
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [validando, setValidando] = useState(false);
  const [erroIdentificacao, setErroIdentificacao] = useState<string | null>(
    null
  );
  const [participanteNome, setParticipanteNome] = useState("");
  const [autenticado, setAutenticado] = useState(false);

  const progressoPct = Math.round(
    ((perguntaIndex + 1) / TOTAL_PERGUNTAS) * 100
  );

  const perguntaTexto = useMemo(() => {
    return (
      PERGUNTAS_PROTOTIPO[perguntaIndex % PERGUNTAS_PROTOTIPO.length] ??
      PERGUNTAS_PROTOTIPO[0]
    );
  }, [perguntaIndex]);

  const carregarInfo = useCallback(async () => {
    if (!codigoDisplay) {
      setInfoError("Campanha inválida.");
      setDisponivel(false);
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
    try {
      const res = await fetch(
        `/api/avaliacao/sessao?codigoPublico=${encodeURIComponent(codigoDisplay)}`
      );
      const json = (await res.json()) as {
        ok?: boolean;
        autenticado?: boolean;
        empresaNome?: string;
        participanteNome?: string;
        error?: string;
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
          atual === "landing" || atual === "identificacao"
            ? "apresentacao"
            : atual
        );
      }
    } catch {
      // ignora — usuário fará login
    }
  }, [codigoDisplay, empresaNome]);

  useEffect(() => {
    void carregarInfo();
    void carregarSessao();
  }, [carregarInfo, carregarSessao]);

  async function handleValidar() {
    setErroIdentificacao(null);
    const digits = normalizeCpfDigits(cpf);
    if (!isValidCPF(digits)) {
      setErroIdentificacao(MENSAGEM_VALIDACAO_GENERICA);
      return;
    }
    if (!codigoAcesso.trim()) {
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
          codigoAcesso,
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
      setStep("apresentacao");
    } catch {
      setErroIdentificacao(MENSAGEM_VALIDACAO_GENERICA);
    } finally {
      setValidando(false);
    }
  }

  async function handleIniciarQuestionario() {
    try {
      await fetch("/api/avaliacao/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigoPublico: codigoDisplay }),
      });
    } catch {
      // não bloqueia protótipo de perguntas
    }
    setPerguntaIndex(0);
    setStep("questionario");
  }

  function handleProxima() {
    if (perguntaIndex >= TOTAL_PERGUNTAS - 1) {
      setStep("final");
      return;
    }
    setPerguntaIndex((i) => i + 1);
  }

  function handleAnterior() {
    if (perguntaIndex <= 0) return;
    setPerguntaIndex((i) => i - 1);
  }

  async function handleEncerrar() {
    try {
      await fetch("/api/avaliacao/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setAutenticado(false);
    setStep("landing");
    setPerguntaIndex(0);
    setRespostas({});
    setCpf("");
    setCodigoAcesso("");
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
              onStart={() => setStep("identificacao")}
            />
          ) : null}

          {step === "identificacao" ? (
            <IdentificacaoStep
              cpf={cpf}
              codigoAcesso={codigoAcesso}
              erro={erroIdentificacao}
              loading={validando}
              onCpfChange={setCpf}
              onCodigoChange={setCodigoAcesso}
              onBack={() => setStep("landing")}
              onContinue={() => void handleValidar()}
            />
          ) : null}

          {step === "apresentacao" ? (
            <ApresentacaoStep
              participanteNome={participanteNome}
              onBack={() => {
                if (autenticado) {
                  setStep("landing");
                  return;
                }
                setStep("identificacao");
              }}
              onStart={() => void handleIniciarQuestionario()}
            />
          ) : null}

          {step === "questionario" ? (
            <QuestionarioStep
              perguntaNumero={perguntaIndex + 1}
              total={TOTAL_PERGUNTAS}
              progressoPct={progressoPct}
              perguntaTexto={perguntaTexto}
              selecionada={respostas[perguntaIndex] ?? ""}
              onSelect={(opcao) =>
                setRespostas((prev) => ({ ...prev, [perguntaIndex]: opcao }))
              }
              onAnterior={handleAnterior}
              onProxima={handleProxima}
            />
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

function LandingStep({
  empresaNome,
  campanhaNome,
  codigoDisplay,
  disponivel,
  mensagem,
  onStart,
}: {
  empresaNome: string;
  campanhaNome: string;
  codigoDisplay: string;
  disponivel: boolean;
  mensagem: string | null;
  onStart: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
          Avaliação psicossocial
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
      </div>

      <div className="rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-4 text-left text-sm text-[#475569]">
        <p>
          Esta pesquisa é{" "}
          <span className="font-semibold text-navy">confidencial</span>. Suas
          respostas serão utilizadas apenas de forma agregada para apoiar ações
          de saúde e segurança no trabalho.
        </p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-[#eef2f7] bg-white px-3 py-2">
            <dt className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Tempo estimado
            </dt>
            <dd className="mt-0.5 font-extrabold text-navy">5 a 8 minutos</dd>
          </div>
          <div className="rounded-xl border border-[#eef2f7] bg-white px-3 py-2">
            <dt className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Quantidade de perguntas
            </dt>
            <dd className="mt-0.5 font-extrabold text-navy">
              {TOTAL_PERGUNTAS}
            </dd>
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
        className="btn btn-primary min-h-[48px] w-full justify-center py-3.5 text-[15px]"
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
  codigoAcesso,
  erro,
  loading,
  onCpfChange,
  onCodigoChange,
  onBack,
  onContinue,
}: {
  cpf: string;
  codigoAcesso: string;
  erro: string | null;
  loading: boolean;
  onCpfChange: (v: string) => void;
  onCodigoChange: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-extrabold text-navy">Identificação</h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Informe seu CPF e o código de acesso da pesquisa fornecido pela
          empresa.
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
              Código de acesso <RequiredMark />
            </>
          }
        >
          <input
            className="field-input min-h-[48px] w-full text-base tracking-widest"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="Ex.: NAV2026"
            value={codigoAcesso}
            onChange={(e) =>
              onCodigoChange(e.target.value.toUpperCase().replace(/\s+/g, ""))
            }
          />
        </Field>
      </div>

      {erro ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erro}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn min-h-[48px] justify-center sm:flex-1"
          disabled={loading}
          onClick={onBack}
        >
          Voltar
        </button>
        <button
          type="button"
          className="btn btn-primary min-h-[48px] justify-center sm:flex-1"
          disabled={loading}
          onClick={onContinue}
        >
          {loading ? "Validando…" : "Continuar"}
        </button>
      </div>
    </div>
  );
}

function ApresentacaoStep({
  participanteNome,
  onBack,
  onStart,
}: {
  participanteNome: string;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-navy">
          {participanteNome ? `Olá, ${participanteNome.split(" ")[0]}!` : "Bem-vindo!"}
        </h2>
        <p className="mt-2 text-sm text-[#64748b]">
          Antes de começar, veja algumas orientações importantes.
        </p>
      </div>

      <ul className="space-y-2.5 rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-4 text-sm text-[#475569]">
        <li className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
          A pesquisa é{" "}
          <span className="font-semibold text-navy">confidencial</span>.
        </li>
        <li className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
          Não existem respostas certas ou erradas.
        </li>
        <li className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
          Responda com sinceridade — isso ajuda a melhorar o ambiente de
          trabalho.
        </li>
        <li className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
          A duração aproximada é de 5 a 8 minutos.
        </li>
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn min-h-[48px] justify-center sm:flex-1"
          onClick={onBack}
        >
          Voltar
        </button>
        <button
          type="button"
          className="btn btn-primary min-h-[48px] justify-center sm:flex-1"
          onClick={onStart}
        >
          Iniciar questionário
        </button>
      </div>
    </div>
  );
}

function QuestionarioStep({
  perguntaNumero,
  total,
  progressoPct,
  perguntaTexto,
  selecionada,
  onSelect,
  onAnterior,
  onProxima,
}: {
  perguntaNumero: number;
  total: number;
  progressoPct: number;
  perguntaTexto: string;
  selecionada: string;
  onSelect: (opcao: string) => void;
  onAnterior: () => void;
  onProxima: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#64748b]">
          <span>
            Pergunta {perguntaNumero} de {total}
          </span>
          <span className="tabular-nums text-navy">{progressoPct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
          <div
            className="h-full rounded-full bg-brand-blue transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progressoPct))}%` }}
          />
        </div>
      </div>

      <div>
        <h2 className="mt-1 text-base font-extrabold leading-snug text-navy sm:text-lg">
          {perguntaTexto}
        </h2>
      </div>

      <div className="space-y-2">
        {OPCOES.map((opcao) => {
          const active = selecionada === opcao;
          return (
            <button
              key={opcao}
              type="button"
              className={`flex min-h-[48px] w-full items-center rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition ${
                active
                  ? "border-brand-blue bg-[#eef2ff] text-navy"
                  : "border-[#e8edf5] bg-white text-[#475569] hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
              }`}
              onClick={() => onSelect(opcao)}
            >
              <span
                className={`mr-3 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                  active
                    ? "border-brand-blue bg-brand-blue"
                    : "border-[#cbd5e1] bg-white"
                }`}
              >
                {active ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                ) : null}
              </span>
              {opcao}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn min-h-[48px] justify-center sm:flex-1"
          disabled={perguntaNumero <= 1}
          onClick={onAnterior}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn btn-primary min-h-[48px] justify-center sm:flex-1"
          disabled={!selecionada}
          onClick={onProxima}
        >
          {perguntaNumero >= total ? "Concluir" : "Próxima"}
        </button>
      </div>
    </div>
  );
}

function FinalStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-green-soft text-2xl font-extrabold text-brand-green">
        ✓
      </div>
      <div>
        <h2 className="text-xl font-extrabold text-navy">
          Pesquisa concluída com sucesso.
        </h2>
        <p className="mt-2 text-sm text-[#64748b]">
          Agradecemos sua participação.
        </p>
      </div>
      <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-xs text-[#64748b]">
        As respostas do questionário ainda não são gravadas nesta etapa. O
        controle de participação (acesso/início) já é registrado.
      </p>
      <button
        type="button"
        className="btn btn-primary min-h-[48px] w-full justify-center py-3.5 text-[15px]"
        onClick={onFinish}
      >
        Encerrar
      </button>
    </div>
  );
}
