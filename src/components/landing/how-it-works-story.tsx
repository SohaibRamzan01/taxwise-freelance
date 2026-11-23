"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, FileText, ScanLine, Sparkles } from "lucide-react";

interface Step {
  title: string;
  description: string;
  icon: typeof ScanLine;
}

const STEPS: Step[] = [
  {
    title: "Scan the receipt",
    description: "Upload a photo. Tesseract OCR reads the text and helps fill in the vendor, date and total. Check the details before you save.",
    icon: ScanLine,
  },
  {
    title: "Give it a category",
    description: "Rules suggest a deduction category, with Gemini assistance when available. Set business use and review the suggestion. You stay in control.",
    icon: Sparkles,
  },
  {
    title: "See where you stand",
    description: "Use your recorded income and deductions to estimate quarterly federal taxes. Download a tax-ready summary PDF when you need it.",
    icon: FileText,
  },
];

export function HowItWorksStory() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    stepRefs.current.forEach((el, index) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setActiveStep(index);
            }
          });
        },
        {
          rootMargin: "-25% 0px -40% 0px",
          threshold: 0.2,
        }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach(o => o.disconnect());
    };
  }, []);

  const renderVisual = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="story-mockup story-scan" aria-label="Mockup: OCR scanning a receipt">
            <div className="story-receipt-header">
              <span className="story-receipt-chip">Tesseract OCR</span>
              <span className="mono story-receipt-code">TW-024</span>
            </div>
            <div className="story-scan-beam" aria-hidden="true" />
            <div className="story-receipt-body">
              <div className="story-ocr-field matched">
                <span className="story-field-label">Vendor</span>
                <span className="story-field-val">Desk &amp; Circuit</span>
                <Check size={14} className="story-field-check" aria-hidden="true" />
              </div>
              <div className="story-ocr-field matched">
                <span className="story-field-label">Date</span>
                <span className="story-field-val mono">2026-06-08</span>
                <Check size={14} className="story-field-check" aria-hidden="true" />
              </div>
              <div className="story-ocr-field matched">
                <span className="story-field-label">Total</span>
                <span className="story-field-val mono font-bold">$240.00</span>
                <Check size={14} className="story-field-check" aria-hidden="true" />
              </div>
            </div>
            <div className="story-receipt-note">
              <Check size={13} aria-hidden="true" />
              <span>Text extracted from photo · editable before save</span>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="story-mockup story-category" aria-label="Mockup: Deductible category suggestion">
            <div className="story-category-card">
              <div className="story-card-top">
                <span className="story-card-title">Suggested tax category</span>
                <span className="story-gemini-badge"><Sparkles size={12} aria-hidden="true" /> Smart rule match</span>
              </div>
              <div className="story-category-pill" style={{ background: "#9FD6FF" }}>
                <span>Computer hardware &amp; equipment</span>
              </div>
              <div className="story-slider-mock">
                <div className="story-slider-header">
                  <span>Business use</span>
                  <span className="mono font-bold">100%</span>
                </div>
                <div className="story-slider-track" aria-hidden="true">
                  <div className="story-slider-fill" style={{ width: "100%" }} />
                </div>
              </div>
              <div className="story-category-calc">
                <span className="muted">Allowable deduction:</span>
                <strong className="mono">$240.00</strong>
              </div>
              <div className="story-category-schedule">
                IRS Schedule C · Line 18 (Office expense / equipment)
              </div>
            </div>
          </div>
        );
      case 2:
      default:
        return (
          <div className="story-mockup story-quarterly" aria-label="Mockup: Quarterly tax estimate summary">
            <div className="story-quarterly-card">
              <div className="story-q-header">
                <div>
                  <span className="story-q-quarter">Q2 2026</span>
                  <div className="story-q-due mono">Due June 15, 2026</div>
                </div>
                <span className="story-q-status">On track</span>
              </div>
              <div className="story-q-amount mono">
                $2,145<small>.00</small>
              </div>
              <p className="story-q-hint">Target payment based on YTD deductible profit</p>
              <div className="story-q-breakdown">
                <div className="story-bar-segment" style={{ width: "62%", background: "var(--c-excl)" }} title="Self-employment tax" />
                <div className="story-bar-segment" style={{ width: "38%", background: "var(--hl)" }} title="Federal income tax" />
              </div>
              <div className="story-pdf-preview">
                <Download size={14} aria-hidden="true" />
                <span>PDF summary ready for export</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="story-container">
      {/* Desktop Sticky Visual Panel */}
      <div className="story-sticky-pane" aria-hidden="true">
        <div className="story-stage">
          {renderVisual(activeStep)}
        </div>
      </div>

      {/* Steps List */}
      <div className="story-steps">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeStep === idx;
          return (
            <div
              key={step.title}
              ref={el => { stepRefs.current[idx] = el; }}
              className={`story-step-block ${isActive ? "active" : ""}`}
            >
              <div className="story-step-indicator">
                <span className="story-step-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>

              {/* Inline visual for mobile view */}
              <div className="story-mobile-visual">
                {renderVisual(idx)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
