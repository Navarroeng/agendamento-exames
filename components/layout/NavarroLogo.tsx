import Image from "next/image";

interface NavarroLogoProps {
  priority?: boolean;
  className?: string;
  size?: "default" | "hero" | "sidebar";
}

const sizeClasses = {
  default: "h-[34px] sidebar:h-[42px]",
  hero: "h-[52px] sm:h-[64px]",
  sidebar: "h-[72px]",
};

export function NavarroLogo({
  priority,
  className = "",
  size = "default",
}: NavarroLogoProps) {
  return (
    <Image
      src="/logo-navarro.png"
      alt="Navarro Engenharia"
      width={280}
      height={64}
      priority={priority}
      style={{ width: "auto" }}
      className={`max-w-full object-contain ${sizeClasses[size]} ${className}`.trim()}
    />
  );
}
