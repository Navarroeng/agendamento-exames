"use client";

import { useMemo, useState } from "react";
import { NavarroLogo } from "@/components/layout/NavarroLogo";
import { Field, RequiredMark } from "@/components/ui/Field";
import { maskCPFInput } from "@/lib/cpf";

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
  const codigoDisplay = codigo.trim().toUpperCase() || "DEMO01";
  const [step, setStep] = useState<Step>("landing");
  const [cpf, setCpf] = useState("");
  const [codigoAcesso, setCodigoAcesso] = useState("");
  const [perguntaIndex, setPerguntaIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, string>>({});

  const empresaNome = "Empresa Demonstração Ltda";
  const campanhaNome = "Pesquisa de Riscos Psicossociais";

  const progressoPct = Math.round(
    ((perguntaIndex + 1) / TOTAL_PERGUNTAS) * 100
  );

  const perguntaTexto = useMemo(() => {
    return (
      PERGUNTAS_PROTOTIPO[perguntaIndex % PERGUNTAS_PROTOTIPO.length] ??
      PERGUNTAS_PROTOTIPO[0]
    );
  }, [perguntaIndex]);

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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:py-14">
      <PortalBackground />

      <div className="relative z-10 w-full max-w-[560px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-5 rounded-[20px] border border-white/10 bg-white px-8 py-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
            <NavarroLogo priority size="hero" />
          </div>
        </div>

        <div className="rounded-[26px] border border-white/20 bg-white/[0.97] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-8">
          {step === "landing" ? (
            <LandingStep
              empresaNome={empresaNome}
              campanhaNome={campanhaNome}
              codigoDisplay={codigoDisplay}
              onStart={() => setStep("identificacao")}
            />
          ) : null}

          {step === "identificacao" ? (
            <IdentificacaoStep
              cpf={cpf}
              codigoAcesso={codigoAcesso}
              onCpfChange={setCpf}
              onCodigoChange={setCodigoAcesso}
              onBack={() => setStep("landing")}
              onContinue={() => setStep("apresentacao")}
            />
          ) : null}

          {step === "apresentacao" ? (
            <ApresentacaoStep
              onBack={() => setStep("identificacao")}
              onStart={() => {
                setPerguntaIndex(0);
                setStep("questionario");
              }}
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
            <FinalStep
              onFinish={() => {
                setStep("landing");
                setPerguntaIndex(0);
                setRespostas({});
                setCpf("");
                setCodigoAcesso("");
              }}
            />
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
  onStart,
}: {
  empresaNome: string;
  campanhaNome: string;
  codigoDisplay: string;
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
          Esta pesquisa é <span className="font-semibold text-navy">confidencial</span>.
          Suas respostas serão utilizadas apenas de forma agregada para apoiar
          ações de saúde e segurança no trabalho.
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
              {TOTAL_PERGUNTAS}{" "}
              <span className="text-[11px] font-semibold text-[#94a3b8]">
                (placeholder)
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        className="btn btn-primary w-full justify-center py-3.5 text-[15px]"
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
  onCpfChange,
  onCodigoChange,
  onBack,
  onContinue,
}: {
  cpf: string;
  codigoAcesso: string;
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
          Informe seus dados para acessar o questionário. Nesta versão de
          protótipo não há validação.
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
            className="field-input w-full"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => onCpfChange(maskCPFInput(e.target.value))}
          />
        </Field>
        <Field label="Código de acesso">
          <input
            className="field-input w-full"
            placeholder="Código individual (placeholder)"
            value={codigoAcesso}
            onChange={(e) => onCodigoChange(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn justify-center sm:flex-1"
          onClick={onBack}
        >
          Voltar
        </button>
        <button
          type="button"
          className="btn btn-primary justify-center sm:flex-1"
          onClick={onContinue}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

function ApresentacaoStep({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-navy">Bem-vindo!</h2>
        <p className="mt-2 text-sm text-[#64748b]">
          Antes de começar, veja algumas orientações importantes.
        </p>
      </div>

      <ul className="space-y-2.5 rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-4 py-4 text-sm text-[#475569]">
        <li className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
          A pesquisa é <span className="font-semibold text-navy">confidencial</span>.
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
          className="btn justify-center sm:flex-1"
          onClick={onBack}
        >
          Voltar
        </button>
        <button
          type="button"
          className="btn btn-primary justify-center sm:flex-1"
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
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
          Protótipo · pergunta ilustrativa
        </p>
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
              className={`flex w-full items-center rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                active
                  ? "border-brand-blue bg-[#eef2ff] text-navy"
                  : "border-[#e8edf5] bg-white text-[#475569] hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
              }`}
              onClick={() => onSelect(opcao)}
            >
              <span
                className={`mr-3 grid h-4 w-4 place-items-center rounded-full border ${
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
          className="btn justify-center sm:flex-1"
          disabled={perguntaNumero <= 1}
          onClick={onAnterior}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn btn-primary justify-center sm:flex-1"
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
        Protótipo visual — nesta etapa as respostas não são gravadas.
      </p>
      <button
        type="button"
        className="btn btn-primary w-full justify-center py-3.5 text-[15px]"
        onClick={onFinish}
      >
        Finalizar
      </button>
    </div>
  );
}
