import { ArrowRight, BarChart3, ChartNoAxesCombined, LockKeyhole, Repeat2, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    title: "Understand your cash flow",
    description: "Track accounts, income, expenses, transfers, budgets and savings goals in one personal workspace.",
    icon: BarChart3,
  },
  {
    title: "Follow your investments",
    description: "Record holdings and trades, explore NSE/BSE market data, and review portfolio performance.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Stay on top of recurring activity",
    description: "Keep scheduled payments, account history, and financial reports together.",
    icon: Repeat2,
  },
  {
    title: "Control your access",
    description: "Sign in with Google and optionally protect a trusted session using a six-digit PIN.",
    icon: LockKeyhole,
  },
];

const PublicHomePage = () => (
  <>
    <section className="relative overflow-hidden border-b border-white/10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,rgba(181,111,70,0.2),transparent_34rem),radial-gradient(circle_at_85%_45%,rgba(94,137,147,0.17),transparent_37rem)]" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-copper-300">Personal finance, simplified</p>
          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Understand where your <span className="text-copper-300">money goes.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            FinTrack is a personal finance dashboard for monitoring balances, spending, budgets, goals, investments, and recurring activity. Keep your own records organized and easier to understand.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link to="/login" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-copper-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-copper-400">
              Get started with Google <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link to="/privacy" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/35 hover:bg-white/5">How we handle data</Link>
          </div>
          <p className="mt-5 max-w-lg text-xs leading-6 text-slate-400">FinTrack is a personal recordkeeping and research tool, not a bank, brokerage, or automated trading service.</p>
        </div>
        <div className="rounded-[2rem] border border-steel-500/30 bg-slate-900/85 p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-copper-500/15 p-3 text-copper-300"><WalletCards aria-hidden="true" size={26} /></div>
            <div>
              <p className="text-sm font-bold text-slate-50">Your money, one clear view</p>
              <p className="mt-1 text-xs text-slate-400">A connected personal finance workspace</p>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {[
              ["Accounts & transactions", "Organize your balances and activity"],
              ["Budgets & savings", "Follow spending and goal progress"],
              ["Investment research", "Review holdings and market information"],
              ["Reports & insights", "Explore trends and summaries"],
            ].map(([name, detail]) => (
              <div key={name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-slate-100">{name}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-slate-400">Financial figures are entered and maintained by users; investment market data may be delayed or unavailable.</p>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20" aria-labelledby="features-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper-300">Explore FinTrack</p>
      <h2 id="features-heading" className="mt-3 text-3xl font-bold text-slate-50">Designed for everyday financial clarity</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {features.map(({ title, description, icon: Icon }) => (
          <article key={title} className="rounded-2xl border border-white/10 bg-slate-900/65 p-6">
            <Icon aria-hidden="true" className="text-copper-300" size={24} />
            <h3 className="mt-5 text-lg font-bold text-slate-100">{title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">{description}</p>
          </article>
        ))}
      </div>
    </section>
  </>
);

export default PublicHomePage;
