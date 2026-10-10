import { useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, RefreshCw, UploadCloud, X } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../ui/Button";
import { commitStatement, getImportHistory, prepareStatement, uploadStatement } from "../../services/statementImportService";
import { formatCurrency } from "../../utils/formatters";
import getApiError from "../../utils/getApiError";

const fieldClass = "w-full rounded-xl border border-slate-700 bg-steel-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-copper-400/50";
const firstMatch = (headers, terms, fallback) => {
  const hit = headers.findIndex((text) => terms.some((rx) => rx.test(text)));
  return hit >= 0 ? hit : fallback;
};
const suggestedMapping = (headers) => {
  const dateColumn = firstMatch(headers, [/date/i, /txn\s*dt/i], 0);
  const descriptionColumn = firstMatch(headers, [/narration/i, /description/i, /particular/i, /merchant/i, /remarks/i, /details/i], 1);
  const debitColumn = firstMatch(headers, [/debit/i, /withdrawal/i, /paid\s*out/i, /dr\s*amount/i], -1);
  const creditColumn = firstMatch(headers, [/credit/i, /deposit/i, /paid\s*in/i, /cr\s*amount/i], -1);
  const amountColumn = firstMatch(headers, [/amount/i, /value/i], Math.max(0, headers.length - 1));
  return {
    headerRow: 0,
    mode: debitColumn >= 0 && creditColumn >= 0 ? "DEBIT_CREDIT" : "SIGNED_AMOUNT",
    dateColumn, descriptionColumn,
    debitColumn: debitColumn < 0 ? Math.min(2, headers.length - 1) : debitColumn,
    creditColumn: creditColumn < 0 ? Math.min(3, headers.length - 1) : creditColumn,
    amountColumn,
    referenceColumn: firstMatch(headers, [/reference/i, /utr/i, /ref\s*no/i, /transaction\s*id/i], -1),
    dateOrder: "DMY",
  };
};

const StatementImportModal = ({ open, accounts, categories, onClose, onImported }) => {
  const [draft, setDraft] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [accountId, setAccountId] = useState("");
  const [incomeCategoryId, setIncomeCategoryId] = useState("");
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [selected, setSelected] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [completion, setCompletion] = useState(null);
  const aliveRef = useRef(false);
  const activeActionRef = useRef("");
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const availableAccounts = useMemo(() => accounts.filter((item) => !item.isArchived && item.currency === "INR" && item.type === "BANK"), [accounts]);
  const incomeCategories = useMemo(() => categories.filter((item) => item.type === "INCOME" && !item.isArchived), [categories]);
  const expenseCategories = useMemo(() => categories.filter((item) => item.type === "EXPENSE" && !item.isArchived), [categories]);
  const headers = draft?.headerCandidates?.[mapping?.headerRow || 0] || draft?.headers || [];
  const readyRows = analysis?.rows?.filter((row) => row.status === "READY") || [];
  const totalSelected = selected.length;

  useEffect(() => {
    if (!open) return undefined;
    const oldOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    let alive = true;
    getImportHistory().then((list) => { if (alive) setHistory(list); }).catch(() => {});
    return () => {
      alive = false;
      document.body.style.overflow = oldOverflow;
      if (previousFocus?.isConnected && typeof previousFocus.focus === "function") previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;
  const handleDialogKeyDown = (event) => {
    if (event.key === "Escape" && !activeActionRef.current) {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...(dialogRef.current?.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ) || [])].filter((item) => item.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };
  const setField = (field, value) => {
    setMapping((current) => ({ ...current, [field]: value }));
    setAnalysis(null);
    setSelected([]);
    setConfirmed(false);
    setCompletion(null);
  };
  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || activeActionRef.current) return;
    activeActionRef.current = "upload";
    setError(""); setBusy("upload"); setCompletion(null);
    try {
      const response = await uploadStatement(file);
      if (!aliveRef.current) return;
      setDraft(response);
      setMapping(suggestedMapping(response.headers));
      setAccountId(availableAccounts[0]?._id || "");
      setIncomeCategoryId(incomeCategories[0]?._id || "");
      setExpenseCategoryId(expenseCategories[0]?._id || "");
      setAnalysis(null); setSelected([]); setConfirmed(false);
    } catch (err) { if (aliveRef.current) setError(getApiError(err, err.message || "Unable to read statement")); }
    finally { activeActionRef.current = ""; if (aliveRef.current) setBusy(""); }
  };
  const handlePrepare = async () => {
    if (!draft || !mapping || !accountId || activeActionRef.current) return;
    activeActionRef.current = "prepare";
    setError(""); setBusy("prepare"); setConfirmed(false);
    try {
      const response = await prepareStatement({
        draftId: draft.draftId,
        accountId,
        mapping,
        categories: { incomeCategoryId: incomeCategoryId || undefined, expenseCategoryId: expenseCategoryId || undefined },
      });
      if (!aliveRef.current) return;
      setAnalysis(response);
      setSelected(response.rows.filter((row) => row.status === "READY").map((row) => row.rowIndex));
    } catch (err) { if (aliveRef.current) { setError(getApiError(err, "Unable to preview statement mapping")); setAnalysis(null); } }
    finally { activeActionRef.current = ""; if (aliveRef.current) setBusy(""); }
  };
  const handleCommit = async () => {
    if (!analysis || !confirmed || !selected.length || busy || activeActionRef.current) return;
    activeActionRef.current = "commit";
    setError(""); setBusy("commit");
    try {
      const response = await commitStatement({
        draftId: analysis.draftId,
        preparedToken: analysis.preparedToken,
        selectedRows: selected,
      });
      // A PIN lock/logout unmounts the protected shell. The server may have
      // finished the atomic commit, but no old-user result should be shown.
      if (!aliveRef.current) return;
      setCompletion(response.data);
      setAnalysis(null); setDraft(null); setSelected([]); setConfirmed(false);
      // The financial operation is now committed. Secondary history/cache
      // refreshes must not keep the UI pretending it is still committing.
      setBusy("");
      activeActionRef.current = "";
      toast.success(response.message);
      void getImportHistory().then((items) => {
        if (aliveRef.current) setHistory(items);
      }).catch(() => {});
      void Promise.resolve().then(() => onImported?.()).catch(() => {
        // Stale read caches are retryable; never misreport a committed write.
      });
    } catch (err) {
      if (aliveRef.current) setError(getApiError(err,
        "Import response unavailable. Check recent import history before retrying: the server may already have committed this batch."));
    } finally { activeActionRef.current = ""; if (aliveRef.current) setBusy(""); }
  };
  const options = (includeNone = false) => <>
    {includeNone && <option value={-1}>Not present</option>}
    {headers.map((text, i) => <option key={i} value={i}>{String.fromCharCode(65 + Math.min(25, i))} · {text || `Column ${i + 1}`}</option>)}
  </>;
  const mappingField = (label, key, includeNone = false) => <label className="block text-xs font-medium text-slate-300">{label}
    <select className={`${fieldClass} mt-1`} disabled={Boolean(busy)} value={mapping?.[key] ?? -1} onChange={(event) => setField(key, Number(event.target.value))}>{options(includeNone)}</select>
  </label>;
  const errorPanel = error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null;
  return <div ref={dialogRef} onKeyDown={handleDialogKeyDown} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/75 px-3 py-6 sm:items-center" role="dialog" aria-modal="true" aria-label="Import bank statement">
    <div className="w-full max-w-5xl rounded-3xl border border-steel-600 bg-steel-900 p-4 text-slate-100 shadow-2xl sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><h2 className="flex items-center gap-2 text-xl font-bold"><FileSpreadsheet size={21} className="text-copper-300"/>Statement Import</h2>
          <p className="mt-1 text-sm text-slate-400">Review a CSV/XLSX bank statement, map columns, and approve each import. Nothing is recorded during preview.</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} disabled={Boolean(busy)} aria-label="Close statement import" className="rounded-lg p-2 text-slate-300 hover:bg-steel-700 disabled:opacity-40"><X size={20}/></button>
      </div>
      {errorPanel}
      {busy === "commit" && <p role="status" className="mb-3 rounded-lg bg-copper-500/10 px-3 py-2 text-xs text-copper-200">Your import is being committed. You can navigate between pages without interrupting it; do not reload or sign out until the result is confirmed.</p>}
      {!draft && !completion && <div className="mt-4 rounded-2xl border border-dashed border-steel-600 p-5 text-center">
        <p className="mb-3 text-sm text-slate-300">Select a bank CSV or XLSX · maximum 3 MB · up to 500 transactions per batch</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-copper-500 px-4 py-2.5 text-sm font-semibold text-steel-950">
          <UploadCloud size={18}/>{busy === "upload" ? "Reading statement…" : "Choose statement file"}
          <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" disabled={Boolean(busy)} onChange={handleUpload}/>
        </label>
        <p className="mt-3 text-xs text-slate-500">Data is stored temporarily on your FinTrack server for review. Macros and formulas are never executed.</p>
      </div>}
      {draft && mapping && <div className="mt-4 space-y-4">
        <p className="text-sm text-copper-300">{draft.filename} · {draft.rowCount} rows after first header · preview expires in 24 hours</p>
        {availableAccounts.length === 0 && <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-300">Create an INR bank account on the Accounts page before importing.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-medium text-slate-300">Import into INR bank account
            <select className={`${fieldClass} mt-1`} disabled={Boolean(busy)} value={accountId} onChange={(e) => {setAccountId(e.target.value);setAnalysis(null);setConfirmed(false);}}>
              <option value="">Select account</option>{availableAccounts.map((a) => <option key={a._id} value={a._id}>{a.name} · INR</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-300">Income category
            <select className={`${fieldClass} mt-1`} disabled={Boolean(busy)} value={incomeCategoryId} onChange={(e) => {setIncomeCategoryId(e.target.value);setAnalysis(null);setConfirmed(false);}}>
              <option value="">No income in file</option>{incomeCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-300">Expense category
            <select className={`${fieldClass} mt-1`} disabled={Boolean(busy)} value={expenseCategoryId} onChange={(e) => {setExpenseCategoryId(e.target.value);setAnalysis(null);setConfirmed(false);}}>
              <option value="">No expenses in file</option>{expenseCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-300">Header row
            <select className={`${fieldClass} mt-1`} disabled={Boolean(busy)} value={mapping.headerRow} onChange={(e) => {const headerRow = Number(e.target.value);setMapping({...suggestedMapping(draft.headerCandidates?.[headerRow] || []),headerRow});setAnalysis(null);setConfirmed(false);}}>
              {(draft.headerCandidates || [draft.headers]).map((row, i) => <option key={i} value={i}>Row {i+1} · {row.slice(0,2).join(" / ").slice(0,42)}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-medium text-slate-300">Statement amount layout
            <select className={`${fieldClass} mt-1`} disabled={Boolean(busy)} value={mapping.mode} onChange={(e) => setField("mode", e.target.value)}>
              <option value="DEBIT_CREDIT">Separate debit / credit columns</option>
              <option value="SIGNED_AMOUNT">Single signed amount (+in / −out)</option>
            </select>
          </label>
          {mappingField("Date column", "dateColumn")}
          {mappingField("Description column", "descriptionColumn")}
          {mapping.mode === "SIGNED_AMOUNT" ? mappingField("Signed amount column", "amountColumn") : mappingField("Debit / withdrawal column", "debitColumn")}
          {mapping.mode === "DEBIT_CREDIT" && mappingField("Credit / deposit column", "creditColumn")}
          {mappingField("Reference / UTR (optional)", "referenceColumn", true)}
          <label className="block text-xs font-medium text-slate-300">Date format (for ambiguous dates)
            <select className={`${fieldClass} mt-1`} disabled={Boolean(busy)} value={mapping.dateOrder} onChange={(e) => setField("dateOrder", e.target.value)}><option value="DMY">DD/MM/YYYY (India)</option><option value="MDY">MM/DD/YYYY</option></select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handlePrepare} disabled={Boolean(busy) || !accountId}><RefreshCw size={16}/>{busy === "prepare" ? "Checking…" : "Preview & check duplicates"}</Button>
          <p className="text-xs text-slate-400">Separate debit/credit columns require nonnegative amounts (matching DR/CR labels are accepted). Use signed amount mode for negative values. Transfers and investment trades must be recorded separately.</p>
        </div>
      </div>}
      {analysis && <div className="mt-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm"><strong className="text-copper-300">{analysis.readyCount} ready</strong><span>{analysis.duplicateCount} already imported</span><span className="text-amber-300">{analysis.invalidCount} invalid</span><span>{totalSelected} selected</span></div>
        {analysis.rows.some((row) => row.status !== "INVALID" && !row.reference) && (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
            Some statement rows have no bank reference/UTR. Identical dated amounts and descriptions across partial statements may be flagged as duplicates; compare your account history before treating those rows as definitely imported.
          </p>
        )}
        <div className="max-h-72 overflow-auto overscroll-contain rounded-xl border border-steel-700" tabIndex={0} aria-label="Statement import row review">
          <table className="w-full min-w-[660px] text-left text-xs">
            <thead className="sticky top-0 bg-steel-800"><tr><th className="p-2">Include</th><th className="p-2">Date</th><th className="p-2">Description</th><th className="p-2">Type</th><th className="p-2 text-right">Amount</th><th className="p-2">Status</th></tr></thead>
            <tbody>{analysis.rows.map((row) => <tr key={row.rowIndex} className="border-t border-steel-700/70">
              <td className="p-2"><input type="checkbox" aria-label={`Include row ${row.rowIndex+1}`} disabled={row.status !== "READY"} checked={selected.includes(row.rowIndex)} onChange={(e) => {setSelected((cur) => e.target.checked ? [...cur,row.rowIndex] : cur.filter((id) => id !== row.rowIndex));setConfirmed(false);}}/></td>
              <td className="whitespace-nowrap p-2">{row.date || "—"}</td><td className="max-w-56 truncate p-2" title={row.title}>{row.title || "—"}</td><td className="p-2">{row.type || "—"}</td><td className="whitespace-nowrap p-2 text-right">{row.amount != null ? formatCurrency(row.amount,"INR") : "—"}</td>
              <td className={`p-2 ${row.status === "INVALID" ? "text-amber-300" : row.status === "DUPLICATE" ? "text-slate-500" : "text-emerald-300"}`} title={row.error || ""}>{row.error || row.status}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <button type="button" className="text-copper-300 underline" onClick={() => {setSelected(readyRows.map((r) => r.rowIndex));setConfirmed(false);}}>Select all ready</button>
          <button type="button" className="text-slate-300 underline" onClick={() => {setSelected([]);setConfirmed(false);}}>Clear selection</button>
        </div>
        <label className="flex items-start gap-2 rounded-lg border border-steel-700 p-3 text-sm text-slate-300"><input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}/>I have reviewed the selected rows and understand that importing adjusts the selected account balance. Duplicates and invalid rows are not selected.</label>
        <div className="flex justify-end"><Button disabled={Boolean(busy) || !confirmed || !selected.length} onClick={handleCommit}>{busy === "commit" ? "Committing atomically…" : `Import ${totalSelected} transactions`}</Button></div>
      </div>}
      {completion && <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm">
        <p className="font-semibold text-emerald-300">{completion.alreadyCommitted ? "Already imported" : "Statement imported successfully"}</p>
        <p className="mt-2">{completion.batch.importedCount} added · {completion.batch.duplicateCount} duplicates skipped</p>
        <p>Income: {formatCurrency(completion.batch.totalIncome,"INR")} · Expenses: {formatCurrency(completion.batch.totalExpense,"INR")}</p>
        <Button variant="secondary" className="mt-3" onClick={() => {setCompletion(null);setDraft(null);setMapping(null);}}>Import another</Button>
      </div>}
      {!draft && history.length > 0 && <div className="mt-6"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent statement imports</p>
        <div className="max-h-32 space-y-1 overflow-y-auto overscroll-contain text-xs text-slate-300">{history.slice(0,8).map((item) => <p key={item._id}>{new Date(item.createdAt).toLocaleDateString("en-IN")} · {item.filename} · {item.account?.name || "Account"} · {item.importedCount} added</p>)}</div>
      </div>}
    </div>
  </div>;
};
export default StatementImportModal;
