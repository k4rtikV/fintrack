import api from "../api/axios";

const getReportAnalytics = async ({ startDate, endDate }) => {
  const range = { startDate, endDate };

  const [overviewResponse, categoryResponse, expensesResponse, trendResponse] =
    await Promise.all([
      api.get("/analytics/overview", { params: range }),
      api.get("/analytics/category-breakdown", { params: range }),
      api.get("/analytics/top-expenses", {
        params: {
          ...range,
          limit: 10,
        },
      }),
      api.get("/analytics/monthly-trend", {
        params: range,
      }),
    ]);

  return {
    overview: overviewResponse.data.data.overview,
    categories: categoryResponse.data.data.categories,
    expenses: expensesResponse.data.data.expenses,
    trend: trendResponse.data.data.trend,
  };
};

// PDF downloads survive ordinary route unmounts, but never survive auth teardown.
// Re-entering Reports cannot spawn the same export twice.
const activeExports = new Map();
const exportListeners = new Set();
const exportSnapshot = () => [...activeExports.keys()].sort().join("|");
const subscribeReportExports = (listener) => {
  exportListeners.add(listener);
  return () => exportListeners.delete(listener);
};
const notifyExports = () => exportListeners.forEach((listener) => listener());
const getReportExportsSnapshot = () => exportSnapshot();
const cancelPendingReportDownloads = () => {
  for (const task of activeExports.values()) task.controller.abort();
  activeExports.clear();
  notifyExports();
};

const performMonthlyPdfDownload = async ({ month, signal }) => {
  try {
    const response = await api.get("/reports/monthly-pdf", {
      params: { month },
      responseType: "blob",
      timeout: 45000,
      signal,
    });
    if (signal.aborted) {
      const error = new Error("Monthly report download was canceled");
      error.code = "ERR_CANCELED";
      throw error;
    }
    const contentDisposition = response.headers["content-disposition"] || "";
    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    const filename =
      filenameMatch?.[1] || `FinTrack-Monthly-Report-${month}.pdf`;
    const url = window.URL.createObjectURL(response.data);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);

    return filename;
  } catch (error) {
    const payload = error.response?.data;

    if (payload instanceof Blob) {
      try {
        const text = await payload.text();
        const parsed = JSON.parse(text);
        const normalizedError = new Error(
          parsed.message || "Unable to generate the monthly PDF report.",
        );
        normalizedError.response = {
          ...error.response,
          data: parsed,
        };
        throw normalizedError;
      } catch (parseError) {
        if (parseError.response) {
          throw parseError;
        }
      }
    }

    throw error;
  }
};

const downloadMonthlyPdf = ({ month, userId }) => {
  const key = `${String(userId || "active-user")}:${month}`;
  if (activeExports.has(key)) return activeExports.get(key).promise;
  const controller = new AbortController();
  const promise = performMonthlyPdfDownload({ month, signal: controller.signal }).finally(() => {
    // A canceled task must not erase a later task with the same key.
    if (activeExports.get(key)?.controller === controller) {
      activeExports.delete(key);
      notifyExports();
    }
  });
  activeExports.set(key, { controller, promise });
  notifyExports();
  return promise;
};

export {
  cancelPendingReportDownloads, downloadMonthlyPdf, getReportAnalytics,
  getReportExportsSnapshot, subscribeReportExports,
};
