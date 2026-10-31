"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackMeta } from "@/lib/meta-pixel";

/** A PageView for every page the visitor sees. The admin panel isn't tracked. */
export default function MetaPixel() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname.startsWith("/admin")) trackMeta("PageView");
  }, [pathname]);
  return null;
}
