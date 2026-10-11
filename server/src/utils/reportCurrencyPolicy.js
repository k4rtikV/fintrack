import { getCurrencySafety } from "../services/assistantGuardrails.service.js";

// Monthly reports display active account snapshots but retain INR history
// on archived accounts. The chosen report currency is never an FX estimate.
const getReportCurrencySafety = ({ accounts, preferredCurrency = "INR" }) => {
  const active = (accounts || []).filter((account) => !account.isArchived);
  const safety = getCurrencySafety({ accounts: active, preferredCurrency });
  const mismatched = safety.activeCurrencies.some((currency) => currency !== preferredCurrency);
  return { ...safety, supported: safety.supported && !mismatched };
};

export { getReportCurrencySafety };
