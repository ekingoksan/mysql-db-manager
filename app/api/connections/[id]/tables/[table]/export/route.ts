import { NextRequest } from "next/server";

/**
 * Bu endpoint mevcut /rows endpoint’ini sayfa sayfa çağırıp
 * TÜM satırları toplayarak JSON veya CSV döndürür.
 * Parametreler: ?format=json|csv&q=...&sortBy=...&sortDir=asc|desc
 */
export async function GET(req: NextRequest, ctx: { params: { id: string; table: string } }) {
  const { id, table } = ctx.params;
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "json").toLowerCase();
  const q = url.searchParams.get("q") || "";
  const sortBy = url.searchParams.get("sortBy") || "";
  const sortDir = url.searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  // mevcut rows endpoint’i üzerinden topla
  const cookie = req.headers.get("cookie") ?? "";
  const base = `${url.protocol}//${url.host}`;

  const pageSize = 1000; // büyük sayfa ile daha az tur
  let page = 1;
  let total = Infinity;
  let columns: string[] = [];
  const allRows: Record<string, unknown>[] = [];

  while (allRows.length < total) {
    const rowsUrl = new URL(
      `/api/connections/${id}/tables/${encodeURIComponent(table)}/rows`,
      base
    );
    rowsUrl.searchParams.set("page", String(page));
    rowsUrl.searchParams.set("pageSize", String(pageSize));
    if (q) rowsUrl.searchParams.set("q", q);
    if (sortBy) rowsUrl.searchParams.set("sortBy", sortBy);
    rowsUrl.searchParams.set("sortDir", sortDir);

    const r = await fetch(rowsUrl, { headers: { cookie }, cache: "no-store" });
    if (!r.ok) {
      const err = await r.text().catch(() => "");
      return new Response(err || "Failed to fetch rows", { status: r.status });
    }
    const j = (await r.json()) as {
      ok: boolean;
      columns: string[];
      rows: Record<string, unknown>[];
      total: number;
      page: number;
      pageSize: number;
    };

    if (!j.ok) {
      return new Response("Failed to load rows", { status: 500 });
    }

    if (columns.length === 0) columns = j.columns;
    total = j.total;
    allRows.push(...j.rows);

    if (j.rows.length < pageSize) break; // erken çıkış
    page++;
    // güvenlik için hard stop (aşırı büyük tablolar)
    if (page > 5000) break;
  }

  if (format === "csv") {
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = columns.join(",");
    const body = allRows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
    const csv = `${header}\n${body}`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${table}.csv"`,
      },
    });
  }

  // default: JSON
  const json = JSON.stringify(allRows, null, 2);
  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table}.json"`,
    },
  });
}