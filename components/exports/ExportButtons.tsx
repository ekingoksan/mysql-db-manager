"use client";

import { Button } from "@/components/ui/button";

export default function ExportButtons({
  csvHref,
  jsonHref,
}: {
  csvHref: string;
  jsonHref: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" asChild>
        <a href={csvHref}>Export CSV</a>
      </Button>
      <Button variant="outline" asChild>
        <a href={jsonHref}>Export JSON</a>
      </Button>
    </div>
  );
}