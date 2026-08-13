import { normalizeCpfDigits } from "@/lib/cpf";
import {
  CpfCampanhaAtivaError,
  formatMotivoIgnoradoImportacao,
  type CpfCampanhaAtivaConflict,
} from "@/lib/riscos-cpf-campanha-ativa";
import { RISCOS_CAMPANHA_STATUS_ATIVOS } from "@/lib/riscos-campanha-origem";
import {
  gerarCodigoAcessoParticipante,
  validateRiscosParticipanteInput,
  type RiscosCampanhaParticipanteRecord,
  type RiscosParticipanteInput,
  type RiscosParticipanteOrigem,
  type RiscosParticipanteStatus,
  isRiscosParticipanteStatus,
} from "@/lib/riscos-campanha-participantes";
import {
  campanhaPermiteImportacaoParticipantes,
  type SituacaoImportacaoParticipante,
} from "@/lib/riscos-participantes-excel";
import { parseDataNascimentoBr } from "@/lib/date-br";
import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/services/auditoria.service";

const PARTICIPANTE_SELECT =
  "id, campanha_id, orcamento_id, cliente_id, nome_completo, cpf, data_nascimento, cargo, setor, email, status, codigo_acesso, origem, criado_por, created_at, updated_at, removido_em";

function mapParticipante(
  row: Record<string, unknown>
): RiscosCampanhaParticipanteRecord {
  const statusRaw = String(row.status ?? "pendente");
  const status: RiscosParticipanteStatus = isRiscosParticipanteStatus(statusRaw)
    ? statusRaw
    : "pendente";
  const origemRaw = String(row.origem ?? "manual");
  const origem: RiscosParticipanteOrigem =
    origemRaw === "importacao" ? "importacao" : "manual";

  return {
    id: String(row.id),
    campanha_id: String(row.campanha_id),
    orcamento_id: row.orcamento_id ? String(row.orcamento_id) : null,
    cliente_id: row.cliente_id ? String(row.cliente_id) : null,
    nome_completo: String(row.nome_completo ?? ""),
    cpf: String(row.cpf ?? ""),
    data_nascimento: row.data_nascimento
      ? String(row.data_nascimento).slice(0, 10)
      : null,
    cargo: row.cargo ? String(row.cargo) : null,
    setor: row.setor ? String(row.setor) : null,
    email: row.email ? String(row.email) : null,
    status,
    codigo_acesso: String(row.codigo_acesso ?? ""),
    origem,
    criado_por: row.criado_por ? String(row.criado_por) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
    removido_em: row.removido_em ? String(row.removido_em) : null,
  };
}

/**
 * Busca CPF em qualquer campanha ativa (global).
 * excludeParticipanteId: ao editar, ignora o próprio registro.
 * excludeCampanhaId: se informado e o conflito for nesta campanha, retorna null
 *   (duplicidade intra-campanha é tratada à parte).
 */
export async function buscarCpfEmOutraCampanhaAtiva(input: {
  cpf: string;
  excludeParticipanteId?: string | null;
  /** Se o conflito for nesta campanha, não retorna (deixar regra local). */
  ignoreIfSameCampanhaId?: string | null;
}): Promise<CpfCampanhaAtivaConflict | null> {
  const cpf = normalizeCpfDigits(input.cpf);
  if (cpf.length !== 11) return null;

  const admin = createAdminClient();
  let query = admin
    .from("riscos_campanha_participantes")
    .select(
      "id, campanha_id, status, removido_em, riscos_campanhas!inner(id, empresa_nome, codigo_publico, status)"
    )
    .eq("cpf", cpf)
    .in("riscos_campanhas.status", [...RISCOS_CAMPANHA_STATUS_ATIVOS])
    .is("removido_em", null)
    .not("status", "in", '("removido","invalidado")')
    .limit(5);

  if (input.excludeParticipanteId) {
    query = query.neq("id", input.excludeParticipanteId);
  }

  const { data, error } = await query;
  if (error) {
    // Fallback sem embed se o nome da FK falhar
    if (/riscos_campanhas|relationship/i.test(error.message ?? "")) {
      return buscarCpfEmOutraCampanhaAtivaFallback(input);
    }
    throw error;
  }

  for (const row of data ?? []) {
    const campanhaRaw = row.riscos_campanhas as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null;
    const campanha = Array.isArray(campanhaRaw)
      ? campanhaRaw[0]
      : campanhaRaw;
    if (!campanha) continue;
    const campanhaId = String(campanha.id ?? row.campanha_id);
    if (
      input.ignoreIfSameCampanhaId &&
      campanhaId === input.ignoreIfSameCampanhaId
    ) {
      continue;
    }
    return {
      participanteId: String(row.id),
      campanhaId,
      empresaNome: String(campanha.empresa_nome ?? ""),
      codigoPublico: String(campanha.codigo_publico ?? ""),
      status: String(campanha.status ?? ""),
    };
  }
  return null;
}

async function buscarCpfEmOutraCampanhaAtivaFallback(input: {
  cpf: string;
  excludeParticipanteId?: string | null;
  ignoreIfSameCampanhaId?: string | null;
}): Promise<CpfCampanhaAtivaConflict | null> {
  const cpf = normalizeCpfDigits(input.cpf);
  const admin = createAdminClient();

  let pQuery = admin
    .from("riscos_campanha_participantes")
    .select("id, campanha_id, status, removido_em")
    .eq("cpf", cpf)
    .is("removido_em", null)
    .not("status", "in", '("removido","invalidado")');

  if (input.excludeParticipanteId) {
    pQuery = pQuery.neq("id", input.excludeParticipanteId);
  }

  const { data: parts, error: pErr } = await pQuery;
  if (pErr) throw pErr;
  if (!parts?.length) return null;

  const campanhaIds = Array.from(
    new Set(parts.map((p) => String(p.campanha_id)))
  );
  const { data: camps, error: cErr } = await admin
    .from("riscos_campanhas")
    .select("id, empresa_nome, codigo_publico, status")
    .in("id", campanhaIds)
    .in("status", [...RISCOS_CAMPANHA_STATUS_ATIVOS]);
  if (cErr) throw cErr;

  const byId = new Map(
    (camps ?? []).map((c) => [String(c.id), c as Record<string, unknown>])
  );

  for (const p of parts) {
    const campanhaId = String(p.campanha_id);
    if (
      input.ignoreIfSameCampanhaId &&
      campanhaId === input.ignoreIfSameCampanhaId
    ) {
      continue;
    }
    const campanha = byId.get(campanhaId);
    if (!campanha) continue;
    return {
      participanteId: String(p.id),
      campanhaId,
      empresaNome: String(campanha.empresa_nome ?? ""),
      codigoPublico: String(campanha.codigo_publico ?? ""),
      status: String(campanha.status ?? ""),
    };
  }
  return null;
}

export async function assertCpfLivreParaCampanhaAtiva(input: {
  cpf: string;
  campanhaId: string;
  excludeParticipanteId?: string | null;
}): Promise<void> {
  const conflict = await buscarCpfEmOutraCampanhaAtiva({
    cpf: input.cpf,
    excludeParticipanteId: input.excludeParticipanteId,
    ignoreIfSameCampanhaId: input.campanhaId,
  });
  if (conflict) throw new CpfCampanhaAtivaError(conflict);
}

async function gerarCodigoAcessoUnico(): Promise<string> {
  const admin = createAdminClient();
  for (let i = 0; i < 12; i += 1) {
    const codigo = gerarCodigoAcessoParticipante(8);
    const { data, error } = await admin
      .from("riscos_campanha_participantes")
      .select("id")
      .eq("codigo_acesso", codigo)
      .maybeSingle();
    if (error) throw error;
    if (!data) return codigo;
  }
  throw new Error("Não foi possível gerar o identificador do participante.");
}

async function buscarCampanha(campanhaId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("riscos_campanhas")
    .select(
      "id, orcamento_id, cliente_id, cnpj, empresa_nome, codigo_publico, quantidade_prevista, status"
    )
    .eq("id", campanhaId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function assertCpfLivreNaMesmaCampanha(input: {
  campanhaId: string;
  cpf: string;
  excludeParticipanteId?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  let q = admin
    .from("riscos_campanha_participantes")
    .select("id")
    .eq("campanha_id", input.campanhaId)
    .eq("cpf", input.cpf)
    .is("removido_em", null)
    .not("status", "in", '("removido","invalidado")');
  if (input.excludeParticipanteId) {
    q = q.neq("id", input.excludeParticipanteId);
  }
  const { data, error } = await q.maybeSingle();
  if (error && /removido_em/i.test(error.message ?? "")) {
    let fb = admin
      .from("riscos_campanha_participantes")
      .select("id")
      .eq("campanha_id", input.campanhaId)
      .eq("cpf", input.cpf)
      .not("status", "in", '("removido","invalidado")');
    if (input.excludeParticipanteId) {
      fb = fb.neq("id", input.excludeParticipanteId);
    }
    const r = await fb.maybeSingle();
    if (r.error) throw r.error;
    if (r.data) {
      throw new Error("Já existe um participante com este CPF nesta pesquisa.");
    }
    return;
  }
  if (error) throw error;
  if (data) {
    throw new Error("Já existe um participante com este CPF nesta pesquisa.");
  }
}

export async function criarParticipanteCampanhaNoServidor(
  params: {
    campanhaId: string;
    input: RiscosParticipanteInput;
    origem?: RiscosParticipanteOrigem;
  },
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosCampanhaParticipanteRecord> {
  const validationError = validateRiscosParticipanteInput(params.input);
  if (validationError) throw new Error(validationError);

  const campanha = await buscarCampanha(params.campanhaId);
  if (!campanha) throw new Error("Campanha/pesquisa não encontrada.");

  const bloqueio = campanhaPermiteImportacaoParticipantes(
    String(campanha.status ?? "")
  );
  if (bloqueio) throw new Error(bloqueio);

  const cpf = normalizeCpfDigits(params.input.cpf);
  await assertCpfLivreNaMesmaCampanha({
    campanhaId: campanha.id,
    cpf,
  });
  await assertCpfLivreParaCampanhaAtiva({
    cpf,
    campanhaId: campanha.id,
  });

  const dataNascimento = parseDataNascimentoBr(params.input.dataNascimento);
  if (!dataNascimento) {
    throw new Error("Informe a data de nascimento (DD/MM/AAAA).");
  }

  const codigo = await gerarCodigoAcessoUnico();
  const usuarioNome = auditOptions?.auditContext?.usuarioNome?.trim() || null;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("riscos_campanha_participantes")
    .insert({
      campanha_id: campanha.id,
      orcamento_id: campanha.orcamento_id || null,
      cliente_id: campanha.cliente_id,
      nome_completo: params.input.nomeCompleto.trim(),
      cpf,
      data_nascimento: dataNascimento,
      cargo: null,
      setor: null,
      email: null,
      status: "pendente",
      codigo_acesso: codigo,
      origem: params.origem ?? "manual",
      criado_por: usuarioNome,
    })
    .select(PARTICIPANTE_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      const conflict = await buscarCpfEmOutraCampanhaAtiva({
        cpf,
        ignoreIfSameCampanhaId: campanha.id,
      });
      if (conflict) throw new CpfCampanhaAtivaError(conflict);
      throw new Error("Já existe um participante com este CPF nesta pesquisa.");
    }
    throw error;
  }
  if (!data) throw new Error("Não foi possível cadastrar o participante.");

  const record = mapParticipante(data as Record<string, unknown>);
  const nome = usuarioNome ?? "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_participante_criado,
    registroId: record.id,
    registroNome: record.nome_completo,
    descricao: `${nome} cadastrou o participante ${record.nome_completo} na pesquisa ${campanha.codigo_publico}.`,
    dadosDepois: {
      campanha_id: record.campanha_id,
      cpf: record.cpf,
      status: record.status,
    },
  });

  return record;
}

export async function atualizarParticipanteCampanhaNoServidor(
  params: {
    participanteId: string;
    input: RiscosParticipanteInput;
  },
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosCampanhaParticipanteRecord> {
  const validationError = validateRiscosParticipanteInput(params.input);
  if (validationError) throw new Error(validationError);

  const admin = createAdminClient();
  const { data: atual, error: findErr } = await admin
    .from("riscos_campanha_participantes")
    .select(PARTICIPANTE_SELECT)
    .eq("id", params.participanteId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!atual) throw new Error("Participante não encontrado.");

  const before = mapParticipante(atual as Record<string, unknown>);
  if (before.status !== "pendente") {
    throw new Error(
      "Só é possível editar participantes com status Pendente (ainda não iniciaram o questionário)."
    );
  }
  const cpf = normalizeCpfDigits(params.input.cpf);
  const dataNascimento = parseDataNascimentoBr(params.input.dataNascimento);
  if (!dataNascimento) {
    throw new Error("Informe a data de nascimento (DD/MM/AAAA).");
  }

  if (cpf !== before.cpf) {
    await assertCpfLivreNaMesmaCampanha({
      campanhaId: before.campanha_id,
      cpf,
      excludeParticipanteId: before.id,
    });
    await assertCpfLivreParaCampanhaAtiva({
      cpf,
      campanhaId: before.campanha_id,
      excludeParticipanteId: before.id,
    });
  }

  const { data, error } = await admin
    .from("riscos_campanha_participantes")
    .update({
      nome_completo: params.input.nomeCompleto.trim(),
      cpf,
      data_nascimento: dataNascimento,
    })
    .eq("id", params.participanteId)
    .select(PARTICIPANTE_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      const conflict = await buscarCpfEmOutraCampanhaAtiva({
        cpf,
        excludeParticipanteId: before.id,
        ignoreIfSameCampanhaId: before.campanha_id,
      });
      if (conflict) throw new CpfCampanhaAtivaError(conflict);
      throw new Error("Já existe um participante com este CPF nesta pesquisa.");
    }
    throw error;
  }
  if (!data) throw new Error("Não foi possível atualizar o participante.");

  const record = mapParticipante(data as Record<string, unknown>);
  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_participante_editado,
    registroId: record.id,
    registroNome: record.nome_completo,
    descricao: `${nome} editou o participante ${record.nome_completo}.`,
    dadosAntes: {
      nome_completo: before.nome_completo,
      cpf: before.cpf,
      email: before.email,
    },
    dadosDepois: {
      nome_completo: record.nome_completo,
      cpf: record.cpf,
      email: record.email,
    },
  });

  return record;
}

export type ImportacaoParticipanteLinha = RiscosParticipanteInput & {
  linha?: number;
};

export type ImportacaoParticipantesResultado = {
  importados: number;
  ignorados: number;
  erros: Array<{ linha?: number; cpf: string; motivo: string }>;
  participantes: RiscosCampanhaParticipanteRecord[];
};

export type ValidacaoImportacaoLinhaResultado = {
  linha: number;
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  email: string;
  situacao: SituacaoImportacaoParticipante;
  motivo: string;
  pronto: boolean;
};

export type ValidacaoImportacaoResultado = {
  linhas: ValidacaoImportacaoLinhaResultado[];
  validos: number;
  comErro: number;
  campanhaBloqueada: string | null;
};

function mapMotivoToSituacao(
  motivo: string
): SituacaoImportacaoParticipante {
  const m = motivo.toLowerCase();
  if (m.includes("cancelada") || m.includes("encerrada") || m.includes("não está disponível")) {
    return "campanha_bloqueada";
  }
  if (m.includes("outra campanha")) return "cpf_outra_campanha_ativa";
  if (m.includes("já existe") || m.includes("nesta pesquisa") || m.includes("nesta campanha")) {
    return "cpf_ja_na_campanha";
  }
  if (m.includes("duplicado no arquivo")) return "cpf_duplicado_arquivo";
  if (m.includes("nome")) return "nome_obrigatorio";
  if (m.includes("cpf")) return "cpf_invalido";
  if (m.includes("nascimento") || m.includes("data")) return "data_invalida";
  return "erro";
}

/**
 * Pré-valida a importação (sem gravar), com as mesmas regras do cadastro manual.
 */
export async function validarImportacaoParticipantesNoServidor(params: {
  campanhaId: string;
  linhas: ImportacaoParticipanteLinha[];
}): Promise<ValidacaoImportacaoResultado> {
  const campanha = await buscarCampanha(params.campanhaId);
  if (!campanha) throw new Error("Campanha/pesquisa não encontrada.");

  const campanhaBloqueada = campanhaPermiteImportacaoParticipantes(
    String(campanha.status ?? "")
  );

  const linhas: ValidacaoImportacaoLinhaResultado[] = [];
  const cpfNoArquivo = new Map<string, number>();

  for (const raw of params.linhas) {
    const linhaNum = raw.linha ?? linhas.length + 2;
    const nomeCompleto = String(raw.nomeCompleto ?? "").trim();
    const cpfRaw = String(raw.cpf ?? "").trim();
    const dataNascimento = String(raw.dataNascimento ?? "").trim();
    const cpf = normalizeCpfDigits(cpfRaw);

    const base = {
      linha: linhaNum,
      nomeCompleto,
      cpf: cpfRaw || cpf,
      dataNascimento,
      email: "",
    };

    if (campanhaBloqueada) {
      linhas.push({
        ...base,
        situacao: "campanha_bloqueada",
        motivo: campanhaBloqueada,
        pronto: false,
      });
      continue;
    }

    if (!nomeCompleto && !cpfRaw && !dataNascimento) {
      linhas.push({
        ...base,
        situacao: "linha_vazia",
        motivo: "Linha vazia",
        pronto: false,
      });
      continue;
    }

    const validationError = validateRiscosParticipanteInput({
      nomeCompleto,
      cpf: cpfRaw,
      dataNascimento,
    });
    if (validationError) {
      linhas.push({
        ...base,
        situacao: mapMotivoToSituacao(validationError),
        motivo: validationError,
        pronto: false,
      });
      continue;
    }

    const primeira = cpfNoArquivo.get(cpf);
    if (primeira != null) {
      linhas.push({
        ...base,
        situacao: "cpf_duplicado_arquivo",
        motivo: `CPF duplicado no arquivo (já na linha ${primeira}).`,
        pronto: false,
      });
      continue;
    }
    cpfNoArquivo.set(cpf, linhaNum);

    try {
      await assertCpfLivreNaMesmaCampanha({
        campanhaId: params.campanhaId,
        cpf,
      });
    } catch (err) {
      const motivo =
        err instanceof Error
          ? err.message
          : "CPF já cadastrado nesta campanha.";
      linhas.push({
        ...base,
        situacao: "cpf_ja_na_campanha",
        motivo:
          motivo.includes("Já existe")
            ? "CPF já cadastrado nesta campanha."
            : motivo,
        pronto: false,
      });
      continue;
    }

    const conflict = await buscarCpfEmOutraCampanhaAtiva({
      cpf,
      ignoreIfSameCampanhaId: params.campanhaId,
    });
    if (conflict) {
      linhas.push({
        ...base,
        situacao: "cpf_outra_campanha_ativa",
        motivo: formatMotivoIgnoradoImportacao(conflict),
        pronto: false,
      });
      continue;
    }

    linhas.push({
      ...base,
      situacao: "pronto",
      motivo: "✓ Pronto para importar",
      pronto: true,
    });
  }

  const validos = linhas.filter((l) => l.pronto).length;
  return {
    linhas,
    validos,
    comErro: linhas.length - validos,
    campanhaBloqueada,
  };
}

export async function importarParticipantesCampanhaNoServidor(
  params: {
    campanhaId: string;
    linhas: ImportacaoParticipanteLinha[];
  },
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<ImportacaoParticipantesResultado> {
  const campanha = await buscarCampanha(params.campanhaId);
  if (!campanha) throw new Error("Campanha/pesquisa não encontrada.");

  const bloqueio = campanhaPermiteImportacaoParticipantes(
    String(campanha.status ?? "")
  );
  if (bloqueio) throw new Error(bloqueio);

  const erros: ImportacaoParticipantesResultado["erros"] = [];
  const participantes: RiscosCampanhaParticipanteRecord[] = [];
  let importados = 0;
  let ignorados = 0;

  const validacao = await validarImportacaoParticipantesNoServidor(params);
  const prontas = validacao.linhas.filter((l) => l.pronto);
  for (const l of validacao.linhas) {
    if (l.pronto) continue;
    ignorados += 1;
    erros.push({
      linha: l.linha,
      cpf: normalizeCpfDigits(l.cpf) || l.cpf,
      motivo: l.motivo,
    });
  }

  if (prontas.length === 0) {
    return { importados: 0, ignorados, erros, participantes };
  }

  const admin = createAdminClient();
  const usuarioNome = auditOptions?.auditContext?.usuarioNome?.trim() || null;
  const inserts: Record<string, unknown>[] = [];

  for (const linha of prontas) {
    const raw = params.linhas.find((p) => (p.linha ?? -1) === linha.linha);
    const dataNascimento = parseDataNascimentoBr(
      raw?.dataNascimento ?? linha.dataNascimento
    );
    if (!dataNascimento) {
      ignorados += 1;
      erros.push({
        linha: linha.linha,
        cpf: normalizeCpfDigits(linha.cpf),
        motivo: "Informe a data de nascimento (DD/MM/AAAA).",
      });
      continue;
    }
    const codigo = await gerarCodigoAcessoUnico();
    inserts.push({
      campanha_id: campanha.id,
      orcamento_id: campanha.orcamento_id || null,
      cliente_id: campanha.cliente_id,
      nome_completo: (raw?.nomeCompleto ?? linha.nomeCompleto).trim(),
      cpf: normalizeCpfDigits(raw?.cpf ?? linha.cpf),
      data_nascimento: dataNascimento,
      cargo: null,
      setor: null,
      email: null,
      status: "pendente",
      codigo_acesso: codigo,
      origem: "importacao",
      criado_por: usuarioNome,
    });
  }

  // Insert em lote (preserva validações por linha já feitas acima).
  const BATCH = 100;
  for (let i = 0; i < inserts.length; i += BATCH) {
    const chunk = inserts.slice(i, i + BATCH);
    const { data, error } = await admin
      .from("riscos_campanha_participantes")
      .insert(chunk)
      .select(PARTICIPANTE_SELECT);

    if (error) {
      // Fallback: tenta um a um para preservar mensagens por linha.
      for (const row of chunk) {
        try {
          const record = await criarParticipanteCampanhaNoServidor(
            {
              campanhaId: params.campanhaId,
              input: {
                nomeCompleto: String(row.nome_completo ?? ""),
                cpf: String(row.cpf ?? ""),
                dataNascimento: String(row.data_nascimento ?? ""),
                email: row.email ? String(row.email) : undefined,
              },
              origem: "importacao",
            },
            auditOptions
          );
          importados += 1;
          participantes.push(record);
        } catch (err) {
          ignorados += 1;
          if (err instanceof CpfCampanhaAtivaError) {
            erros.push({
              cpf: String(row.cpf ?? ""),
              motivo: formatMotivoIgnoradoImportacao(err.conflict),
            });
          } else {
            erros.push({
              cpf: String(row.cpf ?? ""),
              motivo:
                err instanceof Error ? err.message : "Falha ao importar.",
            });
          }
        }
      }
      continue;
    }

    for (const row of data ?? []) {
      participantes.push(mapParticipante(row as Record<string, unknown>));
      importados += 1;
    }
  }

  if (importados > 0) {
    const nome = usuarioNome ?? "Sistema";
    await registrarAuditoria({
      usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
      usuarioNome: nome,
      usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
      modulo: AUDITORIA_MODULOS.riscos_psicossociais,
      acao: AUDITORIA_ACOES.riscos_participante_criado,
      registroId: campanha.id,
      registroNome: campanha.codigo_publico,
      descricao: `${nome} importou ${importados} participante(s) na pesquisa ${campanha.codigo_publico}.`,
      dadosDepois: {
        campanha_id: campanha.id,
        importados,
        ignorados,
      },
    });
  }

  return { importados, ignorados, erros, participantes };
}
