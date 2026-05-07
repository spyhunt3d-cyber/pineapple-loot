"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

export function WowheadTooltips() {
  const pathname = usePathname();

  useEffect(() => {
    // Re-register tooltip anchors after each client-side navigation
    const wh = (window as unknown as Record<string, unknown>)["WH"] as { Tooltips?: { refreshLinks?: () => void } } | undefined;
    wh?.Tooltips?.refreshLinks?.();
  }, [pathname]);

  return (
    <>
      <Script src="/wowhead-config.js" strategy="beforeInteractive" />
      <Script src="https://wow.zamimg.com/js/tooltips.js" strategy="afterInteractive" />
    </>
  );
}
