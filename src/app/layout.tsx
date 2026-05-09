import type { Metadata } from "next";
import "./globals.css";
import { WowheadTooltips } from "@/components/WowheadTooltips";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "Pineapple Loot Xpress",
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Guild loot management — Soft reserves, loot priority, and win tracking.",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <WowheadTooltips />
        {children}
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
