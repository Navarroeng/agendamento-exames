import type { ReactNode } from "react";

type IconBoxSize = "sm" | "md" | "lg";

const sizeClasses: Record<IconBoxSize, string> = {
  sm: "h-8 w-8 rounded-[10px] [&_svg]:h-4 [&_svg]:w-4",
  md: "h-10 w-10 rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]",
  lg: "h-12 w-12 rounded-xl [&_svg]:h-5 [&_svg]:w-5",
};

interface IconBoxProps {
  children: ReactNode;
  size?: IconBoxSize;
  className?: string;
}

export function IconBox({
  children,
  size = "md",
  className = "",
}: IconBoxProps) {
  return (
    <div
      className={`grid shrink-0 place-items-center border border-brand-blue/15 bg-gradient-to-br from-brand-blue-soft/90 to-white text-brand-blue shadow-[0_4px_16px_rgba(79,99,255,0.08)] ${sizeClasses[size]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

interface PageIconProps {
  children: ReactNode;
}

export function PageIcon({ children }: PageIconProps) {
  return <IconBox size="lg">{children}</IconBox>;
}

interface PanelIconProps {
  children: ReactNode;
  tone?: "blue" | "green" | "purple" | "orange";
}

const toneClasses = {
  blue: "border-brand-blue/15 bg-gradient-to-br from-brand-blue-soft/90 to-white text-brand-blue",
  green:
    "border-brand-green/15 bg-gradient-to-br from-brand-green-soft to-white text-brand-green",
  purple:
    "border-brand-purple/15 bg-gradient-to-br from-brand-purple-soft to-white text-brand-purple",
  orange:
    "border-brand-orange/15 bg-gradient-to-br from-brand-orange-soft to-white text-[#c96d00]",
};

export function PanelIcon({ children, tone = "blue" }: PanelIconProps) {
  return (
    <div
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border shadow-[0_2px_10px_rgba(15,23,42,0.04)] [&_svg]:h-4 [&_svg]:w-4 ${toneClasses[tone]}`}
    >
      {children}
    </div>
  );
}
