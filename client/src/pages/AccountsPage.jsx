import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Landmark,
  Plus,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import AccountCard from "../components/accounts/AccountCard";
import AccountDistributionChart from "../components/accounts/AccountDistributionChart";
import AccountModal from "../components/accounts/AccountModal";
import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Loader from "../components/ui/Loader";
import useAuth from "../hooks/useAuth";
import {
  archiveAccount,
  createAccount,
  getAccounts,
  updateAccount,
} from "../services/accountService";
import { formatCurrency } from "../utils/formatters";
import getApiError from "../utils/getApiError";

const AccountsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [includeArchived, setIncludeArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const accountsQuery = useQuery({
    queryKey: ["accounts", { includeArchived }],
    queryFn: () => getAccounts({ includeArchived }),
  });

  const refreshFinanceData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["recurring"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      selectedAccount
        ? updateAccount({
            accountId: selectedAccount._id,
            payload,
          })
        : createAccount(payload),
    onSuccess: async (response) => {
      toast.success(response.message);
      setIsModalOpen(false);
      setSelectedAccount(null);
      await refreshFinanceData();
    },
    onError: (error) => {
      toast.error(getApiError(error, "Unable to save account"));
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveAccount,
    onSuccess: async (response) => {
      toast.success(response.message);
      await refreshFinanceData();
    },
    onError: (error) => {
      toast.error(getApiError(error, "Unable to archive account"));
    },
  });

  const accounts = accountsQuery.data || [];
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const archivedAccounts = accounts.filter((account) => account.isArchived);
  const currency = user?.preferredCurrency || "INR";

  const totalBalance = useMemo(
    () =>
      activeAccounts
        .filter((account) => account.currency === currency)
        .reduce((sum, account) => sum + Number(account.balance || 0), 0),
    [activeAccounts, currency],
  );

  const openCreateModal = () => {
    setSelectedAccount(null);
    setIsModalOpen(true);
  };

  const openEditModal = (account) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const handleArchive = (account) => {
    const confirmed = window.confirm(
      `Archive “${account.name}”? It will no longer be available for new transactions. Active recurring schedules must be moved or paused first.`,
    );

    if (confirmed) {
      archiveMutation.mutate(account._id);
    }
  };

  return (
    <PageContainer
      title="Accounts"
      description="Manage bank accounts, cash, cards, wallets, and investments used by your transactions."
      action={
        <Button onClick={openCreateModal}>
          <Plus size={18} />
          Create account
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Landmark size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total balance
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {formatCurrency(totalBalance, currency)}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <WalletCards size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Active accounts
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {activeAccounts.length}
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Archive size={21} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Archived accounts
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-950 dark:text-white">
                {includeArchived ? archivedAccounts.length : "Hidden"}
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Your accounts
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Opening balances can be set during creation. Later changes come from transactions.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
            className="h-4 w-4 accent-emerald-500"
          />
          Show archived
        </label>
      </div>

      {accountsQuery.isLoading ? (
        <div className="mt-6 flex min-h-64 items-center justify-center">
          <Loader />
        </div>
      ) : accountsQuery.isError ? (
        <div className="mt-6">
          <EmptyState
            icon={RefreshCw}
            title="Unable to load accounts"
            description={getApiError(
              accountsQuery.error,
              "Check your connection and try again.",
            )}
            action={
              <Button onClick={() => accountsQuery.refetch()}>
                Try again
              </Button>
            }
          />
        </div>
      ) : accounts.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={WalletCards}
            title="No accounts yet"
            description="Create your first account before recording income or expenses."
            action={
              <Button onClick={openCreateModal}>
                <Plus size={18} />
                Create first account
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard
              key={account._id}
              account={account}
              onEdit={openEditModal}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AccountDistributionChart
          accounts={activeAccounts}
          currency={currency}
        />

        <DashboardCard>
          <h2 className="font-bold text-slate-900 dark:text-white">
            How account balances work
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <p>
              An income transaction increases the selected account balance,
              while an expense decreases it automatically.
            </p>
            <p>
              Editing or deleting a transaction reverses its old balance effect
              before applying the new one, keeping totals consistent.
            </p>
            <p>
              Archiving removes an account from new transaction forms without
              deleting its historical transactions.
            </p>
          </div>
        </DashboardCard>
      </div>

      <AccountModal
        account={selectedAccount}
        isOpen={isModalOpen}
        isSaving={saveMutation.isPending}
        onClose={() => {
          if (!saveMutation.isPending) {
            setIsModalOpen(false);
            setSelectedAccount(null);
          }
        }}
        onSubmit={(payload) => saveMutation.mutateAsync(payload)}
      />
    </PageContainer>
  );
};

export default AccountsPage;
