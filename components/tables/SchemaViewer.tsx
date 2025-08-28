"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DataTable from "@/components/ui/data-table";

type Api = {
  ok: boolean;
  schema: string;
  table: string;
  columns: any[];
  indexes: any[];
  foreignKeys: any[];
  error?: string;
};

export default function SchemaViewer({
  connectionId,
  tableId,
}: {
  connectionId: string;
  tableId: string;
}) {
  const [data, setData] = useState<Api | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setErr(null);
    fetch(`/api/connections/${connectionId}/tables/${encodeURIComponent(tableId)}/schema`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Api) => {
        if (!alive) return;
        if (!j.ok) setErr(j.error || "Failed to load schema");
        setData(j);
      })
      .catch(() => setErr("Failed to load schema"));
    return () => {
      alive = false;
    };
  }, [connectionId, tableId]);

  if (err) return <div className="text-sm text-red-600">{err}</div>;
  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const colCols = ["name", "type", "isNullable", "default", "extra", "keyType"];
  const idxCols = ["indexName", "seq", "columnName", "isUnique"];
  const fkCols = ["constraintName", "columnName", "refSchema", "refTable", "refColumn"];

  return (
    <Tabs defaultValue="columns" className="w-full">
      <TabsList className="w-full overflow-x-auto flex gap-1">
        <TabsTrigger className="whitespace-nowrap" value="columns">Columns</TabsTrigger>
        <TabsTrigger className="whitespace-nowrap" value="indexes">Indexes</TabsTrigger>
        <TabsTrigger className="whitespace-nowrap" value="fks">Foreign Keys</TabsTrigger>
      </TabsList>

      <TabsContent value="columns">
        <div className="overflow-x-auto">
          <DataTable columns={colCols} rows={data.columns} minWidth={900} />
        </div>
      </TabsContent>

      <TabsContent value="indexes">
        <div className="overflow-x-auto">
          <DataTable columns={idxCols} rows={data.indexes} minWidth={800} />
        </div>
      </TabsContent>

      <TabsContent value="fks">
        <div className="overflow-x-auto">
          <DataTable columns={fkCols} rows={data.foreignKeys} minWidth={900} />
        </div>
      </TabsContent>
    </Tabs>
  );
}