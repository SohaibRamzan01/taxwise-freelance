"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel"><h1>We couldn’t load this page</h1><p className="muted">Please try again in a moment.</p><button className="button" onClick={reset}>Try again</button></section>;
}
