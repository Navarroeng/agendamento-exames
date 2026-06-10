"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  assertExamesSemDuplicidade,
  chaveExameDuplicidade,
  EXAME_DUPLICADO_TOAST,
  verificarDuplicidadeExamesNoFormulario,
} from "@/lib/duplicidade-validations";
import { createEmptyExam } from "@/lib/form-defaults";
import {
  getClinicoValorNavarroAuto,
  isExameClinicoManual,
  nomeExameParaBuscaPreco,
} from "@/lib/exame-pricing";
import { formatMoney, parseMoney } from "@/lib/money";
import { buscarPrecoExameAgendamento } from "@/services/exame-preco.service";
import type { ExameFormItem, ExameRecord } from "@/lib/types";

function calcLucro(valor: string, custo: string): string {
  if (!valor.trim()) return "";
  return formatMoney(parseMoney(valor) - parseMoney(custo));
}

function applyAsoValorClinico(
  patch: Partial<ExameFormItem>,
  asoTipo: string,
  manual: boolean
): Partial<ExameFormItem> {
  if (manual) return patch;

  const auto = getClinicoValorNavarroAuto(asoTipo);
  if (auto === null) return patch;

  const valor = formatMoney(auto);
  const custo = patch.custo_clinica ?? "";

  return {
    ...patch,
    valor_cliente: valor,
    lucro: calcLucro(valor, custo),
    clinicoValorManual: false,
  };
}

function clinicoSemClinicaPatch(exameNome: string): Partial<ExameFormItem> {
  return {
    tipo_exame: exameNome,
    exame_id: "",
    valor_cliente: "",
    custo_clinica: "",
    lucro: "",
    aviso: "Selecione a clínica antes do exame.",
    precoAutomatico: false,
  };
}

async function fetchPrecoClinico(
  clinicaNome: string,
  exameNome: string
): Promise<Partial<ExameFormItem>> {
  const result = await buscarPrecoExameAgendamento(
    clinicaNome,
    nomeExameParaBuscaPreco(exameNome)
  );

  if (!result.ok) {
    return {
      tipo_exame: exameNome,
      exame_id: result.exameId ?? "",
      valor_cliente: "",
      custo_clinica: "",
      lucro: "",
      aviso: result.message ?? "Esta clínica não realiza este exame.",
      precoAutomatico: false,
    };
  }

  const custo = formatMoney(result.custoClinica);

  return {
    tipo_exame: exameNome,
    exame_id: result.exameId ?? "",
    valor_cliente: "",
    custo_clinica: custo,
    lucro: "",
    aviso: "",
    precoAutomatico: false,
  };
}

async function fetchPreco(
  clinicaNome: string,
  exameNome: string
): Promise<Partial<ExameFormItem>> {
  const result = await buscarPrecoExameAgendamento(
    clinicaNome,
    nomeExameParaBuscaPreco(exameNome)
  );

  if (!result.ok) {
    return {
      exame_id: result.exameId ?? "",
      valor_cliente: "",
      custo_clinica: "",
      lucro: "",
      aviso: result.message ?? "Esta clínica não realiza este exame.",
      precoAutomatico: false,
    };
  }

  const valor = formatMoney(result.valorNavarro);
  const custo = formatMoney(result.custoClinica);

  return {
    exame_id: result.exameId ?? "",
    valor_cliente: valor,
    custo_clinica: custo,
    lucro: calcLucro(valor, custo),
    aviso: "",
    precoAutomatico: true,
  };
}

export function useExams(clinicaNome: string, asoTipo: string) {
  const [exams, setExams] = useState<ExameFormItem[]>([createEmptyExam()]);
  const [pricingLoading, setPricingLoading] = useState(false);

  const totals = useMemo(() => {
    let totalCliente = 0;
    let totalCusto = 0;
    let totalLucro = 0;

    exams.forEach((exam) => {
      const valor = parseMoney(exam.valor_cliente);
      const custo = parseMoney(exam.custo_clinica);
      totalCliente += valor;
      totalCusto += custo;
      totalLucro += valor - custo;
    });

    return { totalCliente, totalCusto, totalLucro };
  }, [exams]);

  const hasDuplicateExam = useCallback(
    (
      items: ExameFormItem[],
      id: string,
      candidate: { exame_id?: string | null; tipo_exame: string }
    ) => {
      const key = chaveExameDuplicidade(candidate);
      if (!key) return false;

      return items.some((exam) => {
        if (exam.id === id || !exam.tipo_exame.trim()) return false;
        return chaveExameDuplicidade(exam) === key;
      });
    },
    []
  );

  const applyPricingToExam = useCallback(
    async (id: string, exameNome: string) => {
      if (!exameNome.trim()) {
        setExams((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  exame_id: "",
                  valor_cliente: "",
                  custo_clinica: "",
                  lucro: "",
                  aviso: "",
                  precoAutomatico: false,
                }
              : e
          )
        );
        return;
      }

      if (isExameClinicoManual(exameNome)) {
        if (!clinicaNome.trim()) {
          setExams((prev) =>
            prev.map((e) =>
              e.id === id ? { ...e, ...clinicoSemClinicaPatch(exameNome) } : e
            )
          );
          return;
        }

        setPricingLoading(true);
        try {
          const patch = await fetchPrecoClinico(clinicaNome, exameNome);
          const enriched = applyAsoValorClinico(
            { ...patch, clinicoValorManual: false },
            asoTipo,
            false
          );
          setExams((prev) => {
            if (
              hasDuplicateExam(prev, id, {
                exame_id: patch.exame_id,
                tipo_exame: exameNome,
              })
            ) {
              toast.error(EXAME_DUPLICADO_TOAST);
              return prev;
            }
            return prev.map((e) =>
              e.id === id ? { ...e, ...enriched } : e
            );
          });
        } finally {
          setPricingLoading(false);
        }
        return;
      }

      if (!clinicaNome.trim()) {
        setExams((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  aviso: "Selecione a clínica antes do exame.",
                  precoAutomatico: false,
                }
              : e
          )
        );
        return;
      }

      setPricingLoading(true);
      try {
        const patch = await fetchPreco(clinicaNome, exameNome);
        setExams((prev) => {
          if (
            hasDuplicateExam(prev, id, {
              exame_id: patch.exame_id,
              tipo_exame: exameNome,
            })
          ) {
            toast.error(EXAME_DUPLICADO_TOAST);
            return prev;
          }
          return prev.map((e) =>
            e.id === id ? { ...e, tipo_exame: exameNome, ...patch } : e
          );
        });
      } finally {
        setPricingLoading(false);
      }
    },
    [asoTipo, clinicaNome, hasDuplicateExam]
  );

  const refreshAllPricing = useCallback(async () => {
    if (!clinicaNome.trim()) return;

    setPricingLoading(true);
    try {
      const updated = await Promise.all(
        exams.map(async (exam) => {
          if (!exam.tipo_exame.trim()) return exam;
          if (isExameClinicoManual(exam.tipo_exame)) {
            const patch = await fetchPrecoClinico(clinicaNome, exam.tipo_exame);
            const manual = exam.clinicoValorManual ?? false;
            const enriched = applyAsoValorClinico(
              {
                ...patch,
                custo_clinica: patch.custo_clinica ?? exam.custo_clinica,
              },
              asoTipo,
              manual
            );
            const valor = manual
              ? exam.valor_cliente
              : (enriched.valor_cliente ?? exam.valor_cliente);
            const custo = enriched.custo_clinica ?? exam.custo_clinica;
            return {
              ...exam,
              ...enriched,
              valor_cliente: valor,
              lucro: calcLucro(valor, custo),
              clinicoValorManual: manual,
            };
          }
          const patch = await fetchPreco(clinicaNome, exam.tipo_exame);
          return { ...exam, ...patch };
        })
      );
      setExams(updated);
    } finally {
      setPricingLoading(false);
    }
  }, [asoTipo, clinicaNome, exams]);

  useEffect(() => {
    refreshAllPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaNome]);

  useEffect(() => {
    const auto = getClinicoValorNavarroAuto(asoTipo);
    if (auto === null) return;

    setExams((prev) =>
      prev.map((exam) => {
        if (!isExameClinicoManual(exam.tipo_exame)) return exam;
        if (exam.clinicoValorManual) return exam;
        if (exam.aviso) return exam;

        const valor = formatMoney(auto);
        return {
          ...exam,
          valor_cliente: valor,
          lucro: calcLucro(valor, exam.custo_clinica),
        };
      })
    );
  }, [asoTipo]);

  const mergeExamesFromCargo = useCallback(
    async (exameNomes: string[]) => {
      const normalizedIncoming = exameNomes
        .map((nome) => nome.trim())
        .filter(Boolean);
      if (normalizedIncoming.length === 0) return 0;

      setPricingLoading(true);
      try {
        const novos: ExameFormItem[] = [];

        for (const nome of normalizedIncoming) {
          if (isExameClinicoManual(nome)) {
            if (clinicaNome.trim()) {
              const patch = await fetchPrecoClinico(clinicaNome, nome);
              const enriched = applyAsoValorClinico(
                { ...patch, clinicoValorManual: false },
                asoTipo,
                false
              );
              novos.push({ ...createEmptyExam(), ...enriched });
            } else {
              const base = {
                ...createEmptyExam(),
                ...clinicoSemClinicaPatch(nome),
                clinicoValorManual: false,
              };
              novos.push({
                ...base,
                ...applyAsoValorClinico(base, asoTipo, false),
              });
            }
            continue;
          }

          const base: ExameFormItem = {
            ...createEmptyExam(),
            tipo_exame: nome,
          };

          if (clinicaNome.trim()) {
            const patch = await fetchPreco(clinicaNome, nome);
            novos.push({ ...base, ...patch });
          } else {
            novos.push({
              ...base,
              aviso: "Selecione a clínica antes do exame.",
              precoAutomatico: false,
            });
          }
        }

        let added = 0;
        setExams((prev) => {
          const existing = new Set(
            prev
              .map((e) => chaveExameDuplicidade(e))
              .filter((key): key is string => Boolean(key))
          );
          const toMerge = novos.filter((e) => {
            const key = chaveExameDuplicidade(e);
            return key ? !existing.has(key) : false;
          });
          added = toMerge.length;
          if (toMerge.length === 0) return prev;

          const kept =
            prev.length === 1 && !prev[0]?.tipo_exame.trim()
              ? []
              : prev.filter((e) => e.tipo_exame.trim());
          const next = [...kept, ...toMerge];
          return next.length > 0 ? next : [createEmptyExam()];
        });

        return added;
      } finally {
        setPricingLoading(false);
      }
    },
    [asoTipo, clinicaNome]
  );

  const addExam = useCallback(() => {
    setExams((prev) => [...prev, createEmptyExam()]);
  }, []);

  const removeExam = useCallback((id: string) => {
    setExams((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const updateExam = useCallback(
    (id: string, field: keyof ExameFormItem, value: string) => {
      if (field === "tipo_exame") {
        if (
          value.trim() &&
          hasDuplicateExam(exams, id, {
            tipo_exame: value,
          })
        ) {
          toast.error(EXAME_DUPLICADO_TOAST);
          return;
        }
        void applyPricingToExam(id, value);
        return;
      }

      setExams((prev) =>
        prev.map((exam) => {
          if (exam.id !== id) return exam;

          const next = { ...exam, [field]: value };

          if (
            field === "valor_cliente" &&
            isExameClinicoManual(exam.tipo_exame)
          ) {
            next.clinicoValorManual = true;
          }

          if (
            (field === "valor_cliente" || field === "custo_clinica") &&
            !exam.precoAutomatico
          ) {
            const valor =
              field === "valor_cliente" ? value : exam.valor_cliente;
            const custo =
              field === "custo_clinica" ? value : exam.custo_clinica;
            next.lucro = calcLucro(valor, custo);
          }

          return next;
        })
      );
    },
    [applyPricingToExam, hasDuplicateExam, exams]
  );

  const resetExams = useCallback(() => {
    setExams([createEmptyExam()]);
  }, []);

  const loadExams = useCallback((items: ExameFormItem[]) => {
    setExams(
      items.length > 0
        ? items.map((e) => {
            const clinicoManual = isExameClinicoManual(e.tipo_exame);
            return {
              ...e,
              exame_id: e.exame_id ?? "",
              aviso: clinicoManual ? "" : (e.aviso ?? ""),
              precoAutomatico: clinicoManual
                ? false
                : (e.precoAutomatico ?? false),
              clinicoValorManual: clinicoManual
                ? (e.clinicoValorManual ?? true)
                : false,
            };
          })
        : [createEmptyExam()]
    );
  }, []);

  const getExamesPayload = useCallback(() => {
    const validos = exams.filter((e) => e.tipo_exame.trim() && !e.aviso);
    assertExamesSemDuplicidade(validos);

    return validos.map((exam) => ({
      tipo_exame: exam.tipo_exame,
      valor_cliente: parseMoney(exam.valor_cliente),
      custo_clinica: parseMoney(exam.custo_clinica),
    }));
  }, [exams]);

  const hasExamWarnings = useMemo(
    () => exams.some((e) => e.aviso && e.tipo_exame.trim()),
    [exams]
  );

  return {
    exams,
    totals,
    pricingLoading,
    hasExamWarnings,
    addExam,
    removeExam,
    updateExam,
    resetExams,
    loadExams,
    getExamesPayload,
    refreshAllPricing,
    mergeExamesFromCargo,
  };
}

export function useExamesCatalogOptions() {
  const [exames, setExames] = useState<ExameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { listarExamesAtivos } = await import("@/services/exame.service");
        const data = await listarExamesAtivos();
        if (!cancelled) setExames(data);
      } catch (err) {
        console.error("Erro ao carregar catálogo de exames:", err);
        if (!cancelled) setExames([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { exames, loading };
}
