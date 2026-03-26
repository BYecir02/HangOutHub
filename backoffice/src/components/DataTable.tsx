import React from 'react';

interface Column {
  label: string;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  children: React.ReactNode;
}

export default function DataTable({ columns, children }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
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
