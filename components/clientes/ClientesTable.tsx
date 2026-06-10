import { Panel } from "@/components/ui/Panel";

import { IconClipboard } from "@/components/ui/icons/OutlineIcons";

import { formatCNPJ } from "@/lib/cnpj";
import type { ClienteRecord } from "@/lib/types";



interface ClientesTableProps {

  clientes: ClienteRecord[];

  loading: boolean;

  error: string | null;

  onAbrir: (id: string) => void;

}



export function ClientesTable({

  clientes,

  loading,

  error,

  onAbrir,

}: ClientesTableProps) {

  return (

    <Panel

      title="Clientes cadastrados"

      icon={<IconClipboard />}

      iconTone="purple"

    >

      <div className="table-wrap -mx-6 overflow-auto px-6">

        {loading && (

          <p className="py-8 text-center text-sm text-app-muted">

            Carregando clientes...

          </p>

        )}



        {!loading && error && (

          <p className="py-8 text-center text-sm text-brand-red">{error}</p>

        )}



        {!loading && !error && clientes.length === 0 && (

          <p className="py-8 text-center text-sm text-app-muted">

            Nenhum cliente cadastrado.

          </p>

        )}



        {!loading && !error && clientes.length > 0 && (

          <table className="table-premium w-full min-w-[520px]">

            <thead>

              <tr>

                {["Nome", "CNPJ", "Ações"].map((h) => (

                  <th key={h}>{h}</th>

                ))}

              </tr>

            </thead>

            <tbody>

              {clientes.map((cliente) => (

                <tr key={cliente.id}>

                  <td className="font-bold text-navy">{cliente.nome}</td>

                  <td>{formatCNPJ(cliente.cnpj)}</td>

                  <td>

                    <button

                      type="button"

                      className="rounded-lg bg-brand-blue-soft px-2.5 py-1 text-[10px] font-bold text-brand-blue"

                      onClick={() => onAbrir(cliente.id)}

                    >

                      Abrir

                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>

    </Panel>

  );

}

