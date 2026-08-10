import { FolderTree, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import CategoryCard from "../components/categories/CategoryCard";
import CategoryModal from "../components/categories/CategoryModal";
import EmptyState from "../components/ui/EmptyState";
import {
  archiveCategory,
  createCategory,
  getCategories,
  updateCategory,
} from "../services/categoryService";
import getApiError from "../utils/getApiError";

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archivingId, setArchivingId] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setCategories(await getCategories());
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesType = filter === "ALL" || category.type === filter;
      const matchesSearch = !term || category.name.toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [categories, filter, search]);

  const grouped = useMemo(
    () => ({
      EXPENSE: filteredCategories.filter((category) => category.type === "EXPENSE"),
      INCOME: filteredCategories.filter((category) => category.type === "INCOME"),
    }),
    [filteredCategories],
  );

  const counts = useMemo(
    () => ({
      ALL: categories.length,
      EXPENSE: categories.filter((category) => category.type === "EXPENSE").length,
      INCOME: categories.filter((category) => category.type === "INCOME").length,
      CUSTOM: categories.filter((category) => !category.isDefault).length,
    }),
    [categories],
  );

  const openCreate = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setEditingCategory(category);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      if (editingCategory) {
        const updated = await updateCategory({
          categoryId: editingCategory._id,
          payload,
        });
        setCategories((current) =>
          current.map((item) => (item._id === updated._id ? updated : item)),
        );
        toast.success("Category updated");
      } else {
        const created = await createCategory(payload);
        setCategories((current) => [...current, created]);
        toast.success("Category created");
      }
      setModalOpen(false);
      setEditingCategory(null);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (category) => {
    const accepted = window.confirm(
      `Archive “${category.name}”? Existing records will keep this category, but it will no longer appear when creating new records.`,
    );
    if (!accepted) return;

    try {
      setArchivingId(category._id);
      await archiveCategory(category._id);
      setCategories((current) =>
        current.filter((item) => item._id !== category._id),
      );
      toast.success("Category archived");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
            Organization
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Categories
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Manage the income and expense categories used across transactions,
            budgets, recurring payments and analytics.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
        >
          <Plus size={18} />
          Add category
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total categories", counts.ALL],
          ["Expense", counts.EXPENSE],
          ["Income", counts.INCOME],
          ["Custom", counts.CUSTOM],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {label}
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {[
            ["ALL", "All"],
            ["EXPENSE", "Expense"],
            ["INCOME", "Income"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${
                filter === value
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="relative block w-full sm:max-w-xs">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-3 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-emerald-500/10"
          />
        </label>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-[76px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories found"
          description={search ? "Try a different search term." : "Create your first custom category."}
          action={
            !search ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
              >
                <Plus size={17} />
                Add category
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-7">
          {(filter === "ALL" || filter === "EXPENSE") && grouped.EXPENSE.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Expense categories
                </h2>
                <span className="text-sm font-semibold text-slate-400">
                  {grouped.EXPENSE.length}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {grouped.EXPENSE.map((category) => (
                  <CategoryCard
                    key={category._id}
                    category={category}
                    onEdit={openEdit}
                    onArchive={handleArchive}
                    archiving={archivingId === category._id}
                  />
                ))}
              </div>
            </section>
          )}

          {(filter === "ALL" || filter === "INCOME") && grouped.INCOME.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Income categories
                </h2>
                <span className="text-sm font-semibold text-slate-400">
                  {grouped.INCOME.length}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {grouped.INCOME.map((category) => (
                  <CategoryCard
                    key={category._id}
                    category={category}
                    onEdit={openEdit}
                    onArchive={handleArchive}
                    archiving={archivingId === category._id}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <CategoryModal
        open={modalOpen}
        category={editingCategory}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default CategoriesPage;
