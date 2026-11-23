"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
}

/**
 * Content is visible in the server markup. After mount (and only when motion is allowed) the
 * hidden state is added, then removed once the block scrolls into view. Classes are toggled on
 * the DOM node directly so no React state, and no extra render, is involved.
 */
export function ScrollReveal({ children, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return; // already on screen: never hide it

    el.classList.add("reveal-init");
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          el.classList.add("reveal-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className || undefined}>
      {children}
    </div>
  );
}
