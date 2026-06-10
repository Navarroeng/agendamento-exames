import { isEnvioEsocialConcluido } from "@/lib/esocial-filters";
import { formatEsocialReciboForDisplay } from "@/lib/esocial-recibo";
import type { AgendamentoWithExames } from "@/lib/types";
import {
  DocMiniCard,
  IconCloud,
  IconPencil,
  IconSend,
  IconShield,
  IconUser,
  SectionHeading,
} from "./ViewModalUi";

interface ViewModalDocumentationSectionProps {
  agendamento: AgendamentoWithExames;
}

export function ViewModalDocumentationSection({
  agendamento,
}: ViewModalDocumentationSectionProps) {
  return (
    <section>
      <SectionHeading
        icon={<IconShield />}
        iconBg="bg-[#4f8cff]"
        title="Status e documentação"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <DocMiniCard
          icon={<IconCloud />}
          title="ASO enviado para clínica"
          concluido={agendamento.aso_enviado_clinica}
          data={agendamento.data_aso_enviado_clinica}
        />
        <DocMiniCard
          icon={<IconPencil />}
          title="ASO assinado"
          concluido={agendamento.aso_assinado}
          data={agendamento.data_aso_assinado}
        />
        <DocMiniCard
          icon={<IconUser />}
          title="ASO enviado p/ cliente"
          concluido={agendamento.aso_enviado_cliente}
          data={agendamento.data_aso_enviado_cliente}
        />
        <DocMiniCard
          icon={<IconSend />}
          title="Envio ao e-Social"
          concluido={isEnvioEsocialConcluido(agendamento.envio_esocial)}
          data={agendamento.data_envio_esocial}
          dataLabel="Data envio e-Social"
          extra={formatEsocialReciboForDisplay(agendamento.esocial_recibo)}
          extraLabel="Nº Recibo"
        />
      </div>
    </section>
  );
}
