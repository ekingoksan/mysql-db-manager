"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ProfileForm({ initial }: { initial: { name: string; email: string } }) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body: Record<string, string> = {};
      if (name !== initial.name) body.name = name;
      if (email !== initial.email) body.email = email;
      if (password.trim() !== "") body.password = password.trim();

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Update failed");

      toast.success("Profile updated successfully");
      if (j?.user?.email) setEmail(j.user.email);
      if (j?.user?.name !== undefined) setName(j.user.name ?? "");
      setPassword("");
    } catch (e: any) {
      toast.error(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">New Password (optional)</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to keep current"
        />
        <p className="text-xs text-muted-foreground">
          Min 6 characters. Leave empty to keep current password.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setName(initial.name);
            setEmail(initial.email);
            setPassword("");
          }}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}