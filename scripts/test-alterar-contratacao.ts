/** Alteração de contratação mensal: atualiza o total da parcela existente. */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  planejarAlteracaoContratacao,
  sugerirMensalidadeContratacao,
  type ParcelaAlteracaoEntrada,
  type VagaOcupacaoEntrada,
} from "../lib/alterar-contratacao";
import {
  buildClausulasContrato,
  textoPlanoContrato,
  type ContratoNavarroContexto,
} from "../lib/contrato-navarro";
import {
  planejarPersistenciaParcelas,
  resolverGradeMensalidades,
} from "../lib/mensalidade-parcelas";
import { ORCAMENTO_MODALIDADE_MENSALIDADE } from "../lib/orcamento-modalidade";

const VIGENCIA = "2026-10-14";
const IDS = Array.from({ length: 12 }, (_, index) => `parcela-${index + 1}`);

function parcela(
  numero: number,
  over: Partial<ParcelaAlteracaoEntrada> = {}
): ParcelaAlteracaoEntrada {
  return {
    id: IDS[numero - 1] ?? `parcela-${numero}`,
    numero,
    vencimentoIso: `2026-${String(numero).padStart(2, "0")}-10`,
    vigenciaInicio: VIGENCIA,
    valor: 270,
    pagoEmIso: null,
    valorRecebido: null,
    comprovantePath: null,
    semVigenciaEm: null,
    ...over,
  };
}

function serie(valor = 270): ParcelaAlteracaoEntrada[] {
  return Array.from({ length: 12 }, (_, index) =>
    parcela(index + 1, { valor })
  );
}

function vagas(quantidade: number, ocupadasAte = 0): VagaOcupacaoEntrada[] {
  return Array.from({ length: quantidade }, (_, index) => ({
    indice: index + 1,
    status: index < ocupadasAte ? "preenchida" : "aberta",
    colaborador: index < ocupadasAte ? `Pessoa ${index + 1}` : null,
    colaboradorCpf: null,
    agendamentoId: null,
    creditoAsoId: null,
    periodicoFuturoId: null,
  }));
}

function contexto(alteracao: boolean): ContratoNavarroContexto {
  return {
    modalidade: ORCAMENTO_MODALIDADE_MENSALIDADE,
    numeroOrcamento: "ORC-TESTE-0001",
    dataContrato: "2026-10-14",
    contratante: {
      razaoSocial: "EMPRESA TESTE LTDA",
      cnpj: "12345678000199",
      endereco: "Rua 1",
      telefone: null,
      email: null,
      setor: null,
    },
    colaboradores: 22,
    valor: 340,
    condicaoPagamento: "12 mensalidades",
    parcelas: [],
    servicos: ["Gestão SST - Mensal"],
    pagamentoMensalidade: {
      forma: "mensal",
      meses: 12,
      valorMensal: 340,
    },
    vigenciaInicioIso: VIGENCIA,
    vigenciaFimIso: "2027-10-14",
    diaVencimentoMensalidade: 10,
    renovacaoAutomatica: true,
    modeloVersao: 2,
    alteracaoContratacao: alteracao
      ? {
          vigenciaInicioIso: VIGENCIA,
          numeroParcela: 4,
          vencimentoIso: "2027-01-10",
          quantidadeAnterior: 15,
          valorAnterior: 270,
        }
      : null,
  };
}

const plano = planejarAlteracaoContratacao({
  quantidadeAnterior: 15,
  quantidadeNova: 22,
  valorAnterior: 270,
  valorNovo: sugerirMensalidadeContratacao(22),
  inicioNumero: 1,
  vigenciaInicio: VIGENCIA,
  parcelas: serie(),
  vagas: vagas(15),
});

assert.equal(sugerirMensalidadeContratacao(15), 270);
assert.equal(sugerirMensalidadeContratacao(22), 340);
assert.equal(sugerirMensalidadeContratacao(1), 130);
assert.equal(plano.impedimentos.length, 0);
assert.equal(plano.parcelas.length, 12);
assert.deepEqual(
  plano.parcelas.map((item) => item.id),
  IDS
);
assert.equal(
  plano.parcelas.filter((item) => item.acao === "atualizar").length,
  12
);
assert.ok(plano.parcelas.every((item) => item.valorNovo === 340));
assert.ok(plano.parcelas.every((item) => item.valorAnterior === 270));
assert.equal(
  plano.parcelas.filter((item) => item.valorNovo === 70).length,
  0
);
assert.equal(plano.vagasNovas, 7);

const futuro = planejarAlteracaoContratacao({
  quantidadeAnterior: 15,
  quantidadeNova: 22,
  valorAnterior: 270,
  valorNovo: 340,
  inicioNumero: 4,
  vigenciaInicio: VIGENCIA,
  parcelas: serie(),
  vagas: vagas(15),
});
assert.equal(futuro.impedimentos.length, 0);
assert.deepEqual(
  futuro.parcelas.filter((item) => item.acao === "preservar").map((item) => item.numero),
  [1, 2, 3]
);
assert.ok(
  futuro.parcelas
    .filter((item) => item.numero >= 4)
    .every((item) => item.acao === "atualizar" && item.valorNovo === 340)
);
assert.ok(
  futuro.parcelas
    .filter((item) => item.numero < 4)
    .every((item) => item.valorNovo === 270)
);

const protegidas = planejarAlteracaoContratacao({
  quantidadeAnterior: 15,
  quantidadeNova: 22,
  valorAnterior: 270,
  valorNovo: 340,
  inicioNumero: 1,
  vigenciaInicio: VIGENCIA,
  parcelas: [
    parcela(1, { pagoEmIso: "2026-01-10" }),
    parcela(2, { valorRecebido: 100 }),
    parcela(3, { valorRecebido: 270 }),
    parcela(4, { comprovantePath: "comprovantes/recibo.pdf" }),
    parcela(5, { semVigenciaEm: "2026-02-01" }),
    ...Array.from({ length: 7 }, (_, index) => parcela(index + 6)),
  ],
  vagas: vagas(15),
});
const porNumero = new Map(protegidas.parcelas.map((item) => [item.numero, item]));
assert.equal(porNumero.get(1)?.motivo, "paga");
assert.equal(porNumero.get(2)?.motivo, "parcial");
assert.equal(porNumero.get(3)?.motivo, "recebimento");
assert.equal(porNumero.get(4)?.motivo, "comprovante");
assert.equal(porNumero.get(5), undefined);
assert.equal(protegidas.parcelas.length, 11);
assert.ok(
  protegidas.parcelas
    .filter((item) => item.numero <= 4)
    .every((item) => item.acao === "preservar" && item.valorNovo === 270)
);

const manual = planejarAlteracaoContratacao({
  quantidadeAnterior: 15,
  quantidadeNova: 22,
  valorAnterior: 270,
  valorNovo: 400,
  inicioNumero: 1,
  vigenciaInicio: VIGENCIA,
  parcelas: serie(),
  vagas: vagas(15),
});
assert.equal(manual.valorSugerido, 340);
assert.equal(manual.valorNovo, 400);
assert.ok(manual.parcelas.every((item) => item.valorNovo === 400));

const repetida = planejarAlteracaoContratacao({
  quantidadeAnterior: 22,
  quantidadeNova: 22,
  valorAnterior: 340,
  valorNovo: 340,
  inicioNumero: 1,
  vigenciaInicio: VIGENCIA,
  parcelas: serie(340),
  vagas: vagas(22),
});
assert.equal(repetida.impedimentos.length, 1);
assert.match(repetida.impedimentos[0] ?? "", /já está com essa quantidade/);

const bloqueioVaga = planejarAlteracaoContratacao({
  quantidadeAnterior: 22,
  quantidadeNova: 10,
  valorAnterior: 340,
  valorNovo: 220,
  inicioNumero: 1,
  vigenciaInicio: VIGENCIA,
  parcelas: serie(340),
  vagas: vagas(22, 16),
});
assert.ok(
  bloqueioVaga.impedimentos.some((item) =>
    item.includes("menor que as vagas já utilizadas")
  )
);

const grade = resolverGradeMensalidades({
  vigenciaInicio: VIGENCIA,
  vigenciaFim: "2027-10-14",
  dia: 10,
  valorMensal: 340,
  efeito: {
    vigenciaInicio: VIGENCIA,
    numero: 4,
    valorAnterior: 270,
  },
});
assert.equal(grade.ok, true);
if (grade.ok) {
  assert.deepEqual(
    grade.parcelas.slice(0, 3).map((item) => item.valor),
    [270, 270, 270]
  );
  assert.ok(grade.parcelas.slice(3).every((item) => item.valor === 340));
  assert.equal(grade.parcelas.length, 12);
}

const comAlteracao = textoPlanoContrato(buildClausulasContrato(contexto(true)));
assert.match(comAlteracao, /não retroage ao início da vigência/);
assert.match(comAlteracao, /mensalidade 4/);
assert.doesNotMatch(
  comAlteracao,
  /valor bruto mensal de .+ mediante .+ mensalidades durante a vigência/
);
const semAlteracao = textoPlanoContrato(buildClausulasContrato(contexto(false)));
assert.match(
  semAlteracao,
  /valor bruto mensal de .+ mediante .+ mensalidades durante a vigência/
);
assert.doesNotMatch(semAlteracao, /não retroage ao início da vigência/);

const v1 = textoPlanoContrato(
  buildClausulasContrato({ ...contexto(true), modeloVersao: 1 })
);
assert.match(v1, /não retroage ao início da vigência/);
assert.doesNotMatch(
  v1,
  /valor mensal de .+ mediante .+ mensalidades durante a vigência/
);

const sql = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/157_alterar_contratacao_mensalidade.sql"
  ),
  "utf8"
);
assert.match(sql, /public\.is_admin_user\(\)/);
assert.match(sql, /update public\.orcamento_mensalidade_parcelas/);
assert.match(sql, /pago_em is null/);
assert.match(sql, /valor_recebido is null/);
assert.match(sql, /comprovante_path/);
assert.match(sql, /sem_vigencia_em is null/);
assert.match(sql, /substituido_em = now\(\)/);
assert.match(sql, /'pendente'/);
assert.match(sql, /check \(status = 'pendente'\)/);
assert.match(sql, /idempotencia uuid not null unique/);
assert.match(sql, /Os dados mudaram depois da prévia/);
assert.doesNotMatch(sql, /insert into public\.orcamento_mensalidade_parcelas/i);
assert.match(sql, /before update on public\.orcamento_mensalidade_parcelas/);
assert.doesNotMatch(sql, /before insert on public\.orcamento_mensalidade_parcelas/i);
assert.match(sql, /new\.valor is distinct from old\.valor/);
assert.doesNotMatch(sql, /update public\.agendamentos/i);
assert.doesNotMatch(sql, /update public\.periodicos/i);
assert.doesNotMatch(sql, /insert into public\.funcionarios/i);

const persistencia = planejarPersistenciaParcelas({
  existentes: [
    {
      vigenciaInicio: VIGENCIA,
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 270,
      pagoEmIso: null,
    },
  ],
  desejadas: [
    {
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 340,
      pagoEmIso: "2026-11-10",
    },
    {
      numero: 2,
      vencimentoIso: "2026-12-10",
      valor: 340,
      pagoEmIso: null,
    },
  ],
});
assert.deepEqual(persistencia.atualizarPagoEm, [
  { numero: 1, pagoEmIso: "2026-11-10" },
]);
assert.equal(persistencia.inserir.length, 1);
assert.equal(persistencia.inserir[0]?.numero, 2);
assert.equal(persistencia.inserir[0]?.valor, 340);

const parcelasService = fs.readFileSync(
  path.join(process.cwd(), "services/mensalidade-parcelas.service.ts"),
  "utf8"
);
const baixa = parcelasService.slice(
  parcelasService.indexOf("export async function registrarBaixaParcelaMensalidade")
);
assert.match(baixa, /pago_em: params\.pagoEmIso/);
assert.match(baixa, /valor_recebido: params\.valorRecebido/);
assert.doesNotMatch(baixa.slice(0, baixa.indexOf(".update(payload)")), /\n\s*valor:/);
assert.match(
  parcelasService.slice(
    parcelasService.indexOf("export async function inserirParcelasMensalidadeAusentes"),
    parcelasService.indexOf("export async function salvarObservacaoMensalidades")
  ),
  /\.insert\(/
);

const reversao = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/146_reverter_aprovacao_contrato_nao_assinado.sql"
  ),
  "utf8"
);
const reversaoParcelas = reversao.slice(
  reversao.indexOf("update public.orcamento_mensalidade_parcelas"),
  reversao.indexOf("update public.cliente_contratos")
);
assert.match(reversaoParcelas, /set sem_vigencia_em = now\(\)/);
assert.doesNotMatch(reversaoParcelas, /valor\s*=/);

console.log("OK  alterar contratacao");
