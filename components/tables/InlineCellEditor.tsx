"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { normalizeForType } from "@/lib/mysql-normalize";

type Meta = {
  ok: boolean;
  schema: string;
  table: string;
  primaryKey: string[];
  columns: {
    name: string;
    type: string;           // information_schema.DATA_TYPE
    isNullable: boolean;
    isPrimary: boolean;
    default: any;
    extra: string | null;
  }[];
};

function resolveInputType(mysqlType: string) {
  const t = mysqlType.toLowerCase();
  if (t.includes("datetime") || t.includes("timestamp")) return "datetime-local";
  if (t === "date") return "date";
  if (t === "time") return "time";
  if (/(int|decimal|double|float|year)/.test(t)) return "number";
  return "text";
}

export default function InlineCellEditor({
  connectionId,
  tableId,
  meta,
  row,
  column,         // düzenlenecek kolon adı
  className = "",
}: {
  connectionId: string;
  tableId: string;          // "schema.table"
  meta: Meta;
  row: Record<string, unknown>;
  column: string;
  className?: string;
}) {
  const router = useRouter();
  const colDef = meta.columns.find(c => c.name === column);
  const isPrimary = !!colDef?.isPrimary;
  const extra = (colDef?.extra || "").toLowerCase();
  const isAutoInc = extra.includes("auto_increment");

  // PK -> row'dan
  const pk = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const k of meta.primaryKey) out[k] = row[k];
    return out;
  }, [meta, row]);

  // düzenlemeye uygun mu?
  const editable = !!colDef && !isPrimary && !isAutoInc;

  const initial = row[column];
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState<string>(() => {
    if (initial === null || initial === undefined) return "";
    if (typeof initial === "object") return JSON.stringify(initial);
    return String(initial);
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [editing]);

  function openEditor() {
    if (!editable) return;
    setErr(null);
    // her açılışta hücredeki güncel değeri göster
    const now = row[column];
    setVal(now == null ? "" : typeof now === "object" ? JSON.stringify(now) : String(now));
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setErr(null);
    // geri sar
    const now = row[column];
    setVal(now == null ? "" : typeof now === "object" ? JSON.stringify(now) : String(now));
  }

  async function save() {
    if (!editable) return;
    // değer değişmemişse istek atma
    const currentStr = initial == null ? "" : typeof initial === "object" ? JSON.stringify(initial) : String(initial);
    if (currentStr === val) {
      setEditing(false);
      return;
    }
    try {
      setBusy(true);
      setErr(null);
      const toSend =
        colDef ? normalizeForType(val, colDef.type) : val;

      const res = await fetch(
        `/api/connections/${connectionId}/tables/${encodeURIComponent(tableId)}/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pk, data: { [column]: toSend } }),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        throw new Error(j?.detail || j?.error || `Update failed (HTTP ${res.status})`);
      }
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  if (!editable) {
    // düzenlenemez hücre
    return (
      <div className={`truncate ${className}`} title={String(initial ?? "")}>
        {String(initial ?? "")}
      </div>
    );
  }

  if (!editing) {
    // görüntü modu
    return (
      <div
        className={`truncate cursor-text hover:bg-muted/50 rounded px-1 ${className}`}
        title="Double click to edit"
        onDoubleClick={openEditor}
      >
        {String(initial ?? "")}
      </div>
    );
  }

  // edit modu
  const inputType = resolveInputType(colDef?.type || "text");

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Input
        ref={inputRef}
        type={inputType}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        disabled={busy}
        className="h-8"
      />
      {err && (
        <span className="text-xs text-red-600 truncate" title={err}>
          {err}
        </span>
      )}
    </div>
  );
}