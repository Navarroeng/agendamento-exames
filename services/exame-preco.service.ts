import { createClient } from "@/lib/supabase/client";

import type { PrecoExameAgendamento } from "@/lib/types";



function normalizeName(value: string): string {

  return value.trim().toLowerCase();

}



export async function buscarPrecoExameAgendamento(

  clinicaNome: string,

  exameNome: string

): Promise<PrecoExameAgendamento> {

  if (!clinicaNome.trim() || !exameNome.trim()) {

    return {

      ok: false,

      valorNavarro: 0,

      custoClinica: 0,

      message: "Selecione a clínica e o exame.",

    };

  }



  const supabase = createClient();



  const { data: clinicas, error: clinicaError } = await supabase

    .from("clinicas")

    .select("id, nome_fantasia, razao_social, status")

    .eq("status", "ativa");



  if (clinicaError) throw clinicaError;



  const nomeNorm = normalizeName(clinicaNome);

  const clinica = (clinicas ?? []).find(

    (c) =>

      normalizeName(c.nome_fantasia) === nomeNorm ||

      normalizeName(c.razao_social) === nomeNorm

  );



  if (!clinica) {

    return {

      ok: false,

      valorNavarro: 0,

      custoClinica: 0,

      message: "Clínica não encontrada ou inativa.",

    };

  }



  const { data: exame, error: exameError } = await supabase

    .from("exames")

    .select("id, nome, ativo")

    .eq("nome", exameNome.trim())

    .maybeSingle();



  if (exameError) throw exameError;



  if (!exame || !exame.ativo) {

    return {

      ok: false,

      valorNavarro: 0,

      custoClinica: 0,

      message: "Exame não encontrado no catálogo.",

    };

  }



  const { data: vinculo, error: vinculoError } = await supabase

    .from("clinica_exames")

    .select("custo_clinica, valor_navarro, ativo")

    .eq("clinica_id", clinica.id)

    .eq("exame_id", exame.id)

    .maybeSingle();



  if (vinculoError) throw vinculoError;



  if (!vinculo || !vinculo.ativo) {

    return {

      ok: false,

      exameId: exame.id,

      valorNavarro: 0,

      custoClinica: 0,

      message: "Esta clínica não realiza este exame.",

    };

  }



  return {

    ok: true,

    exameId: exame.id,

    valorNavarro: Number(vinculo.valor_navarro),

    custoClinica: Number(vinculo.custo_clinica),

  };

}


