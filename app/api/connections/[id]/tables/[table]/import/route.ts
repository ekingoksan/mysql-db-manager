import { NextRequest, NextResponse } from "next/server";
import { parseCsv } from "@/lib/csv";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; table: string }> } // <- Promise!
) {
  try {
    const { id, table } = await ctx.params;               // <- await!

    const url = new URL(req.url);
    const cookie = req.headers.get("cookie") ?? "";
    const base = `${url.protocol}//${url.host}`;

    const form = await req.formData();
    const file = form.get("file");
    const format = String(form.get("format") || "csv").toLowerCase(); // csv|json
    const delimiter = String(form.get("delimiter") || ",");
    const emptyAsNull = String(form.get("emptyAsNull") || "true") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "File missing" }, { status: 400 });
    }
    const text = await file.text();

    const metaRes = await fetch(
      `${base}/api/connections/${id}/tables/${encodeURIComponent(table)}/meta`,
      { headers: { cookie }, cache: "no-store" }
    );
    if (!metaRes.ok) {
      return NextResponse.json({ ok: false, error: "Meta request failed" }, { status: 500 });
    }
    const meta = await metaRes.json();

    const { normalizeForType } = await import("@/lib/mysql-normalize");

    let objects: Record<string, unknown>[];

    if (format === "json") {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        return NextResponse.json({ ok: false, error: "JSON must be an array of objects" }, { status: 400 });
      }
      objects = parsed as Record<string, unknown>[];
    } else {
      const { header, rows } = parseCsv(text, delimiter);
      if (header.length === 0) {
        return NextResponse.json({ ok: false, error: "CSV header row is required" }, { status: 400 });
      }
      objects = rows.map((r) => {
        const o: Record<string, unknown> = {};
        header.forEach((h, idx) => { o[h] = r[idx] ?? ""; });
        return o;
      });
    }

    const cols: { name: string; type: string; isPrimary: boolean; extra?: string | null }[] = meta.columns || [];
    const autoPk = new Set(
      cols
        .filter((c) => c.isPrimary && (c.extra || "").toLowerCase().includes("auto_increment"))
        .map((c) => c.name)
    );

    let okCount = 0;
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < objects.length; i++) {
      const row = objects[i];
      const data: Record<string, unknown> = {};

      for (const c of cols) {
        if (autoPk.has(c.name)) continue;
        if (row.hasOwnProperty(c.name)) {
          let v: any = (row as any)[c.name];
          if (v === "" && emptyAsNull) v = null;
          if (v !== null && v !== undefined) {
            data[c.name] = normalizeForType(String(v), c.type);
          }
        }
      }

      const ins = await fetch(
        `${base}/api/connections/${id}/tables/${encodeURIComponent(table)}/insert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie },
          cache: "no-store",
          body: JSON.stringify({ data }),
        }
      );
      const jr = await ins.json().catch(() => ({}));
      if (ins.ok && jr?.ok) okCount++;
      else errors.push({ index: i, error: jr?.detail || jr?.error || `HTTP ${ins.status}` });
    }

    return NextResponse.json({ ok: true, inserted: okCount, failed: errors.length, errors });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}