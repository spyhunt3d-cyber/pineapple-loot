"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

type WH = { Tooltips?: { refreshLinks?: () => void } };

function refreshWowhead() {
  const wh = (window as unknown as Record<string, unknown>)["WH"] as WH | undefined;
  wh?.Tooltips?.refreshLinks?.();
}

export function WowheadTooltips() {
  const pathname = usePathname();

  useEffect(() => {
    // Re-register tooltip anchors after each client-side navigation
    // Call twice — once immediately, once after a short delay for dynamic content
    refreshWowhead();
    const id = setTimeout(refreshWowhead, 500);
    return () => clearTimeout(id);
  }, [pathname]);

  return (
    <>
      <Script src="/wowhead-config.js" strategy="beforeInteractive" />
      <Script
        src="https://wow.zamimg.com/js/tooltips.js"
        strategy="afterInteractive"
        onLoad={() => { setTimeout(refreshWowhead, 200); }}
      />
    </>
  );
}
