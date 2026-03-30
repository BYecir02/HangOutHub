
interface Column {
  label: string;
  className?: string;
}

import type { ReactNode } from 'react';

interface DataTableProps {
  columns: Column[];
  children: ReactNode;
}

export default function DataTable({ columns, children }: DataTableProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="min-w-[680px] w-full text-left text-sm sm:min-w-0">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            {columns.map((column) => (
              <th key={column.label} className={`pb-3 ${column.className || ''}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

