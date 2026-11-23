"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FilingStatus } from "@/lib/tax";
import { calculateLandingEstimate, FILING_STATUS_OPTIONS, formatUSD } from "@/lib/landing-estimate";

function useAnimatedNumber(target: number): number {
  const [current, setCurrent] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    const duration = isReduced ? 0 : 280; // ms; reduced motion jumps straight to the value on the next frame
    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = duration > 0 ? Math.min(1, elapsed / duration) : 1;
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(start + diff * ease);
      setCurrent(val);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target]);

  return current;
}

export function TaxPreview() {
  const [income, setIncome] = useState<number>(95000);
  const [deductions, setDeductions] = useState<number>(15000);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>("SINGLE");

  const estimate = calculateLandingEstimate({
    incomeDollars: income,
    deductionsDollars: deductions,
    filingStatus,
  });

  const animatedTotal = useAnimatedNumber(estimate.totalTaxCents);
  const animatedSe = useAnimatedNumber(estimate.seTaxCents);
  const animatedIncomeTax = useAnimatedNumber(estimate.incomeTaxCents);
  const animatedQuarterly = useAnimatedNumber(estimate.quarterlyPaymentCents);

  return (
    <div className="tax-preview-card">
      <div className="tax-preview-grid">
        {/* Sliders and Controls Column */}
        <div className="tax-preview-controls">
          {/* Income Slider */}
          <div className="tax-slider-group">
            <div className="tax-slider-header">
              <label htmlFor="income-slider" className="tax-slider-label">
                Annual freelance income
              </label>
              <output htmlFor="income-slider" className="tax-slider-val mono">
                {formatUSD(income * 100)}
              </output>
            </div>
            <input
              id="income-slider"
              type="range"
              min="10000"
              max="250000"
              step="1000"
              value={income}
              onChange={e => setIncome(Number(e.target.value))}
              className="tax-range-input"
              aria-label="Annual freelance income"
            />
            <div className="tax-slider-bounds mono" aria-hidden="true">
              <span>$10k</span>
              <span>$250k</span>
            </div>
          </div>

          {/* Deductions Slider */}
          <div className="tax-slider-group">
            <div className="tax-slider-header">
              <label htmlFor="deductions-slider" className="tax-slider-label">
                Business deductions
              </label>
              <output htmlFor="deductions-slider" className="tax-slider-val mono">
                {formatUSD(deductions * 100)}
              </output>
            </div>
            <input
              id="deductions-slider"
              type="range"
              min="0"
              max="80000"
              step="1000"
              value={deductions}
              onChange={e => setDeductions(Number(e.target.value))}
              className="tax-range-input"
              aria-label="Business deductions"
            />
            <div className="tax-slider-bounds mono" aria-hidden="true">
              <span>$0</span>
              <span>$80k</span>
            </div>
          </div>

          {/* Filing Status Segmented Control */}
          <div className="tax-filing-group">
            <label id="filing-status-label" className="tax-slider-label">
              Filing status
            </label>
            <div
              className="tax-segmented-control"
              role="radiogroup"
              aria-labelledby="filing-status-label"
            >
              {FILING_STATUS_OPTIONS.map(opt => {
                const checked = filingStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    className={`tax-segment-btn ${checked ? "active" : ""}`}
                    onClick={() => setFilingStatus(opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results Output Column */}
        <div className="tax-preview-results" aria-live="polite">
          <div className="tax-result-hero">
            <div className="tax-result-label">Estimated 2026 total federal tax</div>
            <output className="tax-result-total mono">
              {formatUSD(animatedTotal)}
            </output>
          </div>

          <div className="tax-result-split">
            <div className="tax-split-item">
              <span className="tax-split-label">Self-employment tax</span>
              <output className="tax-split-value mono">
                {formatUSD(animatedSe)}
              </output>
            </div>
            <div className="tax-split-item">
              <span className="tax-split-label">Federal income tax</span>
              <output className="tax-split-value mono">
                {formatUSD(animatedIncomeTax)}
              </output>
            </div>
          </div>

          <div className="tax-quarterly-callout">
            <div>
              <span className="tax-quarterly-label">Even quarterly payment (total / 4)</span>
              <output className="tax-quarterly-value mono">
                {formatUSD(animatedQuarterly)}
              </output>
            </div>
            <Link className="button button-sm" href="/signup">
              Track your real numbers <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <p className="tax-preview-disclaimer">
        Estimate for planning, not tax advice. US federal only; excludes state tax and credits.
      </p>
    </div>
  );
}
