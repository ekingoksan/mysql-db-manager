"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SchemaViewer from "@/components/tables/SchemaViewer";

export default function SchemaDialogButton({
  connectionId,
  tableId,
  label = "Schema",
}: {
  connectionId: string;
  tableId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{label}</Button>
      </DialogTrigger>

      <DialogContent
      className="
            w-[calc(100vw-2rem)]   /* kenarlardan 1rem boşluk */
            max-w-none             /* sabit max genişliği kaldır */
            sm:max-w-5xl           /* büyük ekranlarda geniş */
        "
      >
        <DialogHeader>
          <DialogTitle>Table Schema</DialogTitle>
        </DialogHeader>

       <div className="mt-2 overflow-x-auto">
            <SchemaViewer connectionId={connectionId} tableId={tableId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}