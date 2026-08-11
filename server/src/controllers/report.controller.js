import { getMonthlyReportData } from "../services/monthlyReport.service.js";
import { renderMonthlyReportPdf } from "../services/monthlyPdf.service.js";
import { getMonthKeyInTimeZone } from "../utils/dateOnly.js";

const downloadMonthlyPdf = async (req, res) => {
  const month =
    req.validatedData.query.month ||
    getMonthKeyInTimeZone(new Date(), req.user.timezone);
  const reportData = await getMonthlyReportData({
    user: req.user,
    month,
  });
  const filename = `FinTrack-Monthly-Report-${month}.pdf`;

  res.status(200);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");

  renderMonthlyReportPdf({
    data: reportData,
    stream: res,
  });
};

export { downloadMonthlyPdf };
