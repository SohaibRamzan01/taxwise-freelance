"use client";
import { useState } from "react";
import type { TaxSummary } from "@/lib/reports/summary";
import { formatMoney } from "@/lib/money";
import { Disclaimer, ErrorBox, Loading, PageTitle, useResource } from "./common";
export function ReportsPage() {
  const [year, setYear] = useState("2026"); const [quarter, setQuarter] = useState("");
  const query = new URLSearchParams({ year, quarter });
  const url = `/api/reports/tax-summary?${query}`;
  const resource = useResource<{ data: TaxSummary }>(`${url}&format=json`); const summary = resource.data?.data;
  return <><PageTitle title="Reports" description="Review actual income and deductions, then download a tax-ready summary." />
    <div className="toolbar"><label className="filter-label">Tax year<select value={year} onChange={e => setYear(e.target.value)}><option value="2026">2026</option></select></label><label className="filter-label">Period<select value={quarter} onChange={e => setQuarter(e.target.value)}><option value="">Full year</option>{[1, 2, 3, 4].map(q => <option key={q} value={q}>Quarter {q}</option>)}</select></label>
    {summary && <div className="row-actions"><a className="button" href={url}>Download PDF</a><a className="button secondary" href={`${url}&format=csv`}>Download CSV</a></div>}</div>
    {resource.loading && <Loading />}{resource.error && <ErrorBox message={resource.error} retry={resource.refresh} />}
    {summary && <><p className="muted">{summary.period.from} to {summary.period.to} · Records through {summary.asOf}</p><div className="stats-grid">{[["Income", summary.incomeCents], ["Expenses", summary.expenseCents], ["Deductions", summary.deductionsCents], ["Net profit", summary.netProfitCents]].map(([label, amount]) => <div className="stat" key={label}><div className="stat-label">{label}</div><div className="stat-value">{formatMoney(Number(amount))}</div></div>)}</div>
    <p className="disclaimer tax-note">{summary.calculationNote}</p>
    <div className="panel table-wrap"><table><thead><tr><th>Category</th><th>Schedule C line</th><th>Entries</th><th>Expenses</th><th>Deductible</th></tr></thead><tbody>{summary.groups.map(group => <tr key={group.category}><td>{group.label}</td><td>{group.scheduleC}</td><td>{group.count}</td><td>{formatMoney(group.expenseCents)}</td><td>{formatMoney(group.deductibleCents)}</td></tr>)}</tbody></table></div>
    <section className="panel editor-section"><h2>Period tax calculation</h2><dl className="report-numbers">{[["SE tax", summary.estimate.se.totalCents], ["Half-SE deduction", summary.estimate.se.halfDeductionCents], ["Standard deduction", summary.estimate.standardDeductionCents], ["QBI deduction", summary.estimate.qbi.deductionCents], ["Taxable income", summary.estimate.federal.taxableIncomeCents], ["Federal income tax", summary.estimate.federal.totalCents], ["Total estimated federal tax", summary.estimate.totalTaxCents], ["Payments assigned to period", summary.paymentsCents]].map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{formatMoney(Number(amount))}</dd></div>)}</dl></section>
    <section className="panel editor-section"><h2>Tax-year payment plan</h2><p className="muted small">YTD actual earnings, no annualisation · {summary.schedule.method.replaceAll("_", " ")}</p><dl className="report-numbers"><div><dt>All tax-year payments</dt><dd>{formatMoney(summary.schedule.paidSoFarCents)}</dd></div><div><dt>Remaining payment target</dt><dd>{formatMoney(summary.schedule.remainingCents)}</dd></div><div><dt>Estimated tax balance</dt><dd>{formatMoney(summary.schedule.estimatedBalanceCents)}</dd></div></dl><div className="table-wrap"><table><thead><tr><th>Quarter</th><th>Due date</th><th>Target</th><th>Paid</th><th>Cumulative remaining</th></tr></thead><tbody>{summary.schedule.quarters.map(q => <tr key={q.quarter}><td>Q{q.quarter}</td><td>{q.dueDate}</td><td>{formatMoney(q.requiredCents)}</td><td>{formatMoney(q.paidCents)}</td><td>{formatMoney(q.remainingCents)}</td></tr>)}</tbody></table></div></section></>}
    <Disclaimer /><p className="muted small">Schedule C labels are planning mappings. Hardware may require capitalization or depreciation; review deduction treatment with a tax professional.</p>
  </>;
}
