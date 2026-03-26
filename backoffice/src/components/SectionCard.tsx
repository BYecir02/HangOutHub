import React from 'react';
import Card from './Card';

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionCard({ children, className = '' }: SectionCardProps) {
  return <Card className={className}>{children}</Card>;
}
