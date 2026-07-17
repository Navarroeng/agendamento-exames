import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AGENDAMENTO_BLOQUEADO_FATURA_MSG,
  resolverBloqueioAgendamentoFatura,
} from "../lib/agendamento-fatura-bloqueio";
import { buildDocumentacaoPayloadFromForm } from "../lib/agendamento-documentacao";

const root = process.cwd();
const serviceSource = readFileSync(
  join(root, "services/agendamento.service.ts"),
  "utf8"
);
const esocialHookSource = readFileSync(
  join(root, "hooks/useESocialPage.ts"),
  "utf8"
);

function extractFunctionBody(source: string, fnName: string): string {
  const start = source.indexOf(`export async function ${fnName}`);
  assert.ok(start >= 0, `função ${fnName} encontrada`);
  const nextExport = source.indexOf("\nexport ", start + 1);
  return source.slice(start, nextExport > start ? nextExport : undefined);
}

const docFn = extractFunctionBody(
  serviceSource,
  "atualizarDocumentacaoAgendamento"
);
const esocialFn = extractFunctionBody(serviceSource, "atualizarEnvioEsocial");
const updateFn = extractFunctionBody(
  serviceSource,
  "atualizarAgendamentoComExames"
);

assert.ok(
  !docFn.includes("await assertAgendamentoEditavelPorFatura"),
  "documentação não deve passar pelo bloqueio financeiro"
);
assert.ok(
  !esocialFn.includes("await assertAgendamentoEditavelPorFatura"),
  "eSocial não deve passar pelo bloqueio financeiro"
);
assert.ok(
  updateFn.includes("await assertAgendamentoEditavelPorFatura"),
  "edição principal continua bloqueada com fatura emitida"
);

assert.ok(
  !esocialHookSource.includes("bloquearAcaoAgendamentoFaturado"),
  "página eSocial não bloqueia marcar como enviado no frontend"
);
assert.ok(
  !esocialHookSource.includes(AGENDAMENTO_BLOQUEADO_FATURA_MSG),
  "página eSocial não exibe toast de bloqueio financeiro"
);

const bloqueioEmitida = resolverBloqueioAgendamentoFatura([
  {
    id: "f1",
    numero: "FAT-001",
    tipo: "cliente",
    status: "emitida",
    pago: false,
    data_vencimento: "2026-12-31",
  },
]);
assert.equal(bloqueioEmitida.bloqueado, true, "fatura emitida ainda bloqueia edição principal");

const payload = buildDocumentacaoPayloadFromForm({
  data_agendamento: "01/06/2026",
  horario: "09:00",
  cliente_nome: "Empresa",
  colaborador: "João",
  colaborador_cpf: "529.982.247-25",
  aso: "Admissional",
  clinica_nome: "Clínica",
  responsavel: "Bruna",
  observacoes: "",
  aso_enviado_clinica: "Não",
  data_aso_enviado_clinica: "",
  aso_assinado: "Não",
  data_aso_assinado: "",
  aso_enviado_cliente: "Não",
  data_aso_enviado_cliente: "",
  numero_matricula: "",
  envio_esocial: "Sim",
  data_envio_esocial: "2026-06-15",
  esocial_recibo: "123456789012345678901",
});

assert.equal(payload.envio_esocial, true);
assert.ok(payload.esocial_recibo?.includes("."), "recibo eSocial formatado");

console.log("test-esocial-documentacao-bloqueio: ok");
