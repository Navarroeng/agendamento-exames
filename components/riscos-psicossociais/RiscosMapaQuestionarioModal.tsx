"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { IconFileText, IconSearch } from "@/components/ui/icons/OutlineIcons";
import { toast } from "sonner";
import { exportarPdfMapaQuestionarioCopsoq } from "@/lib/copsoq-mapa-pdf";
import {
  filtrarMapaQuestionario,
  idsCategoriasVisiveis,
  idsPerguntasQueCombinam,
  montarMapaQuestionarioCopsoq,
  type MapaCategoriaCopsoq,
} from "@/lib/copsoq/mapa-questionario";

function labelQuantidade(n: number): string {
  return n === 1 ? "1 pergunta" : `${n} perguntas`;
}

function badgeTipo(tipo: MapaCategoriaCopsoq["tipo"]) {
  if (tipo === "RISCO") {
    return {
      label: "RISCO",
      className: "bg-[#f1f5f9] text-[#475569] ring-1 ring-[#e2e8f0]",
    };
  }
  return {
    label: "PROTEÇÃO",
    className: "bg-[#eef6f4] text-[#0f766e] ring-1 ring-[#d1e7e2]",
  };
}

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 text-[#94a3b8] transition-transform ${
        aberto ? "rotate-180" : ""
      }`}
      aria-hidden
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AccordionCategoria({
  categoria,
  aberto,
  onToggle,
  busca,
  destaque,
}: {
  categoria: MapaCategoriaCopsoq;
  aberto: boolean;
  onToggle: () => void;
  busca: string;
  destaque?: boolean;
}) {
  const tipo = badgeTipo(categoria.tipo);
  const destacadas = idsPerguntasQueCombinam(categoria, busca);
  const panelId = `mapa-cat-${categoria.id}`;

  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white ${
        destaque ? "border-brand-blue/35" : "border-[#e8edf5]"
      }`}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-3.5 py-3 text-left sm:px-4"
        onClick={onToggle}
        aria-expanded={aberto}
        aria-controls={panelId}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold leading-snug text-navy">
            {categoria.nome}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide ${tipo.className}`}
            >
              {tipo.label}
            </span>
            <span className="text-[11px] font-semibold text-[#94a3b8]">
              {labelQuantidade(categoria.perguntas.length)}
            </span>
          </div>
        </div>
        <Chevron aberto={aberto} />
      </button>

      {aberto ? (
        <div
          id={panelId}
          className="space-y-2 border-t border-[#eef2f7] px-3.5 py-3 sm:px-4"
        >
          {categoria.perguntas.map((p) => {
            const match = destacadas.has(p.id);
            return (
              <article
                key={p.id}
                className={`rounded-lg px-3 py-2.5 ${
                  match ? "bg-[#eef1ff]" : "bg-[#f8fafc]"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-lg bg-navy px-1.5 text-[12px] font-extrabold tabular-nums text-white">
                    {p.numeroVisual}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold tracking-wide text-[#94a3b8]">
                      Código COPSOQ {p.codigo}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-navy">
                      {p.texto}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function RiscosMapaQuestionarioModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const mapa = useMemo(() => montarMapaQuestionarioCopsoq(), []);
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
  const [salvandoPdf, setSalvandoPdf] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setBusca("");
    setAbertos(new Set());
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  const filtrado = useMemo(
    () => filtrarMapaQuestionario(mapa, busca),
    [mapa, busca]
  );
  const idsVisiveis = idsCategoriasVisiveis(filtrado);

  useEffect(() => {
    if (!busca.trim()) return;
    setAbertos(new Set(idsCategoriasVisiveis(filtrarMapaQuestionario(mapa, busca))));
  }, [busca, mapa]);

  function toggle(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  async function handleSalvarPdf() {
    if (salvandoPdf) return;
    setSalvandoPdf(true);
    try {
      const out = await exportarPdfMapaQuestionarioCopsoq();
      toast.success(`PDF salvo (${out.pageCount} páginas).`);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível gerar o PDF do mapa.");
    } finally {
      setSalvandoPdf(false);
    }
  }

  const principais = filtrado.categoriasAvaliadas;
  const ofensivos = filtrado.comportamentosOfensivos;
  const vazio = principais.length === 0 && !ofensivos;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Mapa do Questionário COPSOQ II"
      subtitle="Consulte quais perguntas compõem cada categoria utilizada na avaliação dos riscos psicossociais."
      headerActions={
        <button
          type="button"
          onClick={() => void handleSalvarPdf()}
          disabled={salvandoPdf}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#e4ebf4] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#475569] transition-colors hover:border-brand-blue/30 hover:text-navy disabled:opacity-60"
        >
          <IconFileText size={14} />
          {salvandoPdf ? "Gerando PDF…" : "Salvar em PDF"}
        </button>
      }
    >
      <div className="sticky -top-4 z-10 -mx-4 mb-4 border-b border-[#eef2f7] bg-white px-4 pb-3 pt-0 sm:-top-6 sm:-mx-6 sm:px-6">
        <p className="text-[11px] leading-relaxed text-app-muted">
          {mapa.totais.perguntas} perguntas · {mapa.totais.categoriasAvaliadas}{" "}
          categorias avaliadas · {mapa.totais.indicadoresOfensivos} indicadores
          de comportamentos ofensivos
        </p>

        <label className="relative mt-3 block">
          <span className="sr-only">Buscar pergunta ou categoria</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
            <IconSearch size={15} />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pergunta ou categoria..."
            className="field-input field-input-compact w-full pl-9 text-sm"
            autoComplete="off"
          />
        </label>

        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-[#e8edf5] px-3 py-1.5 text-[12px] font-semibold text-[#475569] hover:bg-[#f8fafc]"
            onClick={() => setAbertos(new Set(idsVisiveis))}
          >
            Expandir todas
          </button>
          <button
            type="button"
            className="rounded-lg border border-[#e8edf5] px-3 py-1.5 text-[12px] font-semibold text-[#475569] hover:bg-[#f8fafc]"
            onClick={() => setAbertos(new Set())}
          >
            Recolher todas
          </button>
        </div>
      </div>

      {vazio ? (
        <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-8 text-center text-sm text-app-muted">
          Nenhuma pergunta ou categoria encontrada para esta busca.
        </p>
      ) : (
        <div className="space-y-2.5">
          {principais.map((categoria) => (
            <AccordionCategoria
              key={categoria.id}
              categoria={categoria}
              aberto={abertos.has(categoria.id)}
              onToggle={() => toggle(categoria.id)}
              busca={busca}
            />
          ))}

          {ofensivos ? (
            <div className="pt-3">
              <div className="mb-2.5 border-t border-dashed border-[#e2e8f0] pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
                  Indicadores complementares
                </p>
                <p className="mt-1 text-[11px] leading-snug text-app-muted">
                  Indicadores complementares avaliados separadamente das 10
                  categorias COPSOQ.
                </p>
              </div>
              <AccordionCategoria
                categoria={ofensivos}
                aberto={abertos.has(ofensivos.id)}
                onToggle={() => toggle(ofensivos.id)}
                busca={busca}
                destaque
              />
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
