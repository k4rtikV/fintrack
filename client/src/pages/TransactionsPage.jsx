import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import TransactionFilters from "../components/transactions/TransactionFilters";
import TransactionModal from "../components/transactions/TransactionModal";
import TransactionTable from "../components/transactions/TransactionTable";
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
  getTransactionsForExport,
  updateTransaction,
} from "../services/transactionService";
import exportTransactionsCsv from "../utils/exportTransactionsCsv";
import getApiError from "../utils/getApiError";
import { readTemplates, saveTemplate } from "../utils/transactionTemplates";

const initialFilters = {
  search: "",
  type: "",
  accountId: "",
  categoryId: "",
  startDate: "",
  endDate: "",
  sortBy: "transactionDate",
  sortOrder: "desc",
  page: 1,
  limit: 10,
};

const TransactionsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(initialFilters);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingId, setDeletingId] = useState("");
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [templates, setTemplates] = useState(() => readTemplates());

  const serverFilters = useMemo(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
    if (params.endDate) params.endDate = new Date(`${params.endDate}T23:59:59.999`).toISOString();
    if (params.startDate) params.startDate = new Date(`${params.startDate}T00:00:00.000`).toISOString();
    return params;
  }, [filters]);

  const transactionsQuery = useQuery({ queryKey: ["transactions", serverFilters], queryFn: () => getTransactions(serverFilters), placeholderData: (previousData) => previousData });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: getAccounts });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => getCategories() });

  const refreshFinanceData = async () => {
    setSelectedIds([]);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => selectedTransaction ? updateTransaction({ transactionId: selectedTransaction._id, payload }) : createTransaction(payload),
    onSuccess: async (response) => {
      toast.success(response.message);
      setIsModalOpen(false);
      setSelectedTransaction(null);
      setSelectedTemplate(null);
      await refreshFinanceData();
    },
    onError: (error) => toast.error(getApiError(error, "Unable to save transaction")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: async (response) => { toast.success(response.message); setDeletingId(""); await refreshFinanceData(); },
    onError: (error) => { toast.error(getApiError(error, "Unable to delete transaction")); setDeletingId(""); },
  });

  const transactions = transactionsQuery.data?.transactions || [];
  const accounts = accountsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const pagination = transactionsQuery.data?.pagination;

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("transaction-search")?.focus();
      }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "n" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        setSelectedTransaction(null);
        setSelectedTemplate(null);
        setIsModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const openCreateModal = (template = null) => { setSelectedTransaction(null); setSelectedTemplate(template); setIsModalOpen(true); };
  const openEditModal = (transaction) => { setSelectedTemplate(null); setSelectedTransaction(transaction); setIsModalOpen(true); };
  const duplicateTransaction = (transaction) => openCreateModal({
    type: transaction.type,
    title: transaction.title,
    amount: transaction.amount,
    accountId: transaction.account?._id,
    categoryId: transaction.category?._id,
    paymentMethod: transaction.paymentMethod,
    tags: transaction.tags,
    note: transaction.note,
  });

  const handleSaveTemplate = (transaction) => {
    const template = saveTemplate(transaction);
    setTemplates((current) => [template, ...current].slice(0, 12));
    toast.success("Transaction template saved");
  };

  const handleDelete = (transaction) => {
    if (!window.confirm(`Delete “${transaction.title}”? The related account balance will be restored.`)) return;
    setDeletingId(transaction._id);
    deleteMutation.mutate(transaction._id);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || !window.confirm(`Delete ${selectedIds.length} selected transactions? Account balances will be restored.`)) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteTransaction(id)));
      toast.success(`${selectedIds.length} transactions deleted`);
      await refreshFinanceData();
    } catch (error) {
      toast.error(getApiError(error, "Some transactions could not be deleted"));
      await refreshFinanceData();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportRows = await getTransactionsForExport(serverFilters);
      if (!exportRows.length) return toast.error("There are no matching transactions to export");
      exportTransactionsCsv({ transactions: exportRows, filename: `fintrack-transactions-${new Date().toISOString().slice(0, 10)}.csv` });
      toast.success(`${exportRows.length} transactions exported`);
    } catch (error) {
      toast.error(getApiError(error, "Unable to export transactions"));
    } finally {
      setIsExporting(false);
    }
  };

  const toggleSelection = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAll = () => setSelectedIds((current) => transactions.every((item) => current.includes(item._id)) ? current.filter((id) => !transactions.some((item) => item._id === id)) : [...new Set([...current, ...transactions.map((item) => item._id)])]);

  const isLoading = transactionsQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading;
  const queryError = transactionsQuery.error || accountsQuery.error || categoriesQuery.error;

  return (
    <PageContainer
      title="Transactions"
      description="Search, sort, reuse, export, and manage income and expenses. Press N to add or Ctrl/Cmd + K to search."
      action={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={handleExport} disabled={isExporting}><Download size={17} />{isExporting ? "Exporting..." : "Export CSV"}</Button><Button onClick={() => openCreateModal()}><Plus size={18} />Add transaction</Button></div>}
    >
      {templates.length > 0 && (
        <DashboardCard className="mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Quick templates</span>
            {templates.slice(0, 6).map((template) => <button key={template.id} type="button" onClick={() => openCreateModal(template)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-emerald-500/15">{template.name}</button>)}
          </div>
        </DashboardCard>
      )}

      <DashboardCard><TransactionFilters accounts={accounts} categories={categories} filters={filters} onChange={setFilters} onReset={() => setFilters(initialFilters)} /></DashboardCard>

      {selectedIds.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">{selectedIds.length} selected</p>
          <Button variant="secondary" onClick={handleBulkDelete} disabled={isBulkDeleting}><Trash2 size={16} />{isBulkDeleting ? "Deleting..." : "Delete selected"}</Button>
        </div>
      )}

      <DashboardCard className="mt-5 overflow-hidden p-0">
        {isLoading ? <div className="flex min-h-72 items-center justify-center"><Loader /></div> : queryError ? <div className="p-6"><EmptyState icon={ReceiptText} title="Unable to load transactions" description={getApiError(queryError, "Check your connection and try again.")} action={<Button onClick={() => transactionsQuery.refetch()}>Try again</Button>} /></div> : transactions.length === 0 ? <div className="p-6"><EmptyState icon={ReceiptText} title="No matching transactions" description="Add a transaction or adjust the current filters." action={<Button onClick={() => openCreateModal()}><Plus size={18} />Add transaction</Button>} /></div> : <TransactionTable currency={user?.preferredCurrency || "INR"} transactions={transactions} selectedIds={selectedIds} onToggle={toggleSelection} onToggleAll={toggleAll} onEdit={openEditModal} onDuplicate={duplicateTransaction} onSaveTemplate={handleSaveTemplate} onDelete={handleDelete} deletingId={deletingId} />}

        {pagination && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">Page {pagination.page} of {Math.max(pagination.pages, 1)} · {pagination.total} transactions</p>
            <div className="flex gap-2"><Button variant="secondary" disabled={pagination.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}><ChevronLeft size={17} />Previous</Button><Button variant="secondary" disabled={pagination.page >= pagination.pages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next<ChevronRight size={17} /></Button></div>
          </div>
        )}
      </DashboardCard>

      <TransactionModal accounts={accounts} categories={categories} isOpen={isModalOpen} isSaving={saveMutation.isPending} transaction={selectedTransaction} template={selectedTemplate} onClose={() => { if (!saveMutation.isPending) { setIsModalOpen(false); setSelectedTransaction(null); setSelectedTemplate(null); } }} onSubmit={(payload) => saveMutation.mutateAsync(payload)} />
    </PageContainer>
  );
};

export default TransactionsPage;
