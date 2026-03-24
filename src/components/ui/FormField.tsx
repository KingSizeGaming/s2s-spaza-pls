"use client";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export default function FormField({ label, hint, className = "", ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-white font-extrabold text-base tracking-wide flex items-baseline gap-2">
        {label}
        {hint && <span className="text-white/60 font-normal text-xs">{hint}</span>}
      </label>
      <input
        className={`w-full rounded-full px-5 py-3 text-white text-sm outline-none border border-white/10 focus:border-white/30 transition ${className}`}
        style={{ backgroundColor: "#072610" }}
        {...inputProps}
      />
    </div>
  );
}
