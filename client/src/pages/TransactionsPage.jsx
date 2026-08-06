import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import TransactionFilters from "../components/transactions/TransactionFilters";
import TransactionModal from "../components/transactions/TransactionModal";
import TransactionTable from "../components/transactions/TransactionTable";
import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Loader from "../components/ui/Loader";
import useAuth from "../hooks/useAuth";
import {
  createTransaction,
  deleteTransaction,
  getAccounts,
  getCategories,
  getTransactions,
  updateTransaction,
} from "../services/transactionService";
import getApiError from "../utils/getApiError";

const initialFilters = {
  search: "",
  type: "",
  accountId: "",
  categoryId: "",
  startDate: "",
  endDate: "",
  page: 1,
  limit: 10,
};

const TransactionsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState(initialFilters);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState("");

  const serverFilters = useMemo(() => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(
        ([key, value]) => key !== "search" && value !== "",
      ),
    );

    if (params.endDate) {
      params.endDate = new Date(`${params.endDate}T23:59:59.999`).toISOString();
    }

    if (params.startDate) {
      params.startDate = new Date(`${params.startDate}T00:00:00.000`).toISOString();
    }

    return params;
  }, [filters]);

  const transactionsQuery = useQuery({
    queryKey: ["transactions", serverFilters],
    queryFn: () => getTransactions(serverFilters),
    placeholderData: (previousData) => previousData,
  });

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const refreshFinanceData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      selectedTransaction
        ? updateTransaction({
            transactionId: selectedTransaction._id,
            payload,
          })
        : createTransaction(payload),
    onSuccess: async (response) => {
      toast.success(response.message);
      setIsModalOpen(false);
      setSelectedTransaction(null);
      await refreshFinanceData();
    },
    onError: (error) => {
      toast.error(getApiError(error, "Unable to save transaction"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: async (response) => {
      toast.success(response.message);
      setDeletingId("");
      await refreshFinanceData();
    },
    onError: (error) => {
      toast.error(getApiError(error, "Unable to delete transaction"));
      setDeletingId("");
    },
  });

  const allTransactions = transactionsQuery.data?.transactions || [];
  const accounts = accountsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const pagination = transactionsQuery.data?.pagination;

  const visibleTransactions = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    if (!term) {
      return allTransactions;
    }

    return allTransactions.filter((transaction) => {
      const searchableText = [
        transaction.title,
        transaction.note,
        transaction.paymentMethod,
        ...(transaction.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [allTransactions, filters.search]);

  const openCreateModal = () => {
    setSelectedTransaction(null);
    setIsModalOpen(true);
  };

  const openEditModal = (transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = (transaction) => {
    const confirmed = window.confirm(
      `Delete “${transaction.title}”? The related account balance will be restored.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(transaction._id);
    deleteMutation.mutate(transaction._id);
  };

  const isLoading =
    transactionsQuery.isLoading ||
    accountsQuery.isLoading ||
    categoriesQuery.isLoading;

  const queryError =
    transactionsQuery.error || accountsQuery.error || categoriesQuery.error;

  return (
    <PageContainer
      title="Transactions"
      description="Add, review, filter, edit, and delete income and expenses."
      action={
        <Button onClick={openCreateModal}>
          <Plus size={18} />
          Add transaction
        </Button>
      }
    >
      <DashboardCard>
        <TransactionFilters
          accounts={accounts}
          categories={categories}
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(initialFilters)}
        />
      </DashboardCard>

      <DashboardCard className="mt-5 overflow-hidden p-0">
        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader />
          </div>
        ) : queryError ? (
          <div className="p-6">
            <EmptyState
              icon={ReceiptText}
              title="Unable to load transactions"
              description={getApiError(
                queryError,
                "Check your connection and try again.",
              )}
              action={
                <Button onClick={() => transactionsQuery.refetch()}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : visibleTransactions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={ReceiptText}
              title={
                allTransactions.length === 0
                  ? "No transactions yet"
                  : "No matching transactions"
              }
              description={
                allTransactions.length === 0
                  ? "Add your first income or expense to begin tracking your finances."
                  : "Adjust or reset the current filters."
              }
              action={
                allTransactions.length === 0 ? (
                  <Button onClick={openCreateModal}>
                    <Plus size={18} />
                    Add first transaction
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <TransactionTable
            currency={user?.preferredCurrency || "INR"}
            transactions={visibleTransactions}
            onEdit={openEditModal}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Page {pagination.page} of {pagination.pages} · {pagination.total} transactions
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page - 1,
                  }))
                }
              >
                <ChevronLeft size={17} />
                Previous
              </Button>

              <Button
                variant="secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
              >
                Next
                <ChevronRight size={17} />
              </Button>
            </div>
          </div>
        )}
      </DashboardCard>

      <TransactionModal
        accounts={accounts}
        categories={categories}
        isOpen={isModalOpen}
        isSaving={saveMutation.isPending}
        transaction={selectedTransaction}
        onClose={() => {
          if (!saveMutation.isPending) {
            setIsModalOpen(false);
            setSelectedTransaction(null);
          }
        }}
        onSubmit={(payload) => saveMutation.mutateAsync(payload)}
      />
    </PageContainer>
  );
};

export default TransactionsPage;
