"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/connections", label: "Connections" },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-white dark:bg-gray-800 shadow-lg transition-transform lg:translate-x-0 lg:static lg:inset-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4">
          <div className="font-bold text-xl text-gray-800 dark:text-gray-100">
            DB Manager
          </div>
          <button
            aria-label="Close sidebar"
            className="rounded-md p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 lg:hidden"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <nav className="mt-2 space-y-2 px-2 pb-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block px-3 py-2 rounded-md",
                pathname === item.href
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}