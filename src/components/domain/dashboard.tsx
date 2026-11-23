"use client";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryColor } from "@/lib/category-colors";
import type { dashboard } from "@/lib/domain/summary";
import { formatMoney } from "@/lib/money";
import { taxPaymentLabels } from "@/lib/tax/labels";
import { Disclaimer, Empty, ErrorBox, Loading, PageTitle, Status, useResource } from "./common";
import { LedgerStrip, type LedgerCellItem } from "./ledger-strip";

type Data = Awaited<ReturnType<typeof dashboard>>;

const currentMonthStr = new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date());

function MonthTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const isCurrent = payload?.value === currentMonthStr;
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      {isCurrent && (
        <rect x={-16} y={4} width={32} height={18} rx={4} fill="var(--hl)" />
      )}
      <text
        x={0}
        y={17}
        textAnchor="middle"
        fill={isCurrent ? "var(--on-hl)" : "var(--ink-2)"}
        fontSize={11}
        fontWeight={isCurrent ? 700 : 400}
      >
        {payload?.value}
      </text>
    </g>
  );
}

function DeductionsRankedList({ deductions }: { deductions: Data["deductions"] }) {
  if (!deductions.length) {
    return <Empty title="Your deductions start here" message="Record a business expense to see its deductible amount." />;
  }

  const sorted = [...deductions].sort((a, b) => b.amountCents - a.amountCents);
  const maxAmount = sorted[0]?.amountCents || 1;
  const top6 = sorted.slice(0, 6);
  const rest = sorted.slice(6);

  const renderRow = (row: typeof deductions[number]) => {
    const pct = Math.max(2, Math.round((row.amountCents / maxAmount) * 100));
    const color = categoryColor(row.category);
    return (
      <div key={row.category} className="category-bar-row">
        <div className="category-bar-info">
          <i className="category-swatch" style={{ background: color }} aria-hidden="true" />
          <span className="category-name">{row.label}</span>
        </div>
        <div className="category-bar-track" aria-hidden="true">
          <div className="category-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <strong className="category-amount mono"><span className="money">{formatMoney(row.amountCents)}</span></strong>
      </div>
    );
  };

  return (
    <div className="category-ranked-container">
      <div className="category-bar-list" role="list" aria-label="Deductions by category ranked list">
        {top6.map(renderRow)}
      </div>
      {rest.length > 0 && (
        <details className="category-disclosure">
          <summary>Show all {sorted.length} categories</summary>
          <div className="category-bar-list" style={{ marginTop: 12 }}>
            {rest.map(renderRow)}
          </div>
        </details>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { data, loading, error, refresh } = useResource<{ data: Data }>("/api/dashboard");
  const d = data?.data;
  const taxLabels = d && taxPaymentLabels(d.year, d.paymentPlan.method, true);

  const kpiCells: LedgerCellItem[] = d ? [
    { label: "YTD income", amountCents: d.kpis.incomeCents, helperText: "Total earnings recorded this year" },
    { label: "YTD expenses", amountCents: d.kpis.expenseCents, helperText: "Gross business costs logged" },
    { label: "YTD deductions", amountCents: d.kpis.deductionsCents, helperText: "Allowable tax deduction value" },
    {
      label: taxLabels?.balance,
      amountCents: d.kpis.estimatedTaxOwedCents,
      helperText: taxLabels?.balanceHint,
      highlight: true,
    },
  ] : [];

  return (
    <>
      <PageTitle
        title="Your business at a glance"
        description="A little clarity for your next financial decision."
        action={<Link href="/invoices" className="button">Create an invoice</Link>}
      />
      {loading && <Loading />}
      {error && <ErrorBox message={error} retry={refresh} />}
      {d && (
        <>
          <div className="year-line">
            <span className="pill">Tax year {d.year}</span>
            <span className="muted small">Actual year to date · tax estimate annualised</span>
          </div>

          <LedgerStrip cells={kpiCells} />

          <div className="chart-grid">
            <section className="panel">
              <h2>Income & expenses</h2>
              <p className="muted small">Monthly cash flow · USD</p>
              <div className="chart-frame" aria-label="Monthly income and expense bar chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.monthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--rule)" strokeOpacity={0.7} />
                    <XAxis
                      dataKey="month"
                      tick={<MonthTick />}
                      tickLine={false}
                      axisLine={false}
                      height={32}
                    />
                    <YAxis
                      tick={{ fill: "var(--ink-2)" }}
                      width={65}
                      tickFormatter={v => `$${Number(v) / 100}`}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--rule)",
                        color: "var(--ink)",
                        borderRadius: 8,
                        boxShadow: "var(--shadow-paper)",
                      }}
                      labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
                      itemStyle={{ color: "var(--ink)" }}
                      cursor={{ fill: "var(--sunk)", opacity: 0.6 }}
                      formatter={v => formatMoney(Number(v))}
                    />
                    <Legend />
                    <Bar dataKey="incomeCents" name="Income" fill="var(--c-rev)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenseCents" name="Expenses" fill="var(--c-cogs)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel">
              <h2>Deductions by category</h2>
              <DeductionsRankedList deductions={d.deductions} />
            </section>
          </div>

          <div className="chart-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>Outstanding invoices</h2>
                <Link className="text-link" href="/invoices">View all</Link>
              </div>
              <p className="muted">
                <span className="money">{formatMoney(d.kpis.outstandingCents)}</span> awaiting payment
              </p>
              {d.outstandingInvoices.length ? (
                <div className="compact-list">
                  {d.outstandingInvoices.map(row => (
                    <Link key={row.id} href={`/invoices/${row.id}/print`}>
                      <div>
                        <strong className="mono">{row.number}</strong>
                        <small>{row.client.company || row.client.name} · due {String(row.dueDate).slice(0, 10)}</small>
                      </div>
                      <div>
                        <strong className="mono"><span className="money">{formatMoney(row.totalCents)}</span></strong>
                        <Status value={row.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted">All caught up. No outstanding invoices.</p>
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Tax deadlines</h2>
                <Link className="text-link" href="/tax-estimator">Plan payments</Link>
              </div>
              <p><span className="pill">{taxLabels?.method}</span></p>
              <dl className="report-numbers">
                <div>
                  <dt>Next due date</dt>
                  <dd>{d.paymentPlan.nextDueDate ?? "No future dates in this schedule"}</dd>
                </div>
                <div>
                  <dt>Amount due by that date</dt>
                  <dd><span className="money">{formatMoney(d.paymentPlan.nextDueCents)}</span></dd>
                </div>
              </dl>
              <div className="stat">
                <div className="stat-label">{taxLabels?.target}</div>
                <div className="stat-value"><span className="money">{formatMoney(d.paymentPlan.remainingCents)}</span></div>
                <p className="muted small">{taxLabels?.targetHint}</p>
              </div>
              <p className="muted small">
                Review the quarterly plan for any current past-due balance. Safe harbour uses prior-year tax for payments by the deadlines; final tax may be higher.
              </p>
            </section>
          </div>

          <details className="panel data-details">
            <summary>View monthly chart data</summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="numeric">Income</th>
                    <th className="numeric">Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {d.monthly.map(row => (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td className="numeric"><span className="money">{formatMoney(row.incomeCents)}</span></td>
                      <td className="numeric"><span className="money">{formatMoney(row.expenseCents)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <Disclaimer />
        </>
      )}
    </>
  );
}
