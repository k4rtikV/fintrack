import { Plus } from "lucide-react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      <Sidebar />

      <Sidebar
        mobile
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="lg:pl-72">
        <Topbar onMenuClick={() => setMobileOpen(true)} />

        <main className="p-4 pb-24 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <button
        type="button"
        onClick={() => navigate("/transactions")}
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:scale-105 hover:bg-emerald-300 lg:hidden"
        aria-label="Add transaction"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default DashboardLayout;
