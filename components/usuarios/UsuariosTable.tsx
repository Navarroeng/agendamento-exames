import { labelPerfil } from "@/lib/auth-labels";
import type { PerfilUsuario } from "@/lib/types";

const TH =
  "border-b border-app-line bg-[#f8faff] px-3 py-2.5 text-left text-[11px] font-bold text-[#23345d]";
const TD =
  "border-b border-app-line px-3 py-2.5 text-[13px] text-[#1f2937] align-middle";

interface UsuariosTableProps {
  usuarios: PerfilUsuario[];
  loading: boolean;
  error: string | null;
}

export function UsuariosTable({
  usuarios,
  loading,
  error,
}: UsuariosTableProps) {
  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-app-muted">
        Carregando usuários...
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#dc2626]">
        {error}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-app-line bg-white/[0.88] shadow-card">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            {["Nome", "E-mail", "Perfil", "Status"].map((h) => (
              <th key={h} className={TH}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-sm text-app-muted">
                Nenhum usuário cadastrado.
              </td>
            </tr>
          ) : (
            usuarios.map((u) => (
              <tr
                key={u.id}
                className="transition-colors hover:bg-[#fafbff]"
              >
                <td className={`${TD} font-bold text-navy`}>{u.nome}</td>
                <td className={TD}>{u.email}</td>
                <td className={TD}>{labelPerfil(u.perfil)}</td>
                <td className={TD}>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      u.ativo
                        ? "bg-brand-green-soft text-brand-green"
                        : "bg-brand-red-soft text-brand-red"
                    }`}
                  >
                    {u.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
