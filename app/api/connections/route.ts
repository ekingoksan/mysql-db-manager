import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/getSession";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await prisma.connection.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(connections);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !body.host || !body.username) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const connection = await prisma.connection.create({
    data: {
      userId: session.user.id,
      name: body.name,
      host: body.host,
      port: body.port ?? 3306,
      username: body.username,
      password: body.password ?? "",
      database: body.database || null,
    },
  });

  return NextResponse.json(connection);
}