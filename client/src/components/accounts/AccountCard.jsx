import {
  Archive,
  Banknote,
  CreditCard,
  Landmark,
  Pencil,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { formatCurrency } from "../../utils/formatters";
import Button from "../ui/Button";

const iconMap = {
  BANK: Landmark,
  CASH: Banknote,
  CARD: CreditCard,
  WALLET: Wallet,
  INVESTMENT: TrendingUp,
};

const toneMap = {
  emerald: "from-emerald-500 to-teal-600",
  blue: "from-blue-500 to-cyan-600",
  violet: "from-violet-500 to-purple-600",
  amber: "from-amber-400 to-orange-500",
  rose: "from-rose-500 to-pink-600",
  slate: "from-slate-600 to-slate-800",
};

const AccountCard = ({ account, onArchive, onEdit }) => {
  const Icon = iconMap[account.type] || Wallet;
  const tone = toneMap[account.color] || toneMap.slate;

  return (
    <article
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tone} p-5 text-white shadow-lg`}
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-black/10" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Icon size={22} />
          </div>

          {account.isArchived && (
            <span className="rounded-full bg-slate-950/25 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              Archived
            </span>
          )}
        </div>

        <p className="mt-6 text-sm font-medium text-white/75">
          {account.type.replaceAll("_", " ")}
        </p>
        <h2 className="mt-1 truncate text-xl font-bold">{account.name}</h2>

        <p className="mt-6 text-2xl font-extrabold tracking-tight">
          {formatCurrency(account.balance, account.currency)}
        </p>
        <p className="mt-1 text-xs font-semibold text-white/70">
          Current balance · {account.currency}
        </p>

        {!account.isArchived && (
          <div className="mt-5 flex gap-2 border-t border-white/20 pt-4">
            <Button
              variant="secondary"
              className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              onClick={() => onEdit(account)}
            >
              <Pencil size={16} />
              Edit
            </Button>

            <button
              type="button"
              onClick={() => onArchive(account)}
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 text-white transition hover:bg-rose-500/40"
              aria-label={`Archive ${account.name}`}
            >
              <Archive size={17} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
};

export default AccountCard;
