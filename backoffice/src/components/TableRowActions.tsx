import React from 'react';

interface TableRowActionsProps {
  children: React.ReactNode;
}

export default function TableRowActions({ children }: TableRowActionsProps) {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}
