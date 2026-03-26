import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl bg-white p-6 shadow-soft ${className}`}>
      {children}
    </div>
  );
}
