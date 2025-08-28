"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidElement } from "react";
import { normalizeForType } from "@/lib/mysql-normalize";
import { toast } from "sonner";

// shadcn/ui
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export default function EditRowButton({
  connectionId,
  tableId,
  row,
  label = "Edit",
}: {
  connectionId: string;
  tableId: string;
  row: Record<string, unknown>;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
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
        setMeta(d);
        const init: Record<string, string> = {};
        (d.columns || []).forEach((c: any) => {
          const v = (row as any)[c.name];
          if (isValidElement(v)) return;
          if (v === null || v === undefined) init[c.name] = "";
          else if (typeof v === "object") init[c.name] = JSON.stringify(v);
          else init[c.name] = String(v);
        });
        setForm(init);
      })
      .catch(() => setErr("Failed to load metadata"));

    return () => {
      alive = false;
    };
  }, [open, connectionId, tableId, row]);

  const editableCols = useMemo(() => {
    if (!meta) return [];
    return meta.columns.filter((c) => {
      const extra = (c.extra || "").toLowerCase();
      const isAutoInc = extra.includes("auto_increment");
      return !c.isPrimary && !isAutoInc;
    });
  }, [meta]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!meta) return;
    setSubmitting(true);
    setErr(null);

    const pk: Record<string, unknown> = {};
    for (const k of meta.primaryKey) pk[k] = (row as any)[k];

    const data: Record<string, unknown> = {};
    for (const c of editableCols) {
      const raw = form[c.name] ?? "";
      data[c.name] = normalizeForType(raw, c.type);
    }

    try {
      const res = await fetch(
        `/api/connections/${connectionId}/tables/${encodeURIComponent(tableId)}/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pk, data }),
        }
      );
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j?.detail || j?.error || "Update failed");
      toast.success("Row updated");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      const m = String(e.message || e);
      setErr(m);
      toast.error(m);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit row</DialogTitle>
          </DialogHeader>

          {!meta ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {editableCols.map((c) => (
                  <div key={c.name} className="space-y-1.5">
                    <Label htmlFor={`edit-${c.name}`}>
                      {c.name} <span className="text-xs text-muted-foreground">({c.type})</span>
                    </Label>
                    <Input
                      id={`edit-${c.name}`}
                      value={form[c.name] ?? ""}
                      onChange={(e) => setForm((s) => ({ ...s, [c.name]: e.target.value }))}
                      placeholder={c.type}
                    />
                  </div>
                ))}
              </div>

              {err && (
                <ScrollArea className="max-h-28 rounded-md border border-red-300 p-2 text-sm text-red-700">
                  {err}
                </ScrollArea>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}