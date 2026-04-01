"use client";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export default function FormField({ label, hint, className = "", ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-white font-medium text-xl flex items-baseline gap-2">
        {label}
        {hint && <span className="text-white/60 font-normal text-xs">{hint}</span>}
      </label>
      <input
        className={`w-full rounded-full px-5 py-2 text-white text-sm outline-none border-4 border-violet-dark transition bg-black font-[inherit] ${className}`}
        {...inputProps}
      />
    </div>
  );
}
