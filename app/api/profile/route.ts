import { NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, name: true, createdAt: true, updatedAt: true } });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { name?: string; email?: string; password?: string } | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data: { name?: string | null; email?: string; passwordHash?: string } = {};
  if (typeof body.name === "string") data.name = body.name.trim() === "" ? null : body.name.trim();
  if (typeof body.email === "string") data.email = body.email.trim();
  if (typeof body.password === "string" && body.password.trim() !== "") {
    if (body.password.trim().length < 6) return NextResponse.json({ error: "Password too short" }, { status: 400 });
    data.passwordHash = await bcrypt.hash(body.password.trim(), 12);
  }

  if (!("name" in data) && !("email" in data) && !("passwordHash" in data)) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  if (data.email) {
    const exists = await prisma.user.findFirst({ where: { email: data.email, NOT: { id: session.user.id } }, select: { id: true } });
    if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const user = await prisma.user.update({ where: { id: session.user.id }, data, select: { id: true, email: true, name: true, updatedAt: true } });
  return NextResponse.json({ ok: true, user });
}