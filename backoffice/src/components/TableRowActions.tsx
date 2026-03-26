
import type { ReactNode } from 'react';

interface TableRowActionsProps {
  children: ReactNode;
}

export default function TableRowActions({ children }: TableRowActionsProps) {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}

