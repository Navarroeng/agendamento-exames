export function CabecalhoPortalAgrovias() {
  return (
    <div className="relative h-[100px] w-full overflow-hidden bg-[#eef5ff] sidebar:h-[140px]">
      <img
        src="/portal-agrovias/faixa-mata.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <img
        src="/portal-agrovias/logo-agrovias.png"
        alt="AGROVIAS Meio Ambiente e Paisagem"
        className="absolute left-3 top-1/2 h-[86px] w-auto -translate-y-1/2 object-contain sidebar:left-5 sidebar:h-[122px]"
      />
    </div>
  );
}
