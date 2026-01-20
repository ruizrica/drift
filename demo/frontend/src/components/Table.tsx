/**
 * Table Component
 * 
 * ✓ PATTERN: Consistent table styling
 * ✓ PATTERN: Generic typing for data
 */

import React from 'react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  className = '',
}: TableProps<T>): React.ReactElement {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="animate-spin text-2xl">⏳</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
                >
                  {column.render
                    ? column.render(item)
                    : String((item as Record<string, unknown>)[column.key as string] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
