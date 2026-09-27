import { Outlet } from "react-router-dom";
import { BarChart3, ShieldCheck, WalletCards } from "lucide-react";

const AuthLayout = () => {
  return (
    <main className="min-h-screen bg-slate-950 text-white lg:grid lg:grid-cols-2">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/10 bg-slate-950 p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(181,111,70,0.22),transparent_30rem),radial-gradient(circle_at_88%_72%,rgba(94,137,147,0.18),transparent_32rem)]" />

        <div className="relative">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-copper-300/25 bg-gradient-to-br from-copper-400 to-copper-700 text-white shadow-lg shadow-black/10">
              <WalletCards size={23} />
            </div>

            <span className="text-xl font-bold">FinTrack</span>
          </div>

          <div className="mt-24 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-copper-300">
              Personal finance, simplified
            </p>

            <h1 className="mt-5 text-5xl font-bold leading-tight text-slate-50">
              Understand where your money goes.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Track balances, transactions, spending patterns, budgets and
              savings from one secure dashboard.
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-4">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <BarChart3 className="text-steel-300" />
            <h2 className="mt-4 font-semibold">Live financial insights</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Visualize spending and monthly cash flow.
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <ShieldCheck className="text-copper-300" />
            <h2 className="mt-4 font-semibold">Secure authentication</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Google identity verification backed by FinTrack server sessions.
            </p>
          </article>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10 text-slate-900">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-copper-500 text-white">
              <WalletCards size={21} />
            </div>
            <span className="text-xl font-bold">FinTrack</span>
          </div>

          <Outlet />
        </div>
      </section>
    </main>
  );
};

export default AuthLayout;
