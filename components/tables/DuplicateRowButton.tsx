"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { normalizeForType } from "@/lib/mysql-normalize";
import { toast } from "sonner";

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

function inputType(t: string) {
  const s = t.toLowerCase();
  if (s.includes("datetime") || s.includes("timestamp")) return "datetime-local";
  if (s === "date") return "date";
  if (s === "time") return "time";
  if (/(int|decimal|double|float|year)/.test(s)) return "number";
  return "text";
}

export default function DuplicateRowButton({
  connectionId,
  tableId,
  row,
  meta,
  label = "Duplicate",
}: {
  connectionId: string;
  tableId: string;
  row: Record<string, unknown>;
  meta: Meta | null;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { copyBase, requiredFields } = useMemo(() => {
    const copy: Record<string, unknown> = {};
    const required: { name: string; type: string; autoGen?: boolean }[] = [];
    if (!meta) return { copyBase: copy, requiredFields: required };

    for (const c of meta.columns) {
      const extra = (c.extra || "").toLowerCase();
      const isAutoInc = extra.includes("auto_increment");
      const typeLower = c.type.toLowerCase();

      if (c.isPrimary) {
        if (isAutoInc && /(int)/.test(typeLower)) {
          continue;
        }
        if (/(char|varchar)/.test(typeLower) && c.type.toLowerCase().includes("char")) {
          copy[c.name] = crypto.randomUUID();
          continue;
        }
        required.push({ name: c.name, type: c.type });
        continue;
      }
      copy[c.name] = row[c.name];
    }
    return { copyBase: copy, requiredFields: required };
  }, [meta, row]);

  function openModal() {
    setErr(null);
    setForm({});
    setOpen(true);
  }

  async function onConfirm() {
    if (!meta) return;
    setBusy(true);
    setErr(null);

    const toStr = (v: unknown) =>
      v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);

    try {
      const data: Record<string, unknown> = {};

      for (const c of meta.columns) {
        const t = c.type;
        const extra = (c.extra || "").toLowerCase();
        const isAutoIncInt = c.isPrimary && extra.includes("auto_increment") && /int/i.test(t);

        if (isAutoIncInt) continue;

        if (c.isPrimary && /(char|varchar)/i.test(t)) {
          data[c.name] = normalizeForType(crypto.randomUUID(), t);
          continue;
        }

        if (c.isPrimary) {
          const rawPk = form[c.name];
          if (!rawPk) throw new Error(`Field '${c.name}' is required`);
          data[c.name] = normalizeForType(toStr(rawPk), t);
          continue;
        }

        const rawForm = form[c.name];
        const rawVal = rawForm !== undefined ? rawForm : row[c.name];
        data[c.name] = normalizeForType(toStr(rawVal), t);
      }

      const res = await fetch(
        `/api/connections/${connectionId}/tables/${encodeURIComponent(tableId)}/insert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        throw new Error(j?.detail || j?.error || `Duplicate failed (HTTP ${res.status})`);
      }
      toast.success("Row duplicated");
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
      <Button
        variant="outline"
        size="sm"
        className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        onClick={openModal}
        disabled={!meta}
      >
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate row</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-700 dark:text-gray-300">
            A new row will be created with the same values (excluding auto PKs).
          </p>

          {meta && requiredFields.length > 0 && (
            <div className="mt-3 grid gap-3">
              {requiredFields.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={`dup-${f.name}`}>
                    {f.name} <span className="text-xs text-muted-foreground">({f.type})</span>
                  </Label>
                  <Input
                    id={`dup-${f.name}`}
                    type={inputType(f.type)}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                    placeholder={f.type}
                  />
                </div>
              ))}
            </div>
          )}

          {err && (
            <ScrollArea className="mt-3 max-h-28 rounded-md border border-red-300 p-2 text-sm text-red-700">
              {err}
            </ScrollArea>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={busy || !meta}
              className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? "Duplicating..." : "Duplicate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}