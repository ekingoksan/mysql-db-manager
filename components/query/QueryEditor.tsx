"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DataTable from "@/components/ui/data-table";
import { toast } from "sonner";

type ApiResp =
  | { ok: true; rows: any[] }
  | { ok: false; error: string };

export default function QueryEditor({ connectionId }: { connectionId: string }) {
  const [sql, setSql] = useState<string>("SELECT NOW() AS now;");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setRows(null);
    try {
      const res = await fetch(`/api/connections/${connectionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const j: ApiResp = await res.json().catch(() => ({ ok: false, error: "Invalid response" }));
      if (!res.ok || !j.ok) {
        const msg = ("error" in j && j.error) || `Query failed (HTTP ${res.status})`;
        setError(msg);
        toast.error(msg);
        return;
      }
      setRows(j.rows || []);
      toast.success("Query executed");
    } catch (e: any) {
      const msg = String(e.message || e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function clearResult() {
    setRows(null);
    setError(null);
  }

  const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];
  const tableRows =
    rows?.map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)])
      )
    ) ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="Only SELECT / WITH queries are allowed"
          className="min-h-[160px] font-mono text-sm"
        />
        <div className="flex items-center gap-2">
          <Button onClick={run} disabled={loading || !sql.trim()}>
            {loading ? "Running..." : "Run"}
          </Button>
          <Button variant="outline" onClick={clearResult} disabled={loading || (!rows && !error)}>
            Clear
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 text-red-700 px-3 py-2 text-sm break-words whitespace-pre-wrap">
          {error}
        </div>
      )}

      {rows && (
        rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-muted-foreground">
            No rows
          </div>
        ) : (
          <section className="min-w-0">
            <DataTable columns={columns} rows={tableRows} minWidth={Math.max(960, columns.length * 140)} />
          </section>
        )
      )}
    </div>
  );
}