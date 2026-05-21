import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  FileText,
  LineChart,
  PackageCheck,
} from "lucide-react";
import { CorporateHeader } from "@/components/corporate/CorporateHeader";
import { CorporateFooter } from "@/components/corporate/CorporateFooter";

export const metadata = {
  title: "Reports — DealFindrs",
  description:
    "Every artifact DealFindrs produces for a deal — RAG assessment, QS, Valuation, Feasibility, Affordable Gap, and the lender-ready Finance Pack. All sourced from the same opportunity record, all numbers traceable to the assumption.",
};

const REPORTS = [
  {
    icon: BarChart3,
    name: "RAG Assessment",
    when: "First minute of a new opportunity",
    body:
      "Green / Amber / Red rating against your criteria. The AI explains exactly which de-risk factor failed, where the deal sits versus your minimum GM%, and the three things that would move an Amber to Green. Re-runs free as you change inputs.",
    sample_outputs: [
      "Headline RAG with one-line justification",
      "Criteria match table (your threshold vs deal actual)",
      "Action items ranked by impact",
    ],
  },
  {
    icon: Calculator,
    name: "QS Report",
    when: "Once design intent is firm enough to cost",
    body:
      "Quantity Surveyor report — the construction-cost baseline. Every downstream module reads its numbers from here, so the Valuation, Feasibility, Finance Pack, and Affordable Gap analyses stay internally consistent without re-keying.",
    sample_outputs: [
      "Total construction cost with confidence band",
      "Cost per m² benchmark vs comparable projects",
      "Contingency and prelims surfaced separately",
    ],
  },
  {
    icon: Building2,
    name: "Valuation Report",
    when: "After QS — required for the lender conversation",
    body:
      "Gross Realisation Value (GRV) and Pre-Realisation Saleable Value (PRSV) modelled off the QS Total Development Cost. Names the comparables, the absorption assumption, and the rate-of-sale curve, so the valuer who reviews it knows where every number came from.",
    sample_outputs: [
      "GRV and PRSV summary, with TDC reconciliation",
      "Comparable sales table",
      "Absorption rate and timing assumptions",
    ],
  },
  {
    icon: LineChart,
    name: "Feasibility Study",
    when: "Cash-flow model — required before any finance ask",
    body:
      "Monthly cash flow across the project timeline, sensitivity table on the variables that actually move the result (sale rate, IRR threshold, interest cost, build-cost variance). Outputs the IRR, ROC, and peak debt the lender will ask for in the first meeting.",
    sample_outputs: [
      "IRR / ROC / peak debt at the headline level",
      "Sensitivity to ±10% on cost, sale price, and rate",
      "Cash-flow chart over the project life",
    ],
  },
  {
    icon: FileText,
    name: "Affordable Gap Analysis",
    when: "Optional — for projects targeting government grant or social-housing co-investment",
    body:
      "Measures the gap between deliverable cost and the affordable rent / sale price the target cohort can actually pay. Surfaces the grant size, equity, or yield concession needed to bridge the gap. Built for projects pitching for HAFF, NHFIC, or state-government co-investment.",
    sample_outputs: [
      "Affordable-rent vs unit-economics gap (per unit and total)",
      "Grant / equity / yield bridge scenarios",
      "Lever sensitivity table",
    ],
  },
  {
    icon: PackageCheck,
    name: "Finance Pack",
    when: "Final — the export for the broker / lender meeting",
    body:
      "One bundle: RAG, QS, Valuation, Feasibility, Affordable Gap (if applicable), and a one-page Investment Memorandum on top. Numbered, branded, dated. Exported as PDF + spreadsheet workbook so the broker can plug the cash flow into their own model on the same call.",
    sample_outputs: [
      "PDF bundle (cover, IM, all modules, appendix)",
      "Cash-flow workbook (XLSX)",
      "Per-page audit trail back to the opportunity record",
    ],
  },
];

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <CorporateHeader
        productName="DealFindrs"
        productAcronym="DF"
        theme="dark"
        LinkComponent={Link}
        navItems={[
          { href: "/#features", label: "Features" },
          { href: "/reports", label: "Reports" },
          { href: "/#pricing", label: "Pricing" },
        ]}
        rightContent={
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-white hover:text-[#22c55e] transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-[#22c55e] text-white rounded-lg font-semibold hover:bg-[#4ade80] transition-all"
            >
              Start Free Trial
            </Link>
          </div>
        }
      />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full text-[#22c55e] text-sm mb-6">
          <FileText className="w-4 h-4" />
          What the platform produces
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
          Every report your broker, valuer, and lender actually want — generated from the same opportunity record.
        </h1>
        <p className="text-lg text-gray-400 leading-relaxed">
          What this page is: the six artifacts DealFindrs produces for a
          development deal, in the order they get used. What to do here: read
          which one matches the conversation you&apos;re about to have. Why it
          matters: every report below pulls its numbers from the upstream module
          — so when the QS cost changes, the Valuation, Feasibility, and Finance
          Pack update without rekeying. No spreadsheet drift, no &ldquo;which version
          of the model is current&rdquo; conversation.
        </p>
      </section>

      {/* Report cards */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="space-y-6">
          {REPORTS.map((r) => (
            <article
              key={r.name}
              className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 sm:p-8 hover:border-[#22c55e]/40 transition-colors"
            >
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center flex-shrink-0">
                  <r.icon className="w-6 h-6 text-[#22c55e]" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-white">{r.name}</h2>
                    <span className="text-xs uppercase tracking-wider text-[#22c55e]/80">
                      {r.when}
                    </span>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-4">{r.body}</p>
                  <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                      What you get
                    </p>
                    <ul className="space-y-1.5 text-sm text-gray-300">
                      {r.sample_outputs.map((line) => (
                        <li key={line} className="flex items-start gap-2">
                          <span className="text-[#22c55e] mt-0.5">→</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Dependency note */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-white mb-3">
            One record. Six artifacts. No spreadsheet drift.
          </h3>
          <p className="text-gray-400 leading-relaxed">
            Every report reads from the opportunity record, in dependency
            order: <strong className="text-gray-200">QS → Valuation → Feasibility → Affordable Gap → Finance Pack</strong>.
            Change a cost assumption upstream and the downstream modules
            invalidate, prompting a single re-run rather than a manual
            spreadsheet sweep. The audit trail on every page in the Finance
            Pack points back to the exact assumption that produced the number,
            so the lender can challenge an input without having to ask which
            model version it came from.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <h3 className="text-2xl font-bold text-white mb-3">
          See it run on a real deal
        </h3>
        <p className="text-gray-400 mb-6">
          Start a 14-day free trial — first opportunity assessed inside the
          first session.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#22c55e] text-white rounded-lg font-semibold hover:bg-[#4ade80] transition-all"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-600 text-white rounded-lg font-semibold hover:border-[#22c55e]/50 transition-all"
          >
            See pricing
          </Link>
        </div>
      </section>

      <CorporateFooter productName="DealFindrs" theme="dark" />
    </div>
  );
}
