import Link from "next/link";
import { headers } from "next/headers";
import DataTable from "@/components/ui/data-table";

type Connection = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  database: string | null;
  createdAt: string;
};

type TableInfo = { schema: string; name: string; rows: number };

async function fetchWithSession<T>(path: string): Promise<T | null> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const cookie = h.get("cookie") ?? "";
  if (!host) return null;
  const url = `${proto}://${host}${path}`;
  const res = await fetch(url, { cache: "no-store", headers: { cookie } });
  if (!res.ok) return null;
  return res.json();
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [conn, tablesResp] = await Promise.all([
    fetchWithSession<Connection>(`/api/connections/${id}`),
    fetchWithSession<{ ok: boolean; tables: TableInfo[] }>(
      `/api/connections/${id}/tables`
    ),
  ]);

  const tables = tablesResp?.tables ?? [];

  const columns = ["Schema", "Table", "~Rows", "Actions"];
  const rows = tables.map((t) => ({
    Schema: t.schema,
    Table: t.name,
    "~Rows": `~${t.rows}`,
    Actions: (
      <Link
        href={`/connections/${id}/tables/${encodeURIComponent(`${t.schema}.${t.name}`)}`}
        className="rounded-md border px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        View rows
      </Link>
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {conn ? conn.name : "Connection"}
          </h1>
          {conn && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {conn.host}:{conn.port} {conn.database ? `• DB: ${conn.database}` : ""}
            </p>
          )}
        </div>
        <a
          href="/connections"
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Back
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-600 dark:text-gray-300">
          No tables found
        </div>
      ) : (
        <section className="min-w-0">
          <DataTable columns={columns} rows={rows}  />
        </section>
      )}
    </div>
  );
}