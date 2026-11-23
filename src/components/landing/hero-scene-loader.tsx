"use client";

import dynamic from "next/dynamic";
import { HeroFallback } from "@/components/landing/hero-scene-fallback";

/** Client-only wrapper: three.js never runs on the server, and the static composition holds the space while it loads. */
export const HeroSceneLoader = dynamic(() => import("@/components/landing/hero-scene"), {
  ssr: false,
  loading: () => <HeroFallback />,
});
