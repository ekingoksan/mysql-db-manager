import { NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import prisma from "@/lib/prisma";
import mysql from "mysql2/promise";

type InsertBody = {
  data: Record<string, unknown>;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  const { id, table } = await params;

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await prisma.connection.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const decoded = decodeURIComponent(table || "");
  const [schema, tbl] = decoded.split(".");
  const identRe = /^[A-Za-z0-9_\-$]+$/;
  if (!schema || !tbl || !identRe.test(schema) || !identRe.test(tbl)) {
    return NextResponse.json({ error: "Invalid table id" }, { status: 400 });
  }

  let body: InsertBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const cols = Object.keys(body.data);
  if (cols.length === 0) {
    return NextResponse.json({ error: "No columns to insert" }, { status: 400 });
  }
  if (cols.some((k) => !/^[A-Za-z0-9_\-$]+$/.test(k))) {
    return NextResponse.json({ error: "Invalid column name" }, { status: 400 });
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

    const placeholders = cols.map(() => "?").join(",");
    const values = cols.map((k) => (body.data as any)[k]);

    const sql = `INSERT INTO \`${schema}\`.\`${tbl}\` (${cols
      .map((c) => `\`${c}\``)
      .join(",")}) VALUES (${placeholders})`;

    const [res] = await db.execute(sql, values);

    // @ts-expect-error mysql2 typing
    const insertId = res?.insertId ?? null;
    // @ts-expect-error mysql2 typing
    const affected = Number(res?.affectedRows ?? 0);

    return NextResponse.json({ ok: true, insertId, affected });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Insert failed", detail: String(e?.message || e) },
      { status: 502 }
    );
  } finally {
    if (db) await db.end().catch(() => {});
  }
}