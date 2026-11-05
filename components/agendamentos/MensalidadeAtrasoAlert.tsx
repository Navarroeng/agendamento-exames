import type { MensalidadeAgendamentoUiState } from "@/hooks/useMensalidadeAgendamentoBloqueio";

interface MensalidadeAtrasoAlertProps {
  state: MensalidadeAgendamentoUiState;
  onTentarNovamente?: () => void;
  onVerPendencias?: () => void;
}

export function MensalidadeAtrasoAlert({
  state,
  onTentarNovamente,
  onVerPendencias,
}: MensalidadeAtrasoAlertProps) {
  if (state.status !== "bloqueado" && state.status !== "consulta_falhou") {
    return null;
  }

  const falha = state.status === "consulta_falhou";

  return (
    <div
      className={`mt-3 rounded-xl border px-4 py-3 text-sm font-semibold leading-relaxed ${
        falha
          ? "border-[#fde68a] bg-[#fffbeb] text-[#92400e]"
          : "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
      }`}
      role="alert"
    >
      <p>{state.mensagem}</p>
      {state.status === "bloqueado" && onVerPendencias ? (
        <button
          type="button"
          className="mt-2 text-xs font-bold underline"
          onClick={onVerPendencias}
        >
          Ver pendências
        </button>
      ) : null}
      {falha && onTentarNovamente ? (
        <button
          type="button"
          className="mt-2 text-xs font-bold underline"
          onClick={onTentarNovamente}
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
