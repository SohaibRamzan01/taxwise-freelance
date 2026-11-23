"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";

export interface LedgerCellItem {
  label: React.ReactNode;
  amountCents: number;
  helperText?: React.ReactNode;
  highlight?: boolean;
}

/**
 * Server markup and later updates always show the real figure. Only the first client mount
 * counts up once (700 ms ease-out), and never under reduced motion. While counting, the
 * accessible text stays the final value.
 */
export function CountUpMoney({ amountCents }: { amountCents: number }) {
  const [frameValue, setFrameValue] = useState<number | null>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    const duration = 700;
    const start = performance.now();
    let frameId = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      if (progress < 1) {
        setFrameValue(Math.round(amountCents * ease));
        frameId = requestAnimationFrame(tick);
      } else {
        setFrameValue(null);
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [amountCents]);

  if (frameValue === null) return <span className="money">{formatMoney(amountCents)}</span>;
  return (
    <span className="money">
      <span aria-hidden="true">{formatMoney(frameValue)}</span>
      <span className="sr-only">{formatMoney(amountCents)}</span>
    </span>
  );
}

export function LedgerStrip({ cells }: { cells: LedgerCellItem[] }) {
  return (
    <div className="ledger-strip" role="region" aria-label="Key financial figures">
      {cells.map((cell, idx) => (
        <div key={idx} className={`ledger-cell${cell.highlight ? " ledger-cell-highlight" : ""}`}>
          <div className="ledger-label">{cell.label}</div>
          <div className="ledger-figure">
            {cell.highlight ? (
              <span className="ledger-highlight">
                <CountUpMoney amountCents={cell.amountCents} />
              </span>
            ) : (
              <CountUpMoney amountCents={cell.amountCents} />
            )}
          </div>
          {cell.helperText ? (
            <p className="ledger-helper">{cell.helperText}</p>
          ) : (
            <div className="ledger-helper-spacer" />
          )}
        </div>
      ))}
    </div>
  );
}
