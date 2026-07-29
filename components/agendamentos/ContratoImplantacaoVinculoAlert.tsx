"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import type { VinculoContratoDecision } from "@/lib/contrato-agendamentos";
import type { ContratoAptoAgendamento } from "@/services/contrato-agendamentos.service";

interface ContratoImplantacaoVinculoAlertProps {
  comSaldo: ContratoAptoAgendamento[];
  semSaldo: ContratoAptoAgendamento[];
  decision: VinculoContratoDecision;
  selectedContratoId: string | null;
  disabled?: boolean;
  onSelectContrato: (contratoId: string) => void;
  onVincular: () => void;
  onNaoVincular: () => void;
  onLimparDecisao: () => void;
}

function ContratoCard({
  item,
  selected,
  onSelect,
  disabled,
}: {
  item: ContratoAptoAgendamento;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <>
      <p className="text-sm font-extrabold text-navy">
        {item.contrato.numero || "Contrato sem número"}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-[#475569]">
        {item.contrato.numero_orcamento || "Orçamento —"} · {item.origemLabel}
      </p>
      <p className="mt-2 text-xs text-[#64748b]">
        {item.contratados} previstos · {item.realizados} vinculados ·{" "}
        {item.disponiveis} disponíveis
        {item.contrato.aprovado_em
          ? ` · Aprovado em ${formatDateIsoToBR(item.contrato.aprovado_em)}`
          : ""}
      </p>
    </>
  );

  if (!onSelect) {
    return (
      <div className="rounded-xl border border-[#e4ebf4] bg-white px-3.5 py-3">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
        selected
          ? "border-brand-blue bg-[#eff6ff] ring-1 ring-brand-blue/30"
          : "border-[#e4ebf4] bg-white hover:border-brand-blue/50"
      } disabled:opacity-60`}
    >
      {content}
    </button>
  );
}

export function ContratoImplantacaoVinculoAlert({
  comSaldo,
  semSaldo,
  decision,
  selectedContratoId,
  disabled,
  onSelectContrato,
  onVincular,
  onNaoVincular,
  onLimparDecisao,
}: ContratoImplantacaoVinculoAlertProps) {
  if (comSaldo.length === 0 && semSaldo.length === 0) return null;

  const unico = comSaldo.length === 1 ? comSaldo[0] : null;
  const selecionado =
    comSaldo.find((c) => c.contrato.id === selectedContratoId) ?? unico;
  const saldoZeroInfo = comSaldo.length === 0 && semSaldo.length > 0;
  const destaque = semSaldo[0];

  if (saldoZeroInfo) {
    return (
      <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
        <p className="font-bold">Quantidade inicial atingida</p>
        <p className="mt-1 leading-relaxed">
          A quantidade inicial de {destaque.contratados} colaboradores do
          contrato {destaque.contrato.numero || "selecionado"} já foi atingida.
          Este agendamento será registrado como adicional e não fará parte da
          implantação inicial.
        </p>
        <button
          type="button"
          className="btn mt-3"
          disabled={disabled}
          onClick={onNaoVincular}
        >
          Continuar sem vínculo
        </button>
        {decision === "nao" ? (
          <p className="mt-2 text-xs font-semibold text-[#a16207]">
            Sem vínculo com o contrato da implantação.
          </p>
        ) : null}
      </div>
    );
  }

  if (decision === "sim" && selecionado) {
    return (
      <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
        <p className="font-bold">Vínculo com o contrato confirmado</p>
        <p className="mt-1 leading-relaxed">
          Contrato {selecionado.contrato.numero || "—"}
          {selecionado.contrato.numero_orcamento
            ? ` · Origem ${selecionado.contrato.numero_orcamento}`
            : ""}
          . Saldo antes deste agendamento: {selecionado.disponiveis}{" "}
          colaborador{selecionado.disponiveis === 1 ? "" : "es"} disponível
          {selecionado.disponiveis === 1 ? "" : "eis"}.
        </p>
        <button
          type="button"
          className="btn mt-3"
          disabled={disabled}
          onClick={onLimparDecisao}
        >
          Alterar decisão
        </button>
      </div>
    );
  }

  if (decision === "nao") {
    return (
      <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm text-[#475569]">
        <p className="font-bold text-navy">Sem vínculo com a implantação</p>
        <p className="mt-1 leading-relaxed">
          Este agendamento não consumirá o saldo do contrato e não aparecerá na
          aba Agendamentos da Implantação.
        </p>
        <button
          type="button"
          className="btn mt-3"
          disabled={disabled}
          onClick={onLimparDecisao}
        >
          Alterar decisão
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm text-[#1e3a8a]">
      <p className="font-bold">Contrato em implantação</p>
      {unico ? (
        <p className="mt-1 leading-relaxed">
          Esta empresa possui o contrato{" "}
          <strong>{unico.contrato.numero || "sem número"}</strong>, com{" "}
          {unico.contratados} colaboradores previstos e {unico.disponiveis}{" "}
          ainda disponíveis para a implantação.
          <br />
          Deseja vincular este agendamento ao contrato?
        </p>
      ) : (
        <p className="mt-1 leading-relaxed">
          Esta empresa possui mais de um contrato com saldo disponível para a
          implantação. Selecione o contrato e confirme o vínculo.
        </p>
      )}

      {comSaldo.length > 1 ? (
        <div className="mt-3 space-y-2">
          {comSaldo.map((item) => (
            <ContratoCard
              key={item.contrato.id}
              item={item}
              selected={selectedContratoId === item.contrato.id}
              disabled={disabled}
              onSelect={() => onSelectContrato(item.contrato.id)}
            />
          ))}
        </div>
      ) : unico ? (
        <div className="mt-3">
          <ContratoCard item={unico} />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={
            disabled || (comSaldo.length > 1 && !selectedContratoId)
          }
          onClick={onVincular}
        >
          Sim, vincular ao contrato
        </button>
        <button
          type="button"
          className="btn"
          disabled={disabled}
          onClick={onNaoVincular}
        >
          Não, continuar sem vínculo
        </button>
      </div>
    </div>
  );
}
