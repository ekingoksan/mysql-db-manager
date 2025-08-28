import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionUser } from "./session";

export type SessionData = { user?: SessionUser };

export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}