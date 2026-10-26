/**
 * Preço automático do exame clínico admissional conforme a modalidade SST.
 * Não grava agendamento nem altera histórico.
 */
import fs from "node:fs";
import path from "node:path";
import {
  aplicarValorAdmissionalNoPayload,
  contratoEhGestaoSstMensal,
  valorAdmissionalAvulsoDoContrato,
  valorAdmissionalDoContratoSelecionado,
} from "../lib/agendamento-admissional-preco";
import { CLINICO_VALOR_ASO_ADMISSIONAL, getClinicoValorNavarroAuto } from "../lib/exame-pricing";
import { MOTIVO_ASO_INCLUSO_CONTRATO } from "../lib/contrato-creditos-aso";
import { buildFaturaItensFromAgendamentos } from "../lib/fatura-mappers";
import type { AgendamentoWithExames } from "../lib/types";

let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(err);
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const pontual = {
  modalidadeOrcamento: "pontual",
  tipo_contrato: "anual" as const,
  mensalidadePagamento: "avista",
  exameAdmissionalReais: 80,
};

const mensalMesAMes = {
  modalidadeOrcamento: "mensalidade",
  mensalidadePagamento: "mensal",
  tipo_contrato: "anual" as const,
};

const mensalAvista = {
  modalidadeOrcamento: "mensalidade",
  mensalidadePagamento: "avista",
  tipo_contrato: "anual" as const,
};

test("pontual permanece R$ 100, mesmo à vista e com preço mensal gravado", () => {
  assert(contratoEhGestaoSstMensal(pontual) === false, "pontual não é mensal");
  assert(valorAdmissionalAvulsoDoContrato(pontual) === 100, "pontual deveria ser 100");
  assert(
    valorAdmissionalAvulsoDoContrato(null) === CLINICO_VALOR_ASO_ADMISSIONAL,
    "sem contrato deveria ser 100"
  );
});

test("mensal mês a mês usa R$ 50 quando não há preço acordado", () => {
  assert(valorAdmissionalAvulsoDoContrato(mensalMesAMes) === 50, "mês a mês deveria ser 50");
});

test("mensal antecipado à vista também usa R$ 50", () => {
  assert(
    valorAdmissionalAvulsoDoContrato(mensalAvista) === 50,
    "à vista da modalidade mensal deveria ser 50"
  );
});

test("mensal usa o preço acordado e cai no catálogo se o parâmetro não existe", () => {
  assert(
    valorAdmissionalAvulsoDoContrato({
      ...mensalMesAMes,
      exameAdmissionalReais: 80,
    }) === 80,
    "preço acordado deveria prevalecer"
  );
  assert(
    valorAdmissionalAvulsoDoContrato({
      ...mensalMesAMes,
      exameAdmissionalReais: 0,
    }) === 50,
    "zero gravado deveria usar o catálogo de R$ 50"
  );
  assert(
    valorAdmissionalAvulsoDoContrato({
      ...mensalAvista,
      exameAdmissionalReais: null,
    }) === 50,
    "parâmetro ausente no à vista deveria usar R$ 50"
  );
});

test("contrato mensal antigo sem modalidade usa R$ 50; anual sem modalidade permanece R$ 100", () => {
  assert(
    valorAdmissionalAvulsoDoContrato({ tipo_contrato: "mensal" }) === 50,
    "tipo mensal antigo deveria ser 50"
  );
  assert(
    valorAdmissionalAvulsoDoContrato({ tipo_contrato: "anual" }) === 100,
    "anual sem modalidade permanece 100"
  );
});

test("contrato vinculado ao atendimento vence o pontual antigo ainda vigente", () => {
  const contratos = [
    {
      id: "pontual-antigo",
      modalidadeOrcamento: "pontual",
      tipo_contrato: "anual" as const,
      exameAdmissionalReais: 80,
    },
    {
      id: "mensal-atual",
      modalidadeOrcamento: "mensalidade",
      tipo_contrato: "anual" as const,
      exameAdmissionalReais: null,
    },
  ];
  const ambosVigentes = () => true;
  assert(
    valorAdmissionalDoContratoSelecionado(
      contratos,
      ambosVigentes,
      "mensal-atual"
    ) === 50,
    "vínculo mensal deveria custar 50 mesmo com pontual na frente da lista"
  );
  assert(
    valorAdmissionalDoContratoSelecionado(
      [contratos[1], contratos[0]],
      ambosVigentes,
      null
    ) === 50,
    "sem vínculo explícito, o primeiro vigente da lista recente deveria ser o mensal"
  );
  assert(
    valorAdmissionalDoContratoSelecionado(
      contratos,
      (contrato) => contrato.id === "pontual-antigo",
      "mensal-atual"
    ) === 100,
    "mensal fora da vigência não deveria emprestar o preço do pontual antigo"
  );
});

test("troca entre pontual e mensal recalcula sem herdar o preço anterior", () => {
  assert(valorAdmissionalAvulsoDoContrato(pontual) === 100, "antes: pontual");
  assert(valorAdmissionalAvulsoDoContrato(mensalAvista) === 50, "depois: mensal à vista");
  assert(valorAdmissionalAvulsoDoContrato(mensalMesAMes) === 50, "depois: mensal mês a mês");
  assert(valorAdmissionalAvulsoDoContrato(pontual) === 100, "volta ao pontual");
});

test("só o Clínico admissional muda; periódico, retorno e complementar ficam", () => {
  const exames = [
    { tipo_exame: "Clínico", valor_cliente: 100, custo_clinica: 30 },
    { tipo_exame: "Audiometria", valor_cliente: 40, custo_clinica: 20 },
  ];
  const admissional = aplicarValorAdmissionalNoPayload(exames, "Admissional", 50);
  assert(admissional[0].valor_cliente === 50, "clínico admissional deveria ser 50");
  assert(admissional[1].valor_cliente === 40, "audiometria deveria permanecer 40");

  const periodico = aplicarValorAdmissionalNoPayload(exames, "Periódico", 50);
  assert(periodico[0].valor_cliente === 100, "periódico não deveria ser reprecificado aqui");

  const credito = aplicarValorAdmissionalNoPayload(
    [
      {
        tipo_exame: "Clínico",
        valor_cliente: 0,
        motivo_valor_zero: MOTIVO_ASO_INCLUSO_CONTRATO,
        incluso_credito_contrato: true,
      },
    ],
    "Admissional",
    50
  );
  assert(credito[0].valor_cliente === 0, "crédito contratual não vira cobrança de 50");

  assert(getClinicoValorNavarroAuto("Admissional") === 100, "padrão admissional segue 100");
  assert(getClinicoValorNavarroAuto("Admissional", 50) === 50, "admissional recebe o valor do contrato");
  assert(
    getClinicoValorNavarroAuto("Retorno ao Trabalho", 50) === 100,
    "retorno permanece 100"
  );
  assert(getClinicoValorNavarroAuto("Periódico", 50) === 0, "periódico permanece 0");
  assert(getClinicoValorNavarroAuto("Mudança de Função", 50) === null, "mudança de função segue sem preço automático");
});

test("fatura do cliente usa o valor salvo e mantém o complementar em linha própria", () => {
  const itens = buildFaturaItensFromAgendamentos(
    [
      {
        id: "ag-1",
        data_agendamento: "2026-10-26",
        colaborador: "Ana",
        cliente_nome: "Cliente mensal",
        clinica_nome: "Clínica",
        aso: "Admissional",
        status: "agendado",
        agendamento_exames: [
          { tipo_exame: "Clínico", valor_cliente: 50, custo_clinica: 30 },
          { tipo_exame: "Audiometria", valor_cliente: 40, custo_clinica: 20 },
        ],
      } as AgendamentoWithExames,
    ],
    "cliente"
  );
  assert(itens.length === 2, "deveria faturar clínico e complementar");
  assert(itens.some((item) => item.exame_nome === "Clínico" && item.valor_total === 50), "fatura do clínico deveria ser 50");
  assert(
    itens.some((item) => item.exame_nome === "Audiometria" && item.valor_total === 40),
    "complementar deveria continuar separado"
  );
});

test("gravação nova aplica o preço e a atualização de agendamento existente não", () => {
  const raiz = path.join(process.cwd());
  const salvar = fs.readFileSync(
    path.join(raiz, "services", "agendamento.service.ts"),
    "utf8"
  );
  const inicioSalvar = salvar.indexOf("export async function salvarAgendamentoComExames");
  const inicioAtualizar = salvar.indexOf("export async function atualizarAgendamentoComExames");
  const corpoSalvar = salvar.slice(inicioSalvar, inicioAtualizar);
  const corpoAtualizar = salvar.slice(inicioAtualizar);
  assert(corpoSalvar.includes("resolverValorAdmissionalDoAtendimento"), "insert deveria resolver o contrato");
  assert(corpoSalvar.includes("aplicarValorAdmissionalNoPayload"), "insert deveria gravar o valor resolvido");
  assert(corpoSalvar.includes("contratoIdPreferido"), "insert deveria respeitar o contrato vinculado");
  assert(
    !corpoAtualizar.includes("resolverValorAdmissionalDoAtendimento"),
    "atualização não deveria reprecificar o histórico"
  );

  const exames = fs.readFileSync(path.join(raiz, "hooks", "useExams.ts"), "utf8");
  assert(
    exames.includes("getClinicoValorNavarroAuto(asoTipo, valorAdmissional)"),
    "a tela deveria usar o valor resolvido no automático"
  );
  assert(
    exames.includes("reaplicarValorClinicoAutomatico"),
    "troca de cliente deveria recalcular o clínico"
  );

  const pagina = fs.readFileSync(
    path.join(raiz, "hooks", "useAgendamentosPage.ts"),
    "utf8"
  );
  assert(
    pagina.includes("setContratoPreferidoId"),
    "a troca de contrato vinculado deveria disparar o recálculo"
  );

  const regra = fs.readFileSync(
    path.join(raiz, "lib", "agendamento-admissional-preco.ts"),
    "utf8"
  );
  assert(!regra.includes("contratoCobrancaMensal"), "não identificar mensal pelo pagamento à vista");
  assert(!regra.includes("mensalidadePagamento"), "não identificar a modalidade pela forma de pagamento");
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nTodos os testes passaram.");
