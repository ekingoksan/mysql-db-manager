"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  connectionId: string;
  tableId: string; // "schema.table"
  triggerClassName?: string;
};

export default function ImportDialog({ connectionId, tableId, triggerClassName }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [delimiter, setDelimiter] = useState<string>(",");
  const [emptyToNull, setEmptyToNull] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ inserted: number; failed: number; errors: { index: number; message: string }[] } | null>(null);

  function reset() {
    setFile(null);
    setFormat("csv");
    setDelimiter(",");
    setEmptyToNull(true);
    setBusy(false);
    setError(null);
    setSummary(null);
  }

  async function startImport() {
    if (!file) {
      setError("Please choose a file.");
      return;
    }
    setBusy(true);
    setError(null);
    setSummary(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("format", format);
      fd.append("delimiter", delimiter);
      fd.append("emptyToNull", emptyToNull ? "1" : "0");

      const res = await fetch(
        `/api/connections/${connectionId}/tables/${encodeURIComponent(tableId)}/import`,
        { method: "POST", body: fd }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setError(j?.error || `Import failed (HTTP ${res.status})`);
      } else {
        setSummary({
          inserted: j.inserted ?? 0,
          failed: j.failed ?? 0,
          errors: Array.isArray(j.errors) ? j.errors : [],
        });
        // tabloyu yenile
        router.refresh();
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (busy) return;
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button 
            variant="outline" 
            className={triggerClassName}
            disabled={busy}
        >Import</Button>
      </DialogTrigger>

      <DialogContent className="w-full max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File */}
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              accept={format === "json" ? ".json,application/json" : ".csv,text/csv,.txt"}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground break-all">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          {/* Format & Delimiter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as "csv" | "json")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delimiter">Delimiter</Label>
              <Input
                id="delimiter"
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                disabled={format !== "csv"}
                placeholder=","
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="empty2null"
              checked={emptyToNull}
              onCheckedChange={(v) => setEmptyToNull(Boolean(v))}
            />
            <Label htmlFor="empty2null" className="text-sm">Empty → NULL</Label>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <div>Inserted: <b>{summary.inserted}</b></div>
              <div>Failed: <b>{summary.failed}</b></div>
              {summary.errors.length > 0 && (
                <div className="max-h-40 overflow-auto text-red-600 dark:text-red-300">
                  {summary.errors.map((e, i) => (
                    <div key={i}>#{e.index}: {e.message}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-end gap-2">
          <Button
          disabled={busy}
          variant="secondary" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={startImport} disabled={busy || !file}>
            {busy ? "Importing…" : "Start import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}