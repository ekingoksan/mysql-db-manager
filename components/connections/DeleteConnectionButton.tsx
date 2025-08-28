"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DeleteConnectionButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onConfirm() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/connections/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) throw new Error(j?.error || "Delete failed");
      toast.success("Connection deleted");
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
        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete connection</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Are you sure you want to delete <span className="font-medium">{name}</span>?
          </p>
          {err && (
            <div className="mt-3 rounded-md border border-red-300 text-red-700 px-3 py-2 text-sm break-words whitespace-pre-wrap max-h-28 overflow-auto">
              {err}
            </div>
          )}
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onConfirm} disabled={busy} className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}