"use client";

import { useState } from "react";
import {
  cursoAtivo,
  type AcaoGestaoPlataformas,
  type CursoCatalogo,
} from "@/lib/gestao-plataformas";
import { formatCurrency, maskMoneyInput, parseMoney } from "@/lib/money";

const INPUT =
  "h-10 w-full rounded-xl border border-[#e8edf5] bg-white px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#c9972b]";

export function GestaoCursosAba({
  cursos,
  salvando,
  onEnviar,
}: {
  cursos: CursoCatalogo[];
  salvando: boolean;
  onEnviar: (acao: AcaoGestaoPlataformas) => void;
}) {
  const [id, setId] = useState<string | undefined>();
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const visiveis = cursos.filter((curso) => mostrarInativos || cursoAtivo(curso));

  return (
    <div className="space-y-3">
      <form
        className="grid gap-2 rounded-2xl border border-[#e8edf5] border-t-2 border-t-[#c9972b] bg-white p-4 sm:grid-cols-[1fr_180px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const centavos = Math.round(parseMoney(valor) * 100);
          onEnviar({ acao: "salvar_curso", id, nome, valorCentavos: centavos });
        }}
      >
        <input
          className={INPUT}
          placeholder="Nome do curso"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          required
        />
        <input
          className={INPUT}
          inputMode="numeric"
          placeholder="Valor"
          value={valor}
          onChange={(event) => setValor(maskMoneyInput(event.target.value))}
          required
        />
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {id ? "Salvar curso" : "Cadastrar curso"}
          </button>
          {id ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setId(undefined);
                setNome("");
                setValor("");
              }}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>
      <label className="flex items-center gap-2 text-sm text-[#0b1f4d]">
        <input
          type="checkbox"
          checked={mostrarInativos}
          onChange={(event) => setMostrarInativos(event.target.checked)}
        />
        Mostrar cursos inativos
      </label>
      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white">
        <ul className="divide-y divide-[#e8edf5]">
          {visiveis.map((curso) => (
            <li key={curso.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-[#0b1f4d]">{curso.nome}</p>
                <p className="text-xs text-slate-500">
                  {formatCurrency(curso.valorCentavos / 100)}
                  {curso.inativadoEm ? " · inativo" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setId(curso.id);
                    setNome(curso.nome);
                    setValor(formatCurrency(curso.valorCentavos / 100));
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={salvando}
                  onClick={() =>
                    onEnviar(
                      curso.inativadoEm
                        ? { acao: "reativar_curso", id: curso.id }
                        : { acao: "inativar_curso", id: curso.id }
                    )
                  }
                >
                  {curso.inativadoEm ? "Reativar" : "Inativar"}
                </button>
              </div>
            </li>
          ))}
          {visiveis.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">
              {cursos.length === 0
                ? "Nenhum curso cadastrado."
                : "Nenhum curso ativo neste filtro."}
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
