import { Construction } from "lucide-react";
import { useLocation } from "react-router-dom";

import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Badge from "../components/ui/Badge";

const pageTitles = {
  "/transactions": "Transactions",
  "/accounts": "Accounts",
  "/categories": "Categories",
  "/budgets": "Budgets",
  "/goals": "Savings Goals",
  "/reports": "Reports",
  "/assistant": "AI Assistant",
  "/settings": "Settings",
};

const PlaceholderPage = () => {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || "FinTrack";

  return (
    <PageContainer
      title={title}
      description={`${title} is connected to the new FinTrack application shell and will be implemented in its planned phase.`}
    >
      <DashboardCard className="flex min-h-80 flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Construction size={26} />
        </div>

        <Badge tone="warning" className="mt-5">
          Coming in a later phase
        </Badge>

        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
          {title} module placeholder
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          Navigation, responsive layout, theme support, and route protection are
          ready. The complete module will reuse this application shell.
        </p>
      </DashboardCard>
    </PageContainer>
  );
};

export default PlaceholderPage;
