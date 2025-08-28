import { headers } from "next/headers";
import ProfileForm from "@/components/profile/ProfileForm";

async function getProfile() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const cookie = h.get("cookie") ?? "";
  if (!host) return null;
  const res = await fetch(`${proto}://${host}/api/profile`, { cache: "no-store", headers: { cookie } });
  if (!res.ok) return null;
  const j = await res.json();
  return j.user as { id: string; email: string; name: string | null } | null;
}

export default async function Page() {
  const user = await getProfile();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
      </div>
      <div className="rounded-2xl border p-6">
        <ProfileForm initial={{ name: user?.name ?? "", email: user?.email ?? "" }} />
      </div>
    </div>
  );
}