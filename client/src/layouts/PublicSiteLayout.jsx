import { ArrowUpRight, WalletCards } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

const PublicSiteLayout = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-white/10 bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Link to="/" className="inline-flex items-center gap-3 font-bold text-slate-50" aria-label="FinTrack homepage">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-copper-400/30 bg-copper-600 text-white">
            <WalletCards aria-hidden="true" size={21} />
          </span>
          <span className="text-lg">FinTrack</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5" aria-label="Public navigation">
          <Link to="/privacy" className="hidden text-sm text-slate-300 transition hover:text-white sm:inline">Privacy</Link>
          <Link to="/terms" className="hidden text-sm text-slate-300 transition hover:text-white sm:inline">Terms</Link>
          <Link to="/login" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-copper-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-copper-400">
            Sign in <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </nav>
      </div>
    </header>

    <main id="main-content" className="min-h-[65vh]">
      <Outlet />
    </main>

    <footer className="border-t border-white/10 bg-slate-950/70">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-5 py-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:px-8">
        <p>© {new Date().getFullYear()} FinTrack. Personal finance, simplified.</p>
        <nav aria-label="Legal and account links" className="flex flex-wrap gap-x-5 gap-y-3">
          <Link className="transition hover:text-slate-50" to="/">Home</Link>
          <Link className="transition hover:text-slate-50" to="/privacy">Privacy Policy</Link>
          <Link className="transition hover:text-slate-50" to="/terms">Terms of Service</Link>
          <Link className="transition hover:text-slate-50" to="/login">Google Sign-In</Link>
        </nav>
      </div>
    </footer>
  </div>
);

export default PublicSiteLayout;
