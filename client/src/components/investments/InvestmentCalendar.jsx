import DashboardCard from "../layout/DashboardCard";
const asDate = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};
const InvestmentCalendar = ({ calendar, loading, error }) => {
  if (loading) return <DashboardCard><p className="py-20 text-center text-slate-400">Loading market calendar…</p></DashboardCard>;
  if (error || !calendar) return <DashboardCard><p className="py-16 text-center text-slate-400">Calendar is temporarily unavailable.</p></DashboardCard>;
  const events = (calendar.corporateActions || []).filter((item) => {
    const date = asDate(item.dateLabel);
    return date && date.getTime() >= Date.now() - 86400000;
  }).sort((a, b) => asDate(a.dateLabel) - asDate(b.dateLabel));
  return <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-2">
    <DashboardCard><h2 className="text-lg font-bold text-white">NSE/BSE market holidays</h2><p className="mt-1 text-xs text-slate-400">Upcoming exchange closures reported by Upstox. Special sessions can differ by exchange.</p>
      {calendar.marketHolidays?.length ? <div className="mt-4 space-y-2">{calendar.marketHolidays.map((holiday) => <div key={`${holiday.date}-${holiday.name}`} className="flex flex-wrap justify-between gap-2 rounded-xl border border-slate-700/60 p-3 text-sm"><span className="font-semibold text-white">{holiday.name}</span><span className="text-copper-300">{holiday.date} · {holiday.exchanges.join(" / ")}</span></div>)}</div> : <p className="py-12 text-center text-sm text-slate-400">No upcoming NSE/BSE holidays were returned.</p>}
    </DashboardCard>
    <DashboardCard><h2 className="text-lg font-bold text-white">Tracked corporate actions</h2><p className="mt-1 text-xs text-slate-400">Upcoming events for up to 10 different companies in your FinTrack holdings and watchlist.</p>
      {events.length ? <div className="mt-4 space-y-2">{events.map((event, index) => <div key={`${event.symbol}-${event.name}-${index}`} className="rounded-xl border border-slate-700/60 p-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold text-white">{event.symbol} · {event.name}</span><span className="text-copper-300">{event.dateLabel}</span></div><p className="mt-1 text-xs text-slate-400">{event.exchange}{event.ratio ? ` · ${event.ratio}` : ""}{event.amount != null ? ` · Amount ₹${event.amount}` : ""}</p></div>)}</div> : <p className="py-12 text-center text-sm text-slate-400">No upcoming corporate actions were returned for your tracked shares.</p>}
      {calendar.warning && <p className="mt-3 text-xs text-amber-300">{calendar.warning}</p>}
    </DashboardCard>
  </div>;
};
export default InvestmentCalendar;
