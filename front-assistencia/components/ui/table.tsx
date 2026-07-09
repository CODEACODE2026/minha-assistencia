import type { ReactNode } from "react";
import { SkeletonTable } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  empty?: string;
};

export function DataTable<T>({ columns, data, loading, empty = "Nenhum registro encontrado." }: DataTableProps<T>) {
  if (loading) {
    return <SkeletonTable rows={5} columns={columns.length} />;
  }

  return (
    <div className="w-full max-w-full overflow-x-auto rounded border bg-card shadow-subtle">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/70">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={cn("whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground", column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length ? (
            data.map((row, index) => (
              <tr key={index} className="transition-colors hover:bg-muted/50">
                {columns.map((column) => (
                  <td key={column.key} className={cn("whitespace-nowrap px-4 py-3 align-middle", column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-10 text-center text-muted-foreground" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
