import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/getSession";
import mysql, { RowDataPacket } from "mysql2/promise";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  const { id, table } = await params;

  const session = await getSession();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await prisma.connection.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!conn)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const decoded = decodeURIComponent(table || "");
  const [schema, tbl] = decoded.split(".");

  // Şema/tabloda '-' ve '$' karakterlerine izin veriyoruz (backtick ile quote ediyoruz)
  const identRe = /^[A-Za-z0-9_\-$]+$/;
  if (!schema || !tbl || !identRe.test(schema) || !identRe.test(tbl)) {
    return NextResponse.json({ error: "Invalid table id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("pageSize") || "25"))
  );
  const q = (url.searchParams.get("q") || "").trim();

  // Yeni: sort parametreleri
  const sortByParam = (url.searchParams.get("sortBy") || "").trim();
  const sortDirParam = (url.searchParams.get("sortDir") || "").toLowerCase();
  const sortDir: "asc" | "desc" =
    sortDirParam === "desc" ? "desc" : "asc"; // default asc

  const offset = (page - 1) * pageSize;

  let db: mysql.Connection | undefined;
  try {
    db = await mysql.createConnection({
      host: conn.host,
      port: conn.port,
      user: conn.username,
      password: conn.password,
      database: conn.database || undefined,
      multipleStatements: false,
      connectTimeout: 8000,
    });

    // 1) Kolonlar
    const [cols] = await db.execute<RowDataPacket[]>(
      `SELECT COLUMN_NAME, DATA_TYPE
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
      [schema, tbl]
    );
    if (!cols || cols.length === 0) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }
    const columnNames = cols.map((c) => c.COLUMN_NAME as string);

    // 2) Aranabilir kolonlar
    const likeTypes = new Set([
      "char",
      "varchar",
      "text",
      "tinytext",
      "mediumtext",
      "longtext",
    ]);
    const searchable = cols
      .filter((c) => likeTypes.has(String(c.DATA_TYPE).toLowerCase()))
      .map((c) => c.COLUMN_NAME as string);

    // 3) WHERE (opsiyonel arama)
    let whereSql = "";
    const whereParams: any[] = [];
    if (q && searchable.length > 0) {
      const likeParts = searchable.map(
        (c) => `\`${schema}\`.\`${tbl}\`.\`${c}\` LIKE ?`
      );
      whereSql = `WHERE ${likeParts.join(" OR ")}`;
      for (let i = 0; i < searchable.length; i++) whereParams.push(`%${q}%`);
    }

    // 4) Toplam kayıt
    const [countRows] = await db.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt
         FROM \`${schema}\`.\`${tbl}\`
         ${whereSql}`,
      whereParams
    );
    const total = Number((countRows[0] as any)?.cnt ?? 0);

    // 5) ORDER BY (güvenli)
    let orderBySql = "";
    if (sortByParam) {
      const sortCol = columnNames.find((c) => c === sortByParam);
      if (sortCol) {
        orderBySql = `ORDER BY \`${schema}\`.\`${tbl}\`.\`${sortCol}\` ${sortDir.toUpperCase()}`;
      }
    }

    // 6) Veriler
    const selectCols = columnNames
      .map((c) => `\`${schema}\`.\`${tbl}\`.\`${c}\``)
      .join(", ");
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT ${selectCols}
         FROM \`${schema}\`.\`${tbl}\`
         ${whereSql}
         ${orderBySql}
         LIMIT ? OFFSET ?`,
      [...whereParams, pageSize, offset]
    );

    return NextResponse.json({
      ok: true,
      schema,
      table: tbl,
      columns: columnNames,
      rows: rows as unknown[],
      page,
      pageSize,
      total,
      sort: {
        by: orderBySql ? sortByParam : null,
        dir: orderBySql ? sortDir : null,
      },
      q,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Query failed", detail: String(e?.message || e) },
      { status: 502 }
    );
  } finally {
    if (db) await db.end().catch(() => {});
  }
}