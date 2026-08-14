/**
 * Matrícula compartilhada entre Agendamentos e eSocial (mesma coluna).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDocumentacaoPayloadFromForm } from "../lib/agendamento-documentacao";
import { emptyToNull } from "../lib/money";
import { isDocumentacaoCompleta } from "../lib/validate-agendamento";
import type { AgendamentoFormValues } from "../lib/types";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function formDoc(
  overrides: Partial<AgendamentoFormValues> = {}
): AgendamentoFormValues {
  return {
    data_agendamento: "14/08/2026",
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
    envio_esocial: "Não",
    data_envio_esocial: "",
    esocial_recibo: "",
    ...overrides,
  };
}

function extractFunctionBody(source: string, fnName: string): string {
  const start = source.indexOf(`export async function ${fnName}`);
  assert.ok(start >= 0, `função ${fnName} encontrada`);
  const nextExport = source.indexOf("\nexport ", start + 1);
  return source.slice(start, nextExport > start ? nextExport : undefined);
}

const service = read("services/agendamento.service.ts");
const hook = read("hooks/useESocialPage.ts");
const modal = read("components/esocial/ESocialMarcarEnviadoModal.tsx");
const page = read("components/esocial/ESocialPage.tsx");
const actions = read("components/esocial/ESocialRowActionsMenu.tsx");
const view = read(
  "components/modals/agendamento-view/ViewModalGeneralSection.tsx"
);
const statusDoc = read("components/agendamentos/StatusDocumentacao.tsx");

const envioFn = extractFunctionBody(service, "atualizarEnvioEsocial");
assert.match(envioFn, /\.from\("agendamentos"\)/);
assert.match(envioFn, /numero_matricula/);
assert.doesNotMatch(envioFn, /from\("esocial"/);

assert.match(hook, /getById\(id\)/);
assert.match(hook, /setMatriculaInput\(ag\.numero_matricula \?\? ""\)/);
assert.match(hook, /numero_matricula: numeroMatricula/);
assert.match(hook, /atualizarEnvioEsocial\(id, false, null, null\)/);

const pendenteFnStart = hook.indexOf("const handleMarcarPendente");
const pendenteFn = hook.slice(
  pendenteFnStart,
  hook.indexOf("const openCancelarEnvio", pendenteFnStart)
);
assert.doesNotMatch(pendenteFn, /numero_matricula/);

assert.match(actions, /onVisualizar\(agendamento\.id\)/);
assert.match(actions, /onMarcarEnviado\(agendamento\.id\)/);

const dataIdx = modal.indexOf('label="Data envio e-Social"');
const reciboIdx = modal.indexOf('label="Nº Recibo"');
const matriculaIdx = modal.indexOf('label="Número da matrícula"');
assert.ok(dataIdx > 0, "modal tem Data envio e-Social");
assert.ok(reciboIdx > 0, "modal tem Nº Recibo");
assert.ok(matriculaIdx > 0, "modal tem Número da matrícula");
assert.ok(dataIdx < reciboIdx, "data aparece antes do Nº Recibo");
assert.ok(reciboIdx < matriculaIdx, "Nº Recibo aparece antes da matrícula");

assert.match(page, /numeroMatricula=\{matriculaInput\}/);
assert.match(view, /agendamento\.numero_matricula/);
assert.match(statusDoc, /form\.numero_matricula/);

assert.equal(emptyToNull("12345"), "12345");
assert.equal(emptyToNull(""), null);
assert.equal(emptyToNull("67890"), "67890");
assert.equal(emptyToNull("99999"), "99999");
assert.equal(emptyToNull("55555"), "55555");

assert.equal(isDocumentacaoCompleta(formDoc({ numero_matricula: "" })), true);
assert.equal(
  isDocumentacaoCompleta(formDoc({ numero_matricula: "12345" })),
  true
);

assert.equal(
  buildDocumentacaoPayloadFromForm(formDoc({ numero_matricula: "" }))
    .numero_matricula,
  null
);
assert.equal(
  buildDocumentacaoPayloadFromForm(formDoc({ numero_matricula: "12345" }))
    .numero_matricula,
  "12345"
);
assert.equal(
  buildDocumentacaoPayloadFromForm(formDoc({ numero_matricula: "67890" }))
    .numero_matricula,
  "67890"
);
assert.equal(
  buildDocumentacaoPayloadFromForm(formDoc({ numero_matricula: "99999" }))
    .numero_matricula,
  "99999"
);
assert.equal(
  buildDocumentacaoPayloadFromForm(formDoc({ numero_matricula: "55555" }))
    .numero_matricula,
  "55555"
);

const migrationFiles = readdirSync(join(root, "supabase/migrations"));
assert.equal(
  migrationFiles.some((name) => /matricula/i.test(name)),
  false,
  "não deve existir migration nova de matrícula"
);

console.log("test-esocial-matricula: ok");
