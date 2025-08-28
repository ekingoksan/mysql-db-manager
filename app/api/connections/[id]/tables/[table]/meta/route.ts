import { NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import prisma from "@/lib/prisma";
import mysql, { RowDataPacket } from "mysql2/promise";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  const { id, table } = await params;

  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await prisma.connection.findFirst({ where: { id, userId: session.user.id } });
  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const decoded = decodeURIComponent(table || "");
  const [schema, tbl] = decoded.split(".");
  const identRe = /^[A-Za-z0-9_\-$]+$/;
  if (!schema || !tbl || !identRe.test(schema) || !identRe.test(tbl)) {
    return NextResponse.json({ error: "Invalid table id" }, { status: 400 });
  }

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

    const [cols] = await db.execute<RowDataPacket[]>(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
      [schema, tbl]
    );

    const columns = cols.map((c) => ({
      name: String(c.COLUMN_NAME),
      type: String(c.DATA_TYPE),
      isNullable: String(c.IS_NULLABLE).toUpperCase() === "YES",
      isPrimary: String(c.COLUMN_KEY || "") === "PRI",
      default: c.COLUMN_DEFAULT,
      extra: c.EXTRA ? String(c.EXTRA) : null,
    }));

    const pk = columns.filter((c) => c.isPrimary).map((c) => c.name);

    return NextResponse.json({
      ok: true,
      schema,
      table: tbl,
      columns,
      primaryKey: pk,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Meta failed", detail: String(e?.message || e) }, { status: 502 });
  } finally {
    if (db) await db.end().catch(() => {});
  }
}