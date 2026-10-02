import { ArrowDownToLine, ArrowUpFromLine, ExternalLink, TrendingDown, TrendingUp } from "lucide-react";

import Button from "../ui/Button";
import { formatCurrency } from "../../utils/formatters";
import { getQuotePresentation } from "../../utils/quotePresentation";

const InvestmentHoldingCard = ({ holding, onBuy, onSell, onDetails, exchangeStatus }) => {
  const positive = Number(holding.unrealizedPnl) >= 0;
  const QuoteIcon = positive ? TrendingUp : TrendingDown;
  const quoteInfo = getQuotePresentation(holding.quote, exchangeStatus, true);

  return (
    <article className="rounded-2xl border border-slate-200/85 bg-white/92 p-5 transition hover:-translate-y-0.5 hover:border-copper-300/70 dark:border-slate-700 dark:bg-slate-900/92 dark:hover:border-copper-700/70">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold text-slate-950 dark:text-white">
              {holding.instrument.tradingSymbol}
            </h3>
            <span className="rounded-full border border-steel-300/60 bg-steel-100 px-2 py-0.5 text-[11px] font-bold text-steel-700 dark:border-steel-700 dark:bg-steel-900 dark:text-steel-300">
              {holding.instrument.exchange}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
            {holding.instrument.shortName || holding.instrument.name}
          </p>
          <p className="mt-1 text-xs text-slate-400">{holding.account?.name}</p>
        </div>

        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${positive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
          <QuoteIcon size={20} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-400">Current value</p>
          <p className="mt-1 font-bold text-slate-950 dark:text-white">{formatCurrency(holding.marketValue, "INR")}</p>
        </div>
        <div>
          <p className="text-slate-400">Current price</p>
          <p className="mt-1 font-bold text-slate-950 dark:text-white">{formatCurrency(holding.currentPrice, "INR")}</p>
        </div>
        <div>
          <p className="text-slate-400">Quantity</p>
          <p className="mt-1 font-bold text-slate-950 dark:text-white">{Number(holding.quantity).toLocaleString("en-IN", { maximumFractionDigits: 6 })}</p>
        </div>
        <div>
          <p className="text-slate-400">Average cost</p>
          <p className="mt-1 font-bold text-slate-950 dark:text-white">{formatCurrency(holding.averageCost, "INR")}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400" aria-label="Holding market quote status">
        {quoteInfo.label}{quoteInfo.time ? ` · ${quoteInfo.time}` : " · Valued at cost until a quote is available"}
      </p>

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/65">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Unrealised P&L</span>
          <span className={`font-bold ${positive ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
            {holding.unrealizedPnl >= 0 ? "+" : ""}{formatCurrency(holding.unrealizedPnl, "INR")}
          </span>
        </div>
        {Number(holding.realizedPnl) !== 0 && (
          <div className="mt-1 flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-400">Realised P&L</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{formatCurrency(holding.realizedPnl, "INR")}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="px-3 py-2" onClick={() => onBuy(holding)}><ArrowDownToLine size={15} />Buy</Button>
        <Button className="px-3 py-2" variant="secondary" onClick={() => onSell(holding)}><ArrowUpFromLine size={15} />Sell</Button>
        <Button variant="secondary" className="px-3 py-2" onClick={() => onDetails(holding)}>Details <ExternalLink size={13}/></Button>
        <a
          href={holding.research?.tradingView}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-steel-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Research <ExternalLink size={13} />
        </a>
      </div>
    </article>
  );
};

export default InvestmentHoldingCard;
