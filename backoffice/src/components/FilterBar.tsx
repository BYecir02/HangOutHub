
import { Children, type ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export default function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div className={`flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
      {Children.map(children, (child) => (
        <div className="w-full sm:w-auto">{child}</div>
      ))}
    </div>
  );
}

