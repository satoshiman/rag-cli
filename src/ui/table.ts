/**
 * Table utilities for formatted CLI output using cli-table3
 */

import Table from 'cli-table3';

export interface TableOptions {
  head: string[];
  colWidths?: number[];
  colAligns?: ('left' | 'right' | 'center')[];
  style?: {
    head?: string[];
    border?: string[];
  };
}

export function createTable(options: TableOptions): Table.Table {
  return new Table({
    head: options.head,
    colWidths: options.colWidths,
    colAligns: options.colAligns,
    style: {
      head: [],
      border: ['gray'],
      ...options.style,
    },
  });
}

export function printKeyValueTable(data: Record<string, string | number>): void {
  const table = createTable({
    head: ['Property', 'Value'],
  });

  Object.entries(data).forEach(([key, value]) => {
    table.push([key, String(value)]);
  });

  console.log(table.toString());
}
