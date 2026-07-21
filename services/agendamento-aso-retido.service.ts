import {
  ASO_RETIDO_BUCKET,
  buildAsoRetidoAnexoStoragePath,
  resolveAsoRetidoAnexoContentType,
  validateAsoRetidoAnexoFile,
} from "@/lib/agendamento-aso-retido-anexo";
import { createClient } from "@/lib/supabase/client";

export async function uploadAsoRetidoAnexo(
  agendamentoId: string,
  file: File
): Promise<{ path: string; nome: string }> {
  validateAsoRetidoAnexoFile(file);

  const supabase = createClient();
  const path = buildAsoRetidoAnexoStoragePath(agendamentoId, file.name);
  const contentType = resolveAsoRetidoAnexoContentType(file);

  const { error } = await supabase.storage
    .from(ASO_RETIDO_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType,
    });

  if (error) throw error;

  return { path, nome: file.name };
}

export async function obterUrlAsoRetidoAnexo(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(ASO_RETIDO_BUCKET)
    .createSignedUrl(path.trim(), expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error("Não foi possível gerar o link do anexo.");
  }

  return data.signedUrl;
}

export async function marcarAgendamentoAsoRetido(
  agendamentoId: string,
  params: {
    anexoPath: string;
    anexoNome: string;
    observacao: string | null;
    usuario: string;
  }
): Promise<void> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("agendamentos")
    .update({
      status: "aso_retido",
      aso_retido_anexo_path: params.anexoPath,
      aso_retido_anexo_nome: params.anexoNome,
      aso_retido_observacao: params.observacao,
      aso_retido_em: new Date().toISOString(),
      aso_retido_por: params.usuario,
    })
    .eq("id", agendamentoId)
    .eq("status", "agendado")
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      "Não foi possível marcar ASO Retido. Verifique se o agendamento ainda está com status Agendado."
    );
  }
}

export async function liberarAgendamentoAsoRetido(
  agendamentoId: string
): Promise<void> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("agendamentos")
    .update({
      status: "agendado",
    })
    .eq("id", agendamentoId)
    .eq("status", "aso_retido")
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      "Não foi possível liberar o ASO Retido. Verifique se o agendamento ainda está retido."
    );
  }
}
