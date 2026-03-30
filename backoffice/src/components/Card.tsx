
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-soft sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

