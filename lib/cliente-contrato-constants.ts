import type { ClienteContratoStatus, ClienteContratoTipo } from "@/lib/types";

export const CLIENTE_CONTRATO_STATUS_OPTIONS: {
  value: ClienteContratoStatus;
  label: string;
}[] = [
  { value: "aguardando_envio", label: "Aguardando envio" },
  { value: "ativo", label: "Ativo" },
  { value: "encerrado", label: "Encerrado" },
  { value: "em_renovacao", label: "Em renovação" },
  { value: "cancelado", label: "Cancelado" },
];

export const CLIENTE_CONTRATO_TIPO_OPTIONS: {
  value: ClienteContratoTipo;
  label: string;
}[] = [
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
  { value: "avulso", label: "Avulso" },
  { value: "sem_contrato", label: "Sem contrato" },
];
