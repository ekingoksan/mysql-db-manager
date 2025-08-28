import { isValidElement } from "react";

type SortDir = "asc" | "desc";
type MakeSortHref = (col: string, nextDir: SortDir, isActive: boolean) => string;

type Props = {
  columns: string[];                      // kolon adları ve row key’leri aynı
  rows: Record<string, unknown>[];
  minWidth?: number;                      // küçük ekranda yatay scroll için alt genişlik
  sortBy?: string | null;                 // aktif kolon
  sortDir?: SortDir | null;               // aktif yön
  makeSortHref?: MakeSortHref;            // header tıklandığında gidecek linki üreten fonksiyon
};

export default function DataTable({
  columns,
  rows,
  minWidth = 900,
  sortBy = null,
  sortDir = null,
  makeSortHref,
}: Props) {
  return (
    <div
      className="w-full max-w-full overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table
        className="w-full table-auto bg-white dark:bg-gray-900 text-sm divide-y divide-gray-200 dark:divide-gray-700"
        style={{ minWidth: `${minWidth}px` }}
      >
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((c) => {
              const isActive = sortBy === c;
              const nextDir: SortDir = isActive && sortDir === "asc" ? "desc" : "asc";
              const icon = isActive ? (sortDir === "desc" ? "▼" : "▲") : "";
              const sortable = typeof makeSortHref === "function";
              const header = (
                <span className="inline-flex items-center gap-1">
                  <span>{c}</span>
                  <span className="text-[10px] leading-none">{icon}</span>
                </span>
              );
              return (
                <th
                  key={c}
                  className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap"
                >
                  {sortable ? (
                    <a href={makeSortHref!(c, nextDir, isActive)} className="hover:underline">
                      {header}
                    </a>
                  ) : (
                    header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              {columns.map((c) => {
                const v = (r as any)[c];
                return (
                  <td key={c} className="px-4 py-3 whitespace-nowrap">
                    {isValidElement(v) ? v : formatCell(v)}
                  </td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-600 dark:text-gray-300">
                No rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}