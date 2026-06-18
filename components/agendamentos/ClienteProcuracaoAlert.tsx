interface ClienteProcuracaoAlertProps {
  visible: boolean;
}

export function ClienteProcuracaoAlert({ visible }: ClienteProcuracaoAlertProps) {
  if (!visible) return null;

  return (
    <div
      className="mt-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-semibold leading-relaxed text-[#92400e]"
      role="alert"
    >
      ⚠️ Cliente sem procuração ativa. Verifique a regularização da procuração
      antes do envio dos eventos.
    </div>
  );
}
