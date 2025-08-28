"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type User = { id: string; email: string; name?: string; image?: string } | null;

export function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    setMounted(true);
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (active) setUser(d.user ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const initials =
    user?.name?.slice(0, 1).toUpperCase() ||
    user?.email?.slice(0, 1).toUpperCase() ||
    "U";

  return (
    <header className="flex items-center justify-between p-3 md:p-4 shadow-sm bg-white dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon" onClick={onToggleSidebar} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="font-bold text-gray-800 dark:text-gray-100">
          <span>DB Manager</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {mounted && (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.image ?? ""} alt="avatar" />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            {user?.email && (
              <div className="px-2 pb-2 text-xs text-muted-foreground break-all">{user.email}</div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={logout} className="text-red-600">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}