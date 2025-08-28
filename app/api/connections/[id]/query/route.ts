import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import prisma from "@/lib/prisma";

function validateSql(sql: string) {
  const s = sql.trim();
  if (!/^(select|with)\b/i.test(s)) throw new Error("Only SELECT/WITH queries are allowed");
  if (s.split(";").length > 1 && !s.endsWith(";")) throw new Error("Multiple statements are not allowed");
  if (s.includes(";\n") || s.includes(";\r") || /;\s+\S/.test(s)) throw new Error("Multiple statements are not allowed");
  return s.replace(/;+\s*$/g, "");
}

function ensureLimit(sql: string, defaultLimit = 500) {
  if (/\blimit\s+\d+/i.test(sql)) return sql;
  return `${sql} LIMIT ${defaultLimit}`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = (body.sql ?? "") as string;
    if (!raw || typeof raw !== "string") {
      return NextResponse.json({ ok: false, error: "SQL is required" }, { status: 400 });
    }

    const sqlValidated = validateSql(raw);
    const sql = ensureLimit(sqlValidated, 500);

    const conn = await prisma.connection.findUnique({
      where: { id: params.id },
      select: { host: true, port: true, username: true, password: true, database: true },
    });
    if (!conn) return NextResponse.json({ ok: false, error: "Connection not found" }, { status: 404 });

    const pool = await mysql.createPool({
      host: conn.host,
      port: conn.port || 3306,
      user: conn.username,
      password: conn.password || undefined,
      database: conn.database || undefined,
    });

    const [rows] = await pool.query(sql);
    await pool.end();

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Query failed" }, { status: 500 });
  }
}