import Link from "next/link";
import { AddConnectionDialog } from "@/components/connections/AddConnectionDialog";
import { headers } from "next/headers";
import DataTable from "@/components/ui/data-table";
import DeleteConnectionButton from "@/components/connections/DeleteConnectionButton";

type Connection = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  database: string | null;
  createdAt: string;
};

async function getConnections(): Promise<Connection[]> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const cookie = h.get("cookie") ?? "";
  if (!host) return [];
  const url = `${proto}://${host}/api/connections`;
  const res = await fetch(url, { cache: "no-store", headers: { cookie } });
  if (!res.ok) return [];
  return res.json();
}

export default async function Page() {
  const list = await getConnections();

  const columns = ["Name", "Host", "Database", "User", "Created", ""];
  const rows = list.map((c) => ({
    Name: (
      <Link href={`/connections/${c.id}`} className="text-blue-600 hover:underline">
        {c.name}
      </Link>
    ),
    Host: `${c.host}:${c.port}`,
    Database: c.database ?? "-",
    User: c.username,
    Created: new Date(c.createdAt).toLocaleString(),
    "": (
      <div className="flex items-center gap-2">
        <Link
          href={`/connections/${c.id}`}
          className="rounded-md border px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Open
        </Link>
        <DeleteConnectionButton id={c.id} name={c.name} />
      </div>

    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Connections</h1>
        <AddConnectionDialog />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-600 dark:text-gray-300">
          No connections yet
        </div>
      ) : (
        <section className="min-w-0">
          <DataTable columns={columns} rows={rows} minWidth={1100} />
        </section>
      )}
    </div>
  );
}