"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  assertExamesSemDuplicidade,
  chaveExameDuplicidade,
  EXAME_DUPLICADO_TOAST,
  normalizarNomeExame,
  verificarDuplicidadeExamesNoFormulario,
} from "@/lib/duplicidade-validations";
import { createEmptyExam } from "@/lib/form-defaults";
import {
  agendamentoPossuiExamesComplementares,
  EXAME_CLINICO_NAO_ENCONTRADO_RETORNO_MSG,
  filtrarNomesExamesParaAso,
  isAsoRetornoAoTrabalho,
} from "@/lib/agendamento-aso-retorno-trabalho";
import { ordenarExamesAgendamentoComClinicoPrimeiro } from "@/lib/agendamento-exames-order";
import { resolveMotivoValorZeroPayload } from "@/lib/agendamento-clinico-zero-demissional";
import {
  CLINICO_VALOR_ASO_RETORNO_TRABALHO,
  EXAME_CLINICO_NOME,
  EXAME_SEM_CUSTO_CLINICA_MSG,
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

async function fetchPrecoClinicoRetornoTrabalho(
  clinicaNome: string,
  exameNome: string
): Promise<Partial<ExameFormItem>> {
  const result = await buscarPrecoExameAgendamento(
    clinicaNome,
    nomeExameParaBuscaPreco(exameNome)
  );

  if (!result.ok) {
    const messageLower = (result.message ?? "").toLowerCase();
    const catalogoInexistente =
      !result.exameId || messageLower.includes("não encontrado");

    return {
      tipo_exame: exameNome,
      exame_id: result.exameId ?? "",
      valor_cliente: "",
      custo_clinica: "",
      lucro: "",
      aviso: catalogoInexistente
        ? EXAME_CLINICO_NAO_ENCONTRADO_RETORNO_MSG
        : (result.message ?? EXAME_SEM_CUSTO_CLINICA_MSG),
      precoAutomatico: false,
      clinicoValorManual: false,
    };
  }

  const valor = formatMoney(CLINICO_VALOR_ASO_RETORNO_TRABALHO);
  const custo = formatMoney(result.custoClinica);

  return {
    tipo_exame: exameNome,
    exame_id: result.exameId ?? "",
    valor_cliente: valor,
    custo_clinica: custo,
    lucro: calcLucro(valor, custo),
    aviso: "",
    precoAutomatico: true,
    clinicoValorManual: false,
  };
}

export function useExams(clinicaNome: string, asoTipo: string) {
  const [exams, setExams] = useState<ExameFormItem[]>([createEmptyExam()]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const examsSyncGenerationRef = useRef(0);
  const examsRef = useRef<ExameFormItem[]>([createEmptyExam()]);

  useEffect(() => {
    examsRef.current = exams;
  }, [exams]);

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

    const generation = examsSyncGenerationRef.current;
    const snapshot = isAsoRetornoAoTrabalho(asoTipo)
      ? examsRef.current.filter(
          (exam) =>
            !exam.tipo_exame.trim() || isExameClinicoManual(exam.tipo_exame)
        )
      : examsRef.current;

    setPricingLoading(true);
    try {
      const updated = await Promise.all(
        snapshot.map(async (exam) => {
          if (!exam.tipo_exame.trim()) return exam;
          if (isExameClinicoManual(exam.tipo_exame)) {
            if (isAsoRetornoAoTrabalho(asoTipo)) {
              const patch = await fetchPrecoClinicoRetornoTrabalho(
                clinicaNome,
                exam.tipo_exame
              );
              return { ...exam, ...patch };
            }
            const patch = await fetchPrecoClinico(clinicaNome, exam.tipo_exame);
            const manual = exam.clinicoValorManual ?? false;
            const enriched = applyAsoValorClinico(
              {
                ...patch,
                custo_clinica: patch.custo_clinica ?? "",
              },
              asoTipo,
              manual
            );
            const valor = manual
              ? exam.valor_cliente
              : (enriched.valor_cliente ?? exam.valor_cliente);
            const custo = enriched.custo_clinica ?? "";
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
      if (generation !== examsSyncGenerationRef.current) return;
      setExams(ordenarExamesAgendamentoComClinicoPrimeiro(updated));
    } finally {
      if (generation === examsSyncGenerationRef.current) {
        setPricingLoading(false);
      }
    }
  }, [asoTipo, clinicaNome]);

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

  const buildExamesFromNomes = useCallback(
    async (exameNomes: string[]): Promise<ExameFormItem[]> => {
      const nomesFiltrados = filtrarNomesExamesParaAso(exameNomes, asoTipo);
      const novos: ExameFormItem[] = [];

      for (const nome of nomesFiltrados) {
        if (isExameClinicoManual(nome)) {
          if (isAsoRetornoAoTrabalho(asoTipo)) {
            if (clinicaNome.trim()) {
              const patch = await fetchPrecoClinicoRetornoTrabalho(
                clinicaNome,
                nome
              );
              novos.push({ ...createEmptyExam(), ...patch });
            } else {
              novos.push({
                ...createEmptyExam(),
                ...clinicoSemClinicaPatch(nome),
                clinicoValorManual: false,
              });
            }
            continue;
          }

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

      return ordenarExamesAgendamentoComClinicoPrimeiro(novos);
    },
    [asoTipo, clinicaNome]
  );

  const replaceExamesFromCargo = useCallback(
    async (exameNomes: string[]) => {
      const generation = ++examsSyncGenerationRef.current;
      const normalizedIncoming = filtrarNomesExamesParaAso(exameNomes, asoTipo);

      setExams([]);
      setPricingLoading(true);
      try {
        if (normalizedIncoming.length === 0) {
          if (generation === examsSyncGenerationRef.current) {
            setExams([]);
          }
          return 0;
        }

        const novos = await buildExamesFromNomes(normalizedIncoming);
        if (generation !== examsSyncGenerationRef.current) return 0;

        setExams(novos);
        return novos.length;
      } finally {
        if (generation === examsSyncGenerationRef.current) {
          setPricingLoading(false);
        }
      }
    },
    [buildExamesFromNomes, asoTipo]
  );

  const appendExamesFromNomes = useCallback(
    async (
      exameNomes: string[]
    ): Promise<{ added: number; duplicates: string[] }> => {
      const generation = ++examsSyncGenerationRef.current;
      const current = examsRef.current.filter((exam) => exam.tipo_exame.trim());
      const existingKeys = new Set(
        current
          .map((exam) => chaveExameDuplicidade(exam))
          .filter((key): key is string => Boolean(key))
      );

      const duplicates: string[] = [];
      const novosNomes: string[] = [];

      for (const nome of exameNomes) {
        const trimmed = nome.trim();
        if (!trimmed) continue;

        const keyNome = `nome:${normalizarNomeExame(trimmed)}`;
        if (existingKeys.has(keyNome)) {
          duplicates.push(trimmed);
          continue;
        }

        if (
          novosNomes.some(
            (item) =>
              normalizarNomeExame(item) === normalizarNomeExame(trimmed)
          )
        ) {
          duplicates.push(trimmed);
          continue;
        }

        novosNomes.push(trimmed);
        existingKeys.add(keyNome);
      }

      const filtrados = filtrarNomesExamesParaAso(novosNomes, asoTipo);
      if (filtrados.length === 0) {
        return { added: 0, duplicates };
      }

      setPricingLoading(true);
      try {
        const novos = await buildExamesFromNomes(filtrados);
        if (generation !== examsSyncGenerationRef.current) {
          return { added: 0, duplicates };
        }

        const merged = ordenarExamesAgendamentoComClinicoPrimeiro([
          ...current,
          ...novos,
        ]);
        const duplicidade = verificarDuplicidadeExamesNoFormulario(merged);
        if (duplicidade.duplicado) {
          throw new Error(duplicidade.mensagem ?? EXAME_DUPLICADO_TOAST);
        }

        setExams(merged);
        return { added: novos.length, duplicates };
      } finally {
        if (generation === examsSyncGenerationRef.current) {
          setPricingLoading(false);
        }
      }
    },
    [asoTipo, buildExamesFromNomes]
  );

  const enforceRetornoTrabalhoExames = useCallback(async (): Promise<boolean> => {
    if (!isAsoRetornoAoTrabalho(asoTipo)) return false;

    const current = examsRef.current;
    const hadComplementares = agendamentoPossuiExamesComplementares(current);
    const validos = current.filter((exam) => exam.tipo_exame.trim());
    const onlyClinico =
      validos.length === 1 && isExameClinicoManual(validos[0].tipo_exame);

    if (onlyClinico && !hadComplementares) {
      if (clinicaNome.trim()) {
        const generation = ++examsSyncGenerationRef.current;
        setPricingLoading(true);
        try {
          const patch = await fetchPrecoClinicoRetornoTrabalho(
            clinicaNome,
            validos[0].tipo_exame
          );
          if (generation === examsSyncGenerationRef.current) {
            setExams([{ ...validos[0], ...patch }]);
          }
        } finally {
          if (generation === examsSyncGenerationRef.current) {
            setPricingLoading(false);
          }
        }
      }
      return false;
    }

    const generation = ++examsSyncGenerationRef.current;
    setPricingLoading(true);
    try {
      const novos = await buildExamesFromNomes([EXAME_CLINICO_NOME]);
      if (generation !== examsSyncGenerationRef.current) return hadComplementares;
      setExams(novos);
      return hadComplementares;
    } finally {
      if (generation === examsSyncGenerationRef.current) {
        setPricingLoading(false);
      }
    }
  }, [asoTipo, buildExamesFromNomes, clinicaNome]);

  const removeExam = useCallback((id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateExam = useCallback(
    (id: string, field: keyof ExameFormItem, value: string) => {
      if (field === "tipo_exame" || field === "custo_clinica") return;

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

          if (field === "valor_cliente" && !exam.precoAutomatico) {
            next.lucro = calcLucro(value, exam.custo_clinica);
          }

          return next;
        })
      );
    },
    [exams]
  );

  const resetExams = useCallback(() => {
    examsSyncGenerationRef.current += 1;
    setExams([]);
  }, []);

  const loadExams = useCallback((items: ExameFormItem[]) => {
    examsSyncGenerationRef.current += 1;
    const mapped =
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
        : [];
    const ordered = ordenarExamesAgendamentoComClinicoPrimeiro(mapped);
    examsRef.current = ordered;
    setExams(ordered);
  }, []);

  const getExamesPayload = useCallback(() => {
    const validos = exams.filter((e) => e.tipo_exame.trim() && !e.aviso);
    assertExamesSemDuplicidade(validos);

    return validos.map((exam) => ({
      tipo_exame: exam.tipo_exame,
      valor_cliente: parseMoney(exam.valor_cliente),
      custo_clinica: parseMoney(exam.custo_clinica),
      motivo_valor_zero: resolveMotivoValorZeroPayload(asoTipo, exam),
    }));
  }, [exams, asoTipo]);

  const hasExamWarnings = useMemo(
    () => exams.some((e) => e.aviso && e.tipo_exame.trim()),
    [exams]
  );

  return {
    exams,
    totals,
    pricingLoading,
    hasExamWarnings,
    removeExam,
    updateExam,
    resetExams,
    loadExams,
    getExamesPayload,
    refreshAllPricing,
    replaceExamesFromCargo,
    appendExamesFromNomes,
    enforceRetornoTrabalhoExames,
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
