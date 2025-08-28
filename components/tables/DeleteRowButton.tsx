"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Meta = {
  ok: boolean;
  schema: string;
  table: string;
  primaryKey: string[];
};

export default function DeleteRowButton({
  connectionId,
  tableId, // "schema.table"
  row,
  label = "Delete",
}: {
  connectionId: string;
  tableId: string;
  row: Record<string, unknown>;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setErr(null);

    fetch(`/api/connections/${connectionId}/tables/${encodeURIComponent(tableId)}/meta`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setMeta({ ok: d.ok, schema: d.schema, table: d.table, primaryKey: d.primaryKey });
      })
      .catch(() => {
        const m = "Failed to load metadata";
        setErr(m);
        toast.error(m);
      });

    return () => {
      alive = false;
    };
  }, [open, connectionId, tableId]);

  const pkValues = useMemo(() => {
    if (!meta) return {};
    const v: Record<string, unknown> = {};
    for (const k of meta.primaryKey) v[k] = (row as any)[k];
    return v;
  }, [meta, row]);

  async function onConfirm() {
    if (!meta) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/connections/${connectionId}/tables/${encodeURIComponent(tableId)}/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pk: pkValues }),
        }
      );
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j?.detail || j?.error || "Delete failed");
      toast.success("Row deleted");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      const m = String(e.message || e);
      setErr(m);
      toast.error(m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* trigger */}
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete row</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-700 dark:text-gray-300 break-words [overflow-wrap:anywhere] whitespace-normal">
            This action cannot be undone. Are you sure you want to delete this row?
          </p>

          {meta && meta.primaryKey.length > 0 && (
            <div className="mt-3 rounded-md bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
              {meta.primaryKey.map((k) => (
                <div key={k} className="flex justify-between gap-3 min-w-0">
                  <span className="opacity-70 shrink-0">{k}</span>
                  <span className="break-all whitespace-pre-wrap text-right">
                    {String((row as any)[k])}
                  </span>
                </div>
              ))}
            </div>
          )}

          {err && (
            <div className="mt-3 rounded-md border border-red-300 text-red-700 px-3 py-2 text-sm break-words whitespace-pre-wrap max-h-28 overflow-auto">
              {err}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={busy}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}