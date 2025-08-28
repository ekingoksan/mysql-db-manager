"use client";
import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import clsx from "clsx";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className={clsx(
        // sayfa: yatay taşmayı kapat, tam genişlik
        "min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 dark:bg-gray-900",
        "flex",
        sidebarOpen && "overflow-hidden" // mobilde body scroll kilidi
      )}
    >
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* içerik kolonu: min-w-0 KRİTİK */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        {/* sayfa içi: yine min-w-0 */}
        <main className="flex-1 min-w-0 px-4 md:px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}