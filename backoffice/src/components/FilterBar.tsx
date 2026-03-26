import React from 'react';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export default function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {children}
    </div>
  );
}
