"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrlKey = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  // Remount on route change so the bar resets without setState-in-effect.
  return <NavigationProgressBar key={currentUrlKey} currentUrlKey={currentUrlKey} />;
}

function NavigationProgressBar({ currentUrlKey }: { currentUrlKey: string }) {
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (/^(https?:|mailto:|tel:)/.test(href)) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const targetUrl = `${url.pathname}${url.search}`;
      if (targetUrl === currentUrlKey) return;

      setActive(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setActive(false), 4000);
    }

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentUrlKey]);

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-1 overflow-hidden bg-transparent">
      <div className="h-full w-full origin-left bg-[#C8102E] animate-nav-progress" />
    </div>
  );
}
