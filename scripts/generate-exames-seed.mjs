/**
 * Gera supabase/seeds/005_exames_seed.sql a partir de tabela-exames.csv (raiz do projeto).
 * Colunas: EXAMES | CUSTO | NAVARRO | CUSTOS | NAVARRO
 * Usa CUSTOS (custo clínica) e NAVARRO final (valor de venda).
 *
 * Uso: node scripts/generate-exames-seed.mjs [caminho-do-csv]
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DEFAULT_CSV = resolve(root, "tabela-exames.csv");

const TARGET_CLINICS = [
  "AL ASSESSORIA",
  "BC WORK",
  "ENGSEGTRA",
  "LABORMESP JABAQUARA",
  "LABORMESP IPIRANGA",
  "PREZERVARE",
  "PREVINE",
  "PRIME",
  "SPIX",
];

/**
 * No CSV a marca aparece como "LABORMESP"; no banco cada unidade é clínica separada.
 */
const CLINIC_SEED_UNITS = {
  LABORMESP: ["LABORMESP JABAQUARA", "LABORMESP IPIRANGA"],
};

/** Preços por unidade quando diferem da matriz genérica LABORMESP. */
const UNIT_PRICE_OVERRIDES = [
  {
    clinica: "LABORMESP JABAQUARA",
    exame: "RX Tórax - PA",
    custos: 90,
    navarro: 105,
  },
  {
    clinica: "LABORMESP JABAQUARA",
    exame: "RX Tórax - PA + PERFIL",
    custos: 50,
    navarro: 77,
  },
  {
    clinica: "LABORMESP IPIRANGA",
    exame: "RX Tórax - PA",
    custos: 48.9,
    navarro: 77,
  },
  {
    clinica: "LABORMESP IPIRANGA",
    exame: "RX Tórax - PA + PERFIL",
    custos: 48.9,
    navarro: 77,
  },
];

/** Marcas que devem existir no CSV (LABORMESP é expandida para unidades no seed). */
const CSV_REQUIRED_CLINICS = [
  "BC WORK",
  "ENGSEGTRA",
  "LABORMESP",
  "PREZERVARE",
  "PREVINE",
  "PRIME",
  "SPIX",
];

const CLINIC_MATCH_ORDER = [
  "AL ASSESSORIA",
  "BC WORK",
  "ENGSEGTRA",
  "LABORMESP",
  "PREZERVARE",
  "PREVINE",
  "PRIME",
  "SPIX",
];

/**
 * Clínicas com vínculos definidos fora do CSV.
 * AL ASSESSORIA: somente Clínico (preço manual no agendamento; valores 0 no seed).
 */
const MANUAL_CLINIC_LINKS = [
  {
    clinica: "AL ASSESSORIA",
    exame: "Clínico",
    custos: 0,
    navarro: 0,
  },
];

function parseMoneyBr(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s || s === "-" || s === "—" || /^R\$\s*-+\s*$/i.test(s)) return null;
  const n = Number(
    s
      .replace(/R\$\s?/gi, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "")
  );
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function splitExameClinica(raw) {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return null;

  for (const clinica of CLINIC_MATCH_ORDER) {
    const suffix = ` ${clinica}`;
    if (text.endsWith(suffix) || text.toUpperCase().endsWith(suffix.toUpperCase())) {
      const exame = text.slice(0, -suffix.length).trim();
      if (!exame) return null;
      return { exame, clinica };
    }
  }

  return null;
}

function guessCategoria(nome) {
  const n = nome.toLowerCase();
  if (n === "clínico" || n.includes("ppf") || n.includes("audiometria"))
    return "Ocupacional";
  if (
    n.includes("glicemia") ||
    n.includes("hemograma") ||
    n.includes("toxicol") ||
    n.includes("hepatite") ||
    n.includes("gama gt")
  )
    return "Laboratorial";
  if (
    n.includes("ecg") ||
    n.includes("eeg") ||
    n.includes("rx") ||
    n.includes("oftalmol")
  )
    return "Complementar";
  return "Outros";
}

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlNum(n) {
  return n.toFixed(2);
}

const csvPath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_CSV;
let content;
try {
  content = readFileSync(csvPath, "utf8");
} catch {
  console.error("CSV não encontrado:", csvPath);
  process.exit(1);
}

const lines = content.split(/\r?\n/).filter((l) => l.trim());
const exameNavarro = new Map();
const clinicaExameLinks = new Map();
const clinicasFound = new Set();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.includes(";")) continue;

  const cols = line.split(";").map((c) => c.trim());
  const examesCol = cols[0] ?? "";

  if (!examesCol || examesCol.toUpperCase() === "EXAMES") continue;

  const parsed = splitExameClinica(examesCol);
  if (!parsed) {
    console.warn(`Linha ${i + 1}: não foi possível separar exame/clínica: ${examesCol}`);
    continue;
  }

  const { exame, clinica } = parsed;
  clinicasFound.add(clinica);

  const custos = parseMoneyBr(cols[3]);
  const navarro = parseMoneyBr(cols[4]);

  if (navarro !== null) {
    const prev = exameNavarro.get(exame);
    if (prev === undefined || navarro < prev) {
      exameNavarro.set(exame, navarro);
    }
  }

  if (custos === null || navarro === null) continue;

  const unitNames = CLINIC_SEED_UNITS[clinica] ?? [clinica];
  for (const unit of unitNames) {
    const key = `${unit}::${exame}`;
    clinicaExameLinks.set(key, { clinica: unit, exame, custos, navarro });
  }
}

for (const link of MANUAL_CLINIC_LINKS) {
  const key = `${link.clinica}::${link.exame}`;
  clinicaExameLinks.set(key, link);
  clinicasFound.add(link.clinica);
}

for (const override of UNIT_PRICE_OVERRIDES) {
  const key = `${override.clinica}::${override.exame}`;
  clinicaExameLinks.set(key, override);
}

const missingClinics = CSV_REQUIRED_CLINICS.filter((c) => !clinicasFound.has(c));
if (missingClinics.length > 0) {
  console.error("Clínicas obrigatórias não encontradas no CSV:", missingClinics.join(", "));
  process.exit(1);
}

const examesSorted = [...exameNavarro.entries()].sort((a, b) =>
  a[0].localeCompare(b[0], "pt-BR")
);

let sql = `-- Seed gerado automaticamente de: ${csvPath.replace(/\\/g, "/")}
-- Matriz EXAMES | CUSTOS | NAVARRO (tabela-exames.csv)
-- exames.valor_navarro = menor NAVARRO (referência do catálogo)
-- clinica_exames.custo_clinica = CUSTOS | clinica_exames.valor_navarro = NAVARRO (preço no agendamento)
-- AL ASSESSORIA: somente Clínico (valores 0; preço manual no agendamento)
-- LABORMESP: unidades LABORMESP JABAQUARA e LABORMESP IPIRANGA (RX com preços distintos)

-- Remove vínculos antigos das clínicas alvo (reimportação idempotente)
delete from public.clinica_exames
where clinica_id in (
  select id from public.clinicas
  where nome_fantasia in (${TARGET_CLINICS.map(sqlStr).join(", ")})
);

`;

sql += `-- Clínicas (criar se não existirem)\n`;
for (const nome of TARGET_CLINICS) {
  sql += `insert into public.clinicas (
  razao_social, nome_fantasia, cnpj, responsavel, telefone, email,
  cidade, estado, status
)
select ${sqlStr(nome)}, ${sqlStr(nome)}, '00.000.000/0001-00', 'Importação', '0000-0000',
  ${sqlStr("importacao@navarro.com.br")}, ${sqlStr("São Paulo")}, ${sqlStr("SP")}, 'ativa'
where not exists (
  select 1 from public.clinicas where nome_fantasia = ${sqlStr(nome)}
);

`;
}

sql += `-- Catálogo de exames (upsert por nome; valor_navarro = menor NAVARRO da matriz)\n`;
for (const [nome, valor] of examesSorted) {
  const cat = guessCategoria(nome);
  sql += `insert into public.exames (nome, categoria, valor_navarro, ativo)
values (${sqlStr(nome)}, ${sqlStr(cat)}, ${sqlNum(valor)}, true)
on conflict (nome) do update set
  valor_navarro = excluded.valor_navarro,
  categoria = excluded.categoria,
  ativo = true,
  updated_at = now();

`;
}

sql += `-- Vínculos clínica × exame (custo + valor Navarro por clínica)\n`;
const links = [...clinicaExameLinks.values()].sort(
  (a, b) =>
    a.clinica.localeCompare(b.clinica, "pt-BR") ||
    a.exame.localeCompare(b.exame, "pt-BR")
);

for (const link of links) {
  const manualNote =
    link.clinica === "AL ASSESSORIA"
      ? "-- AL ASSESSORIA: apenas Clínico; agendamento usa preço manual\n"
      : "";
  sql += manualNote;
  sql += `insert into public.clinica_exames (clinica_id, exame_id, custo_clinica, valor_navarro, ativo)
select c.id, e.id, ${sqlNum(link.custos)}, ${sqlNum(link.navarro)}, true
from public.clinicas c
cross join public.exames e
where c.nome_fantasia = ${sqlStr(link.clinica)}
  and e.nome = ${sqlStr(link.exame)}
on conflict (clinica_id, exame_id) do update set
  custo_clinica = excluded.custo_clinica,
  valor_navarro = excluded.valor_navarro,
  ativo = true,
  updated_at = now();

`;
}

sql += `-- Inativar LABORMESP genérica (histórico preservado; agendamento usa unidades)\n`;
sql += `update public.clinicas
set status = 'inativa', updated_at = now()
where nome_fantasia = 'LABORMESP'
  and status = 'ativa';

`;

const outPath = resolve(root, "supabase/seeds/005_exames_seed.sql");
writeFileSync(outPath, sql, "utf8");

const byClinica = {};
for (const l of links) {
  byClinica[l.clinica] = (byClinica[l.clinica] ?? 0) + 1;
}

console.log("=== Resumo do seed ===");
console.log("Fonte:", csvPath);
console.log("Exames únicos (catálogo):", examesSorted.length);
console.log("Clínicas alvo:", TARGET_CLINICS.length);
console.log("Clínicas encontradas no CSV:", [...clinicasFound].sort().join(", "));
console.log("Vínculos clinica_exames:", links.length);
console.log("Por clínica:", byClinica);
console.log("Arquivo gerado:", outPath);
