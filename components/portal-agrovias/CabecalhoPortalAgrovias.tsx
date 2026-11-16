export function CabecalhoPortalAgrovias() {
  return (
    <div className="relative h-[100px] w-full overflow-hidden bg-[#dfe8cf] sidebar:h-[140px]">
      <img
        src="/portal-agrovias/vegetacao.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[min(28rem,72%)] bg-gradient-to-r from-white/60 via-white/30 to-transparent"
      />
      <img
        src="/portal-agrovias/logo-agrovias.png"
        alt="AGROVIAS Meio Ambiente e Paisagem"
        className="absolute left-3.5 top-1/2 h-[82px] w-auto -translate-y-1/2 object-contain sidebar:left-6 sidebar:h-[116px]"
      />
    </div>
  );
}
