import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/getSession";
import mysql from "mysql2/promise";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const conn = await prisma.connection.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const blocked = new Set(["information_schema", "performance_schema", "mysql", "sys"]);
  const schemaFilter = conn.database
    ? "AND TABLE_SCHEMA = ?"
    : "AND TABLE_SCHEMA NOT IN ('information_schema','performance_schema','mysql','sys')";
  const paramsArr = conn.database ? [conn.database] : [];

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

    const [rows] = await db.execute<any[]>(
      `SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_ROWS
       FROM information_schema.TABLES
       WHERE 1=1 ${schemaFilter}
       ORDER BY TABLE_SCHEMA, TABLE_NAME`,
      paramsArr
    );

    const visibleRows = conn.database
      ? (rows as any[])
      : (rows as any[]).filter((r: any) => !blocked.has(r.TABLE_SCHEMA));

    const data = visibleRows.map((r: any) => ({
      schema: r.TABLE_SCHEMA,
      name: r.Table_name ?? r.TABLE_NAME,
      rows: r.TABLE_ROWS ?? 0,
    }));

    return NextResponse.json({ ok: true, tables: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Connection failed", detail: String(e?.message || e) },
      { status: 502 }
    );
  } finally {
    if (db) await db.end().catch(() => {});
  }
}