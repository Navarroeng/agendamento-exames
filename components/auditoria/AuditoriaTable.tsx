import {
  formatAuditoriaAcao,
  formatAuditoriaModulo,
} from "@/lib/auditoria";
import type { AuditoriaRow } from "@/hooks/useAuditoriaPage";

interface AuditoriaTableProps {
  records: AuditoriaRow[];
  loading: boolean;
  error: string | null;
}

export function AuditoriaTable({
  records,
  loading,
  error,
}: AuditoriaTableProps) {
  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-app-muted">
        Carregando auditoria...
      </p>
    );
  }

  if (error) {
    return (
      <p className="py-10 text-center text-sm text-brand-red">{error}</p>
    );
  }

  if (records.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-app-muted">
        Nenhum registro encontrado com os filtros atuais.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e8edf5] bg-white">
      <table className="w-full min-w-[980px] text-left text-xs">
        <thead>
          <tr className="border-b border-[#eef2f7] bg-[#f8fafc] text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
            <th className="px-3 py-2.5">Data e hora</th>
            <th className="px-3 py-2.5">Usuário</th>
            <th className="px-3 py-2.5">Módulo</th>
            <th className="px-3 py-2.5">Ação</th>
            <th className="px-3 py-2.5">Registro</th>
            <th className="px-3 py-2.5">Descrição</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.id}
              className="border-b border-[#f1f5f9] last:border-0 hover:bg-[#fafbfc]"
            >
              <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                <span className="font-medium text-navy">{record.createdAtBR}</span>
                <span className="ml-1.5 text-[#64748b]">{record.createdAtTime}</span>
              </td>
              <td className="px-3 py-2.5">
                <span className="block font-medium text-navy">
                  {record.usuario_nome}
                </span>
                <span className="block text-[10px] text-[#64748b]">
                  {record.usuario_email}
                </span>
              </td>
              <td className="px-3 py-2.5">
                {formatAuditoriaModulo(record.modulo)}
              </td>
              <td className="px-3 py-2.5">
                {formatAuditoriaAcao(record.acao)}
              </td>
              <td className="px-3 py-2.5">
                {record.registro_nome?.trim() || "—"}
              </td>
              <td className="px-3 py-2.5 text-[#475569]">{record.descricao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
