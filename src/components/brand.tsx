import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";

export function Brand() {
  return <Link href="/" className="brand" aria-label="TaxWise Freelance home"><span className="brand-mark"><ChartNoAxesCombined size={22} aria-hidden="true" /></span><span>TaxWise<small>Freelance</small></span></Link>;
}
