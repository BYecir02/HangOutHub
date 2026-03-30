
interface Option<T extends string | number> {
  label: string;
  value: T;
}

interface SelectFieldProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  className?: string;
}

export default function SelectField<T extends string | number>({
  value,
  onChange,
  options,
  className = '',
}: SelectFieldProps<T>) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 sm:w-auto ${className}`}
    >
      {options.map((option) => (
        <option key={String(option.value)} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

