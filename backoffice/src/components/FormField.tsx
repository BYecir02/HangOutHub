import React from 'react';

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export default function FormField({ label, hint, error, children }: FormFieldProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}
