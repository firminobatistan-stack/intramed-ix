"use client";

import * as React from "react";
import { WarpCarousel } from "@/components/ui/warp-carousel";

/** Warp Carousel filling the preview. */
export default function WarpCarouselDemo() {
  return (
    <main
      className="relative h-screen min-h-[340px] w-full overflow-hidden"
      style={{ backgroundColor: "#F4F6FB" }}
    >
      <WarpCarousel style={{ width: "100%", height: "100%" }} />
    </main>
  );
}
