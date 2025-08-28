import Link from "next/link";
import { headers } from "next/headers";
import DataTable from "@/components/ui/data-table";
import EditRowButton from "@/components/tables/EditRowButton";
import DeleteRowButton from "@/components/tables/DeleteRowButton";
import AddRowButton from "@/components/tables/AddRowButton";
import InlineCellEditor from "@/components/tables/InlineCellEditor";
import DuplicateRowButton from "@/components/tables/DuplicateRowButton";
import SchemaDialogButton from "@/components/tables/SchemaDialogButton";
import ExportButtons from "@/components/exports/ExportButtons";

// shadcn/ui
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImportDialog from "@/components/import/ImportDialog";

type RowsResp = {
  ok: boolean;
  schema: string;
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
  page: number;
  pageSize: number;
  total: number;
  sort?: { by: string | null; dir: "asc" | "desc" | null };
  q?: string;
};

type Meta = {
  ok: boolean;
  schema: string;
  table: string;
  primaryKey: string[];
  columns: {
    name: string;
    type: string;
    isNullable: boolean;
    isPrimary: boolean;
    default: any;
    extra: string | null;
  }[];
};

async function fetchWithSession<T>(path: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const cookie = h.get("cookie") ?? "";
  if (!host) throw new Error("host missing");
  const url = `${proto}://${host}${path}`;
  const res = await fetch(url, { cache: "no-store", headers: { cookie } });
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return (await res.json()) as T;
}

function qs(base: string, params: Record<string, string | number | undefined>) {
  const u = new URL(base, "http://x");
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === "") return;
    u.searchParams.set(k, String(v));
  });
  return u.search;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; table: string }>;
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; sortBy?: string; sortDir?: "asc" | "desc" }>;
}) {
  const { id, table } = await params;
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page ?? "1"));
  const pageSize = Math.min(200, Math.max(1, Number(sp.pageSize ?? "25")));
  const q = sp.q ?? "";
  const sortBy = sp.sortBy ?? "";
  const sortDir = (sp.sortDir === "desc" ? "desc" : "asc") as "asc" | "desc";

  const apiPath = `/api/connections/${id}/tables/${table}/rows${qs("?", {
    page,
    pageSize,
    q,
    sortBy,
    sortDir,
  })}`;

  // Rows ve Meta'yı server-side çek
  const data = await fetchWithSession<RowsResp>(apiPath);
  const meta = await fetchWithSession<Meta>(`/api/connections/${id}/tables/${table}/meta`);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const prev = page > 1 ? page - 1 : 1;
  const next = page < totalPages ? page + 1 : totalPages;

  // Sütunlar + Actions
  const columns = [...data.columns, "Actions"];

  // Hücreleri InlineCellEditor ile sarmala, Actions'a Duplicate ekle
  const rows = data.rows.map((r) => {
    const cells: Record<string, unknown> = {};

    for (const col of data.columns) {
      cells[col] = (
        <InlineCellEditor
          connectionId={id}
          tableId={table}
          meta={meta}
          row={r}
          column={col}
        />
      );
    }

    cells["Actions"] = (
      <div className="flex items-center gap-2">
        <EditRowButton connectionId={id} tableId={table} row={r} />
        <DuplicateRowButton connectionId={id} tableId={table} row={r} meta={meta} />
        <DeleteRowButton connectionId={id} tableId={table} row={r} />
      </div>
    );

    return cells;
  });

  const makeSortHref = (col: string, nextDir: "asc" | "desc") =>
    qs("", {
      q,
      pageSize,
      page: 1,
      sortBy: col,
      sortDir: nextDir,
    });

  const exportBase = `/api/connections/${id}/tables/${table}/export`;
  const csvHref = exportBase + qs("?", { format: "csv", q, sortBy, sortDir });
  const jsonHref = exportBase + qs("?", { format: "json", q, sortBy, sortDir });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate">
            {data.schema}.{data.table}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {data.total} rows • page {data.page}/{totalPages}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AddRowButton connectionId={id} tableId={table} />
          <SchemaDialogButton connectionId={id} tableId={table} />
          <ExportButtons csvHref={csvHref} jsonHref={jsonHref} />
          <ImportDialog connectionId={id} tableId={table} />
          <Button variant="outline" asChild>
            <Link href={`/connections/${id}/query`}>Query</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/connections/${id}`}>Back</Link>
          </Button>
        </div>
      </div>

      <form action="" method="get" className="flex flex-wrap items-center gap-2">
        <Input
          className="w-64"
          type="search"
          name="q"
          placeholder="Search..."
          defaultValue={q}
        />
        <input type="hidden" name="sortBy" value={sortBy} />
        <input type="hidden" name="sortDir" value={sortDir} />

        <select
          name="pageSize"
          defaultValue={String(pageSize)}
          className="rounded-md border px-2 py-2 text-sm bg-white dark:bg-gray-900"
        >
          {[10, 25, 50, 100, 200].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>

        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>

      <section className="min-w-0">
        <DataTable
          columns={columns}
          rows={rows}
          minWidth={Math.max(960, columns.length * 140)}
          sortBy={data.sort?.by ?? null}
          sortDir={(data.sort?.dir as "asc" | "desc" | null) ?? null}
          makeSortHref={(col, nextDir) =>
            qs("", { q, pageSize, page: 1, sortBy: col, sortDir: nextDir })
          }
        />
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href={qs("", { q, pageSize, sortBy, sortDir, page: prev })}>← Prev</Link>
        </Button>

        <span className="text-sm text-gray-600 dark:text-gray-400">
          Page {page} / {totalPages}
        </span>

        <Button variant="outline" asChild>
          <Link href={qs("", { q, pageSize, sortBy, sortDir, page: next })}>Next →</Link>
        </Button>
      </div>
    </div>
  );
}