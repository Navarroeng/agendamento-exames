import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const EXCEL_PATH =
  process.argv[2] ??
  "c:/Users/AGATHA/Desktop/Clientes.xlsx";
const OUT_SQL = path.join(
  root,
  "supabase",
  "seeds",
  "025_import_clientes.sql"
);

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function maskCNPJ(digits) {
  const d = onlyDigits(digits).slice(0, 14);
  if (d.length !== 14) return null;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function escapeSql(value) {
  return value.replace(/'/g, "''");
}

function readRows() {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function main() {
  const rawRows = readRows();
  const seen = new Map();
  const valid = [];
  const invalid = [];
  const duplicatesInSheet = [];

  for (const row of rawRows) {
    const nome = String(row["Nome da empresa"] ?? "").trim();
    const cnpjRaw = String(row["CNPJ"] ?? "").trim();
    const digits = onlyDigits(cnpjRaw);

    if (!nome || digits.length !== 14) {
      invalid.push({ nome, cnpj: cnpjRaw, reason: "nome vazio ou CNPJ inválido" });
      continue;
    }

    if (seen.has(digits)) {
      duplicatesInSheet.push({ nome, cnpj: maskCNPJ(digits), first: seen.get(digits) });
      continue;
    }

    const formatted = maskCNPJ(digits);
    seen.set(digits, nome);
    valid.push({ nome, cnpj: formatted, digits });
  }

  const valuesSql = valid
    .map(
      (item) =>
        `  ('${escapeSql(item.nome)}', '${escapeSql(item.cnpj)}')`
    )
    .join(",\n");

  const sql = `-- Importação de clientes a partir de Clientes.xlsx
-- Gerado em: ${new Date().toISOString().slice(0, 10)}
-- Fonte: ${EXCEL_PATH.replace(/\\/g, "/")}
--
-- Estrutura alvo: public.clientes (nome, cnpj obrigatórios)
-- Colunas opcionais legadas: contato, telefone, email (não preenchidas)
-- Observação: a tabela clientes não possui coluna status; clientes importados
-- ficam disponíveis normalmente no sistema (equivalente a "Ativo").
--
-- Resumo da planilha:
--   Total de linhas lidas: ${rawRows.length}
--   Válidos e únicos na planilha: ${valid.length}
--   Duplicados na planilha (ignorados): ${duplicatesInSheet.length}
--   Inválidos na planilha (ignorados): ${invalid.length}
--
-- ============================================================
-- 1) DIAGNÓSTICO (execute primeiro para ver o que será feito)
-- ============================================================

-- Quantos CNPJs da planilha já existem no banco?
with planilha (nome, cnpj) as (
  values
${valuesSql}
),
planilha_norm as (
  select
    nome,
    cnpj,
    regexp_replace(cnpj, '[^0-9]', '', 'g') as cnpj_digits
  from planilha
)
select
  count(*) filter (
    where exists (
      select 1
      from public.clientes c
      where regexp_replace(c.cnpj, '[^0-9]', '', 'g') = p.cnpj_digits
    )
  ) as ja_existem,
  count(*) filter (
    where not exists (
      select 1
      from public.clientes c
      where regexp_replace(c.cnpj, '[^0-9]', '', 'g') = p.cnpj_digits
    )
  ) as serao_inseridos
from planilha_norm p;

-- Listagem dos que já existem (CNPJ duplicado no banco)
with planilha (nome, cnpj) as (
  values
${valuesSql}
),
planilha_norm as (
  select
    nome,
    cnpj,
    regexp_replace(cnpj, '[^0-9]', '', 'g') as cnpj_digits
  from planilha
)
select
  p.nome as nome_planilha,
  p.cnpj as cnpj_planilha,
  c.nome as nome_existente,
  c.cnpj as cnpj_existente
from planilha_norm p
inner join public.clientes c
  on regexp_replace(c.cnpj, '[^0-9]', '', 'g') = p.cnpj_digits
order by p.nome;

-- ============================================================
-- 2) IMPORTAÇÃO (execute após revisar o diagnóstico)
-- ============================================================
-- Novos registros: insere apenas CNPJs que ainda não existem.
-- Duplicados: atualiza o nome do cliente existente quando diferente.

insert into public.clientes (nome, cnpj)
select v.nome, v.cnpj
from (
  values
${valuesSql}
) as v(nome, cnpj)
where not exists (
  select 1
  from public.clientes c
  where regexp_replace(c.cnpj, '[^0-9]', '', 'g')
      = regexp_replace(v.cnpj, '[^0-9]', '', 'g')
);

-- Atualiza cadastro existente (mesmo CNPJ, nome diferente na planilha)
update public.clientes c
set nome = v.nome
from (
  values
${valuesSql}
) as v(nome, cnpj)
where regexp_replace(c.cnpj, '[^0-9]', '', 'g')
    = regexp_replace(v.cnpj, '[^0-9]', '', 'g')
  and c.nome is distinct from v.nome;

-- ============================================================
-- 2b) LOG DE DUPLICADOS / ATUALIZAÇÕES (somente leitura)
-- ============================================================

-- Registros da planilha cujo CNPJ já existia (inserção ignorada; nome pode ter sido atualizado acima)
with planilha (nome, cnpj) as (
  values
${valuesSql}
),
planilha_norm as (
  select
    nome,
    cnpj,
    regexp_replace(cnpj, '[^0-9]', '', 'g') as cnpj_digits
  from planilha
)
select
  'duplicado_ignorado_ou_atualizado' as tipo,
  p.nome as nome_planilha,
  p.cnpj as cnpj_planilha,
  c.nome as nome_atual_banco,
  c.cnpj as cnpj_atual_banco
from planilha_norm p
inner join public.clientes c
  on regexp_replace(c.cnpj, '[^0-9]', '', 'g') = p.cnpj_digits
order by p.nome;

-- ============================================================
-- 3) VERIFICAÇÃO PÓS-IMPORTAÇÃO
-- ============================================================

select count(*) as total_clientes
from public.clientes;
`;

  fs.mkdirSync(path.dirname(OUT_SQL), { recursive: true });
  fs.writeFileSync(OUT_SQL, sql, "utf8");

  const report = {
    excelPath: EXCEL_PATH,
    outputSql: OUT_SQL,
    totalRows: rawRows.length,
    validUnique: valid.length,
    duplicatesInSheet: duplicatesInSheet.length,
    invalid: invalid.length,
    duplicatesInSheetList: duplicatesInSheet,
    invalidList: invalid,
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
