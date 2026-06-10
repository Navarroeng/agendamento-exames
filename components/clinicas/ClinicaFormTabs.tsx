type ClinicaFormTab = "dados" | "exames";

interface ClinicaFormTabsProps {
  active: ClinicaFormTab;
  showExames: boolean;
  onChange: (tab: ClinicaFormTab) => void;
}

export function ClinicaFormTabs({
  active,
  showExames,
  onChange,
}: ClinicaFormTabsProps) {
  const tabs: { id: ClinicaFormTab; label: string }[] = [
    { id: "dados", label: "Dados da clínica" },
    ...(showExames ? [{ id: "exames" as const, label: "Exames da clínica" }] : []),
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-app-line bg-white p-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all ${
            active === tab.id
              ? "bg-gradient-to-r from-[#5b4acb] to-[#3f2f8f] text-white shadow-md"
              : "text-[#52617a] hover:bg-[#f4f6fb]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
