import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import mysql from "mysql2/promise";

type Params = { params: { id: string; table: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const conn = await prisma.connection.findUnique({ where: { id: params.id } });
    if (!conn) return NextResponse.json({ ok: false, error: "Connection not found" }, { status: 404 });

    const [schema, name] = params.table.includes(".")
      ? params.table.split(".", 2)
      : [conn.database || "", params.table];

    const pool = await mysql.createPool({
      host: conn.host,
      port: conn.port,
      user: conn.username,
      password: conn.password || undefined,
      database: conn.database || undefined,
      waitForConnections: true,
      connectionLimit: 4,
    });

    const [cols] = await pool.query(
      `SELECT COLUMN_NAME as name,
              COLUMN_TYPE as type,
              IS_NULLABLE='YES' as isNullable,
              COLUMN_DEFAULT as \`default\`,
              EXTRA as extra,
              COLUMN_KEY as keyType
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA=? AND TABLE_NAME=?
       ORDER BY ORDINAL_POSITION`,
      [schema, name]
    );

    const [idx] = await pool.query(
      `SELECT INDEX_NAME as indexName,
              SEQ_IN_INDEX as seq,
              COLUMN_NAME as columnName,
              NON_UNIQUE=0 as isUnique
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA=? AND TABLE_NAME=?
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [schema, name]
    );

    const [fks] = await pool.query(
      `SELECT k.CONSTRAINT_NAME as constraintName,
              k.COLUMN_NAME as columnName,
              k.REFERENCED_TABLE_SCHEMA as refSchema,
              k.REFERENCED_TABLE_NAME as refTable,
              k.REFERENCED_COLUMN_NAME as refColumn
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.TABLE_CONSTRAINTS c
         ON c.CONSTRAINT_NAME=k.CONSTRAINT_NAME
        AND c.TABLE_SCHEMA=k.TABLE_SCHEMA
        AND c.TABLE_NAME=k.TABLE_NAME
       WHERE c.CONSTRAINT_TYPE='FOREIGN KEY'
         AND k.TABLE_SCHEMA=? AND k.TABLE_NAME=?
       ORDER BY k.CONSTRAINT_NAME, k.ORDINAL_POSITION`,
      [schema, name]
    );

    await pool.end();

    return NextResponse.json({
      ok: true,
      schema,
      table: name,
      columns: cols,
      indexes: idx,
      foreignKeys: fks,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}