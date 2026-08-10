import { Archive, Pencil } from "lucide-react";

import CategoryIcon from "../ui/CategoryIcon";

const CategoryCard = ({ category, onEdit, onArchive, archiving }) => {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <CategoryIcon icon={category.icon} color={category.color} size={20} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-bold text-slate-900 dark:text-white">
            {category.name}
          </h3>
          {category.isDefault && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Default
            </span>
          )}
        </div>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {category.type === "EXPENSE" ? "Expense" : "Income"}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(category)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label={`Edit ${category.name}`}
          title="Edit"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={() => onArchive(category)}
          disabled={archiving}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
          aria-label={`Archive ${category.name}`}
          title="Archive"
        >
          <Archive size={16} />
        </button>
      </div>
    </article>
  );
};

export default CategoryCard;
