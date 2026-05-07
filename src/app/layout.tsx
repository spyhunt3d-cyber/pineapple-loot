import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/layout/NavBar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Pineapple Loot Xpress",
  description: "Guild loot management for Pineapple Express — Soft reserves, loot priority, and win tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Wowhead tooltip config (must load before the tooltip script) */}
        <script src="/wowhead-config.js" />
        {/* Wowhead tooltip engine — enables item tooltips on hover */}
        <script src="https://wow.zamimg.com/js/tooltips.js" async />
      </head>
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1">
          {children}
        </main>
        {/* Toast notifications for admin actions */}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1e1f2a",
              border: "1px solid #2e2f3e",
              color: "#e2e0d8",
            },
          }}
        />
      </body>
    </html>
  );
}
