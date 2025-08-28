import { NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import prisma from "@/lib/prisma";
import mysql from "mysql2/promise";

type DeleteBody = {
  pk: Record<string, unknown>; // { id: 123 } veya composite { a:1, b:2 }
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  const { id, table } = await params;

  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  let body: DeleteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.pk || typeof body.pk !== "object") {
    return NextResponse.json({ error: "Missing pk" }, { status: 400 });
  }

  const pkKeys = Object.keys(body.pk);
  if (pkKeys.length === 0) {
    return NextResponse.json({ error: "Empty pk" }, { status: 400 });
  }
  if (pkKeys.some((k) => !/^[A-Za-z0-9_\-$]+$/.test(k))) {
    return NextResponse.json({ error: "Invalid pk column name" }, { status: 400 });
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

    const whereSql = pkKeys.map((k) => `\`${schema}\`.\`${tbl}\`.\`${k}\` = ?`).join(" AND ");
    const whereParams = pkKeys.map((k) => (body.pk as any)[k]);

    const [res] = await db.execute(
      `DELETE FROM \`${schema}\`.\`${tbl}\` WHERE ${whereSql} LIMIT 1`,
      whereParams
    );

    // @ts-ignore mysql typings
    const affected = Number(res?.affectedRows ?? 0);
    return NextResponse.json({ ok: true, affected });
  } catch (e: any) {
    return NextResponse.json({ error: "Delete failed", detail: String(e?.message || e) }, { status: 502 });
  } finally {
    if (db) await db.end().catch(() => {});
  }
}