import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AnimatedOutlet from "../components/layout/AnimatedOutlet";
import Topbar from "../components/layout/Topbar";

const DashboardLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Topbar />

      <main className="relative overflow-x-clip px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8">
        <AnimatedOutlet />
      </main>

      <button
        type="button"
        onClick={() => navigate("/transactions")}
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-copper-300/45 bg-copper-500 text-white shadow-xl shadow-copper-950/20 transition duration-200 hover:-translate-y-1 hover:bg-copper-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-copper-300 lg:hidden dark:border-copper-300/20 dark:text-slate-950"
        aria-label="Add transaction"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default DashboardLayout;
