import { ReactNode } from "react";

interface FieldProps {
  label: ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, children, className = "" }: FieldProps) {
  return (
    <div className={`field flex flex-col gap-1.5 ${className}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function RequiredMark() {
  return <span className="text-brand-red">*</span>;
}
