import { Outlet } from "react-router-dom";
import {
  BarChart3,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

const AuthLayout = () => {
  return (
    <main className="min-h-screen bg-slate-950 text-white lg:grid lg:grid-cols-2">
      <section className="hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/10 bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950 p-12 lg:flex">
        <div>
          <div className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
              <WalletCards size={23} />
            </div>

            <span className="text-xl font-bold">
              FinTrack
            </span>
          </div>

          <div className="mt-24 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Personal finance, simplified
            </p>

            <h1 className="mt-5 text-5xl font-bold leading-tight">
              Understand where your money goes.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Track balances, transactions, spending patterns,
              budgets and savings from one secure dashboard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <BarChart3 className="text-cyan-300" />

            <h2 className="mt-4 font-semibold">
              Live financial insights
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Visualize spending and monthly cash flow.
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <ShieldCheck className="text-emerald-300" />

            <h2 className="mt-4 font-semibold">
              Secure authentication
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Password protection with email OTP verification.
            </p>
          </article>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10 text-slate-900">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <WalletCards size={21} />
            </div>

            <span className="text-xl font-bold">
              FinTrack
            </span>
          </div>

          <Outlet />
        </div>
      </section>
    </main>
  );
};

export default AuthLayout;