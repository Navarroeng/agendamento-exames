"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import {
  formatDataHoraRelatorio,
  formatTaxaParticipacao,
  validatePodeGerarRelatorioFinal,
  type RiscosRelatorioRecord,
} from "@/lib/riscos-relatorio";
import {
  haRespostasAposRelatorio,
  MSG_RELATORIO_NOVAS_RESPOSTAS,
} from "@/lib/riscos-campanha-ciclo";
import type { RiscosCampanhaParticipanteRecord } from "@/lib/riscos-campanha-participantes";
import type { RiscosCampanhaRecord } from "@/lib/riscos-campanha";
import {
  buscarRelatorioCampanha,
  confirmarEnvioRelatorioCampanha,
  corrigirEnvioRelatorioCampanha,
  gerarRelatorioCampanha,
  regenerarRelatorioCampanha,
} from "@/services/riscos-relatorio.service";
import { createClient } from "@/lib/supabase/client";
import { isEmailValido } from "@/lib/email-validacao";
import { isRelatorioEnvioExplicitamenteConfirmado } from "@/lib/riscos-relatorio-envio";
import { resolverUrlLogoCampanhaOuEmpresa } from "@/services/riscos-campanha-logo.service";
import { RiscosRelatorioViewerModal } from "@/components/riscos-psicossociais/RiscosRelatorioViewerModal";

interface RiscosRelatorioPanelProps {
  campanha: RiscosCampanhaRecord | null;
  participantes: RiscosCampanhaParticipanteRecord[];
  isAdmin?: boolean;
  processoCancelado?: boolean;
  auditContext?: AuditoriaUsuarioContext;
  emailEnvioSugerido?: string | null;
  onRelatorioChange?: (relatorio: RiscosRelatorioRecord | null) => void;
}

export function RiscosRelatorioPanel({
  campanha,
  participantes,
  isAdmin = false,
  processoCancelado = false,
  auditContext,
  emailEnvioSugerido,
  onRelatorioChange,
}: RiscosRelatorioPanelProps) {
  const [relatorio, setRelatorio] = useState<RiscosRelatorioRecord | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEnvio, setSavingEnvio] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [emailEnvio, setEmailEnvio] = useState("");
  const [editandoEnvio, setEditandoEnvio] = useState(false);
  const onRelatorioChangeRef = useRef(onRelatorioChange);
  onRelatorioChangeRef.current = onRelatorioChange;

  const ativos = useMemo(
    () =>
      participantes.filter(
        (p) => p.status !== "removido" && p.status !== "invalidado"
      ),
    [participantes]
  );

  const motivoBloqueio = useMemo(
    () =>
      validatePodeGerarRelatorioFinal({
        campanhaStatus: campanha?.status,
        participantesAtivos: ativos,
        jaExisteRelatorio: Boolean(relatorio),
        processoCancelado,
      }),
    [campanha?.status, ativos, relatorio, processoCancelado]
  );

  const novasRespostasAposRelatorio = useMemo(() => {
    if (!relatorio) return false;
    return haRespostasAposRelatorio({
      relatorioRespondentes: relatorio.respondentes,
      relatorioGeradoEm: relatorio.gerado_em,
      participantesRespondidos: ativos.filter((p) => p.status === "respondido")
        .length,
    });
  }, [relatorio, ativos]);

  useEffect(() => {
    if (!campanha?.id) {
      setRelatorio(null);
      onRelatorioChangeRef.current?.(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const row = await buscarRelatorioCampanha(campanha.id);
        if (cancelled) return;
        setRelatorio(row);
        onRelatorioChangeRef.current?.(row);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setRelatorio(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campanha?.id]);

  const envioConfirmado = useMemo(
    () =>
      relatorio
        ? isRelatorioEnvioExplicitamenteConfirmado({
            relatorioEnviadoEm: relatorio.relatorio_enviado_em,
          })
        : false,
    [relatorio]
  );

  useEffect(() => {
    if (!campanha?.id || envioConfirmado) return;
    const sugerido = String(emailEnvioSugerido ?? "").trim();
    if (sugerido) {
      setEmailEnvio(sugerido);
      return;
    }
    if (!campanha.cliente_id) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("clientes")
          .select("email")
          .eq("id", campanha.cliente_id)
          .maybeSingle();
        if (cancelled) return;
        const email = String((data as { email?: string } | null)?.email ?? "")
          .trim();
        if (email) setEmailEnvio(email);
      } catch {
        /* campo permanece editável */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campanha?.id, campanha?.cliente_id, emailEnvioSugerido, envioConfirmado]);

  useEffect(() => {
    if (relatorio?.relatorio_enviado_email && envioConfirmado && !editandoEnvio) {
      setEmailEnvio(relatorio.relatorio_enviado_email);
    }
  }, [relatorio, envioConfirmado, editandoEnvio]);

  async function handleConfirmarEnvio() {
    if (!campanha?.id || !relatorio) return;
    if (!isEmailValido(emailEnvio)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setSavingEnvio(true);
    try {
      const row = await confirmarEnvioRelatorioCampanha(
        campanha.id,
        emailEnvio.trim(),
        { auditContext }
      );
      setRelatorio(row);
      setEditandoEnvio(false);
      onRelatorioChangeRef.current?.(row);
      toast.success("Envio do relatório confirmado.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao confirmar o envio."
      );
    } finally {
      setSavingEnvio(false);
    }
  }

  async function handleCorrigirEnvio() {
    if (!campanha?.id || !relatorio) return;
    if (!isEmailValido(emailEnvio)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setSavingEnvio(true);
    try {
      const row = await corrigirEnvioRelatorioCampanha(
        campanha.id,
        emailEnvio.trim(),
        { auditContext }
      );
      setRelatorio(row);
      setEditandoEnvio(false);
      onRelatorioChangeRef.current?.(row);
      toast.success("Registro de envio atualizado.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao corrigir o envio."
      );
    } finally {
      setSavingEnvio(false);
    }
  }

  useEffect(() => {
    if (!campanha?.id) {
      setLogoUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const url = await resolverUrlLogoCampanhaOuEmpresa(campanha);
        if (!cancelled) setLogoUrl(url);
      } catch {
        if (!cancelled) setLogoUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campanha]);

  async function handleGerar() {
    if (!campanha?.id) return;
    if (relatorio) {
      setViewerOpen(true);
      return;
    }
    if (motivoBloqueio) {
      toast.error(motivoBloqueio);
      return;
    }
    setSaving(true);
    try {
      const row = await gerarRelatorioCampanha(campanha.id, { auditContext });
      setRelatorio(row);
      onRelatorioChangeRef.current?.(row);
      toast.success("Relatório gerado com sucesso.");
      setViewerOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao gerar o relatório."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerar() {
    if (!campanha?.id || !isAdmin) return;
    const ok = window.confirm(
      "Regenerar recalcula todas as categorias com o motor COPSOQ atual (incluindo normalização de escalas) e substitui o snapshot salvo. Relatórios antigos sem essa regeneração continuam com os valores anteriores. Continuar?"
    );
    if (!ok) return;
    setSaving(true);
    try {
      const row = await regenerarRelatorioCampanha(campanha.id, {
        auditContext,
      });
      setRelatorio(row);
      onRelatorioChangeRef.current?.(row);
      toast.success("Relatório regenerado.");
      setViewerOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao regenerar o relatório."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!campanha) {
    return (
      <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-6 text-center text-sm text-app-muted">
        Crie a pesquisa para gerar o relatório final.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-app-muted">Carregando relatório…</p>
    );
  }

  if (!relatorio) {
    return (
      <div className="flex h-full flex-col justify-between gap-3">
        <p className="text-sm text-app-muted">
          O relatório final consolida as respostas COPSOQ e fica persistido para
          consulta e exportação.
        </p>
        {motivoBloqueio &&
        motivoBloqueio !==
          "Já existe um relatório para esta campanha. Use Visualizar ou Regenerar (admin)." ? (
          <p className="text-xs font-medium text-[#b45309]">{motivoBloqueio}</p>
        ) : null}
        <button
          type="button"
          className="w-fit rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          disabled={saving || Boolean(motivoBloqueio)}
          title={motivoBloqueio ?? "Gerar relatório final"}
          onClick={() => void handleGerar()}
        >
          {saving ? "Gerando…" : "Gerar Relatório"}
        </button>
      </div>
    );
  }

  const { data, hora } = formatDataHoraRelatorio(relatorio.gerado_em);
  const envioDataHora = relatorio.relatorio_enviado_em
    ? formatDataHoraRelatorio(relatorio.relatorio_enviado_em)
    : null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-xl border border-[#dcfce7] bg-[#f0fdf4] px-3 py-2.5">
        <p className="text-xs font-extrabold text-brand-green">
          ✔ Relatório gerado
        </p>
        <p className="mt-1 text-xs text-navy">
          {data} · {hora}
        </p>
        <p className="text-xs text-app-muted">
          Responsável: {relatorio.gerado_por || "—"}
        </p>
        <p className="mt-1 text-xs text-app-muted">
          Participação:{" "}
          {formatTaxaParticipacao(relatorio.taxa_participacao)} ·{" "}
          {relatorio.respondentes}/{relatorio.participantes} respondentes
        </p>
      </div>
      {novasRespostasAposRelatorio ? (
        <p className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs font-medium text-[#b45309]">
          {MSG_RELATORIO_NOVAS_RESPOSTAS}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white"
          onClick={() => setViewerOpen(true)}
        >
          Visualizar relatório
        </button>
        <button
          type="button"
          className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
          onClick={() => {
            setViewerOpen(true);
            window.setTimeout(() => {
              void (async () => {
                try {
                  const empresa =
                    relatorio.empresa_nome ||
                    relatorio.resultado_json?.capa?.empresaNome ||
                    "Empresa";
                  const { exportarRelatorioRiscosPdf, nomeArquivoPdfRelatorioRiscos } =
                    await import("@/lib/riscos-relatorio-pdf");
                  toast.message("Abrindo impressão…", {
                    description: `Use “Salvar como PDF”. Nome sugerido: ${nomeArquivoPdfRelatorioRiscos(
                      empresa,
                      relatorio.gerado_em
                    )}`,
                  });
                  await exportarRelatorioRiscosPdf({
                    empresaNome: empresa,
                    geradoEm: relatorio.gerado_em,
                  });
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Falha ao exportar o PDF."
                  );
                }
              })();
            }, 400);
          }}
        >
          Exportar PDF
        </button>
        {isAdmin ? (
          <button
            type="button"
            className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
            disabled={saving}
            onClick={() => void handleRegenerar()}
          >
            Regenerar
          </button>
        ) : null}
      </div>

      <div className="rounded-xl border border-[#e2e8f0] bg-white px-3 py-3">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#64748b]">
          Confirmação de envio
        </p>
        {envioConfirmado && !editandoEnvio ? (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-extrabold text-brand-green">
              Relatório enviado
            </p>
            <p className="text-xs text-navy">
              Enviado para:{" "}
              <span className="font-semibold">
                {relatorio.relatorio_enviado_email || "—"}
              </span>
            </p>
            {envioDataHora ? (
              <p className="text-xs text-app-muted">
                Confirmado em: {envioDataHora.data} às {envioDataHora.hora}
              </p>
            ) : null}
            <p className="text-xs text-app-muted">
              Confirmado por: {relatorio.relatorio_enviado_por || "—"}
            </p>
            <button
              type="button"
              className="mt-2 text-[11px] font-semibold text-brand-blue underline-offset-2 hover:underline"
              onClick={() => setEditandoEnvio(true)}
            >
              Corrigir registro de envio
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-app-muted">
              {envioConfirmado
                ? "Corrija o e-mail registrado para esta versão do relatório."
                : "Aguardando confirmação de envio"}
            </p>
            <p className="text-[11px] text-app-muted">
              Confirme após o envio do relatório ao cliente. Esta ação não
              envia e-mail — apenas registra que a equipe Navarro realizou o
              envio externamente.
            </p>
            <label className="block text-[11px] font-semibold text-navy">
              E-mail para o qual o relatório foi enviado
              <input
                type="email"
                className="field-input mt-1 w-full text-sm"
                value={emailEnvio}
                onChange={(e) => setEmailEnvio(e.target.value)}
                placeholder="cliente@empresa.com.br"
                disabled={savingEnvio}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                disabled={savingEnvio || processoCancelado}
                onClick={() =>
                  void (envioConfirmado || editandoEnvio
                    ? handleCorrigirEnvio()
                    : handleConfirmarEnvio())
                }
              >
                {savingEnvio
                  ? "Salvando…"
                  : envioConfirmado || editandoEnvio
                    ? "Salvar correção"
                    : "Confirmar envio"}
              </button>
              {editandoEnvio ? (
                <button
                  type="button"
                  className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
                  onClick={() => {
                    setEditandoEnvio(false);
                    setEmailEnvio(relatorio.relatorio_enviado_email ?? "");
                  }}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <RiscosRelatorioViewerModal
        open={viewerOpen}
        relatorio={relatorio}
        onClose={() => setViewerOpen(false)}
        logoUrl={logoUrl}
        empresaCnpj={campanha.cnpj}
        campanhaStatus={campanha.status}
      />
    </div>
  );
}
