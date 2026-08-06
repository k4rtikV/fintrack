import { LogOut, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import useAuth from "../hooks/useAuth";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/login", {
      replace: true,
    });
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <WalletCards size={21} />
          </div>

          <div>
            <p className="font-bold">
              FinTrack
            </p>

            <p className="text-xs text-slate-500">
              Personal finance dashboard
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={17} />
          Log out
        </button>
      </header>

      <section className="mx-auto mt-8 max-w-6xl rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-emerald-600">
          Authentication complete
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Welcome, {user?.fullName}
        </h1>

        <p className="mt-3 text-slate-500">
          Your verified account is connected successfully.
          The full financial dashboard comes next.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl bg-slate-100 p-5">
            <p className="text-sm text-slate-500">
              Email
            </p>

            <p className="mt-2 font-semibold">
              {user?.email}
            </p>
          </article>

          <article className="rounded-2xl bg-slate-100 p-5">
            <p className="text-sm text-slate-500">
              Currency
            </p>

            <p className="mt-2 font-semibold">
              {user?.preferredCurrency}
            </p>
          </article>

          <article className="rounded-2xl bg-slate-100 p-5">
            <p className="text-sm text-slate-500">
              Email status
            </p>

            <p className="mt-2 font-semibold text-emerald-600">
              Verified
            </p>
          </article>
        </div>
      </section>
    </main>
  );
};

export default DashboardPage;