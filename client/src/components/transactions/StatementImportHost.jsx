import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import StatementImportContext from "../../context/StatementImportContext";
import { getAccounts, getCategories } from "../../services/transactionService";
import StatementImportModal from "./StatementImportModal";
import { announceNotificationsChanged } from "../../utils/notificationEvents";

// This host lives in DashboardLayout, ABOVE AnimatedOutlet. Navigating between
// pages cannot tear down an import preview or orphan an in-flight COMMIT.
// ProtectedRoute unmounts it on logout / PIN lock to prevent cross-user display.
const StatementImportHost = ({ children }) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: getAccounts, enabled: open });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => getCategories(), enabled: open });
  const openStatementImport = useCallback(() => setOpen(true), []);
  const closeStatementImport = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openStatementImport }), [openStatementImport]);

  const onImported = useCallback(async () => {
    // Refresh every affected financial surface even if Transactions is not
    // the active route when the server finishes committing the import.
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] }),
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
    announceNotificationsChanged();
  }, [queryClient]);

  return (
    <StatementImportContext.Provider value={value}>
      {children}
      <StatementImportModal
        open={open}
        accounts={accounts.data || []}
        categories={categories.data || []}
        onClose={closeStatementImport}
        onImported={onImported}
      />
    </StatementImportContext.Provider>
  );
};

export default StatementImportHost;
