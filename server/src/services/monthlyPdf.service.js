import PDFDocument from "pdfkit";

const COLORS = {
  ink: "#0f172a",
  muted: "#64748b",
  subtle: "#94a3b8",
  line: "#e2e8f0",
  surface: "#f8fafc",
  emerald: "#10b981",
  emeraldSoft: "#ecfdf5",
  cyan: "#06b6d4",
  cyanSoft: "#ecfeff",
  amber: "#f59e0b",
  amberSoft: "#fffbeb",
  rose: "#f43f5e",
  roseSoft: "#fff1f2",
  violet: "#8b5cf6",
};

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 42,
  footerHeight: 28,
};

const formatNumber = (value, digits = 0) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatMoney = (value, currency = "INR") => {
  const numeric = Number(value) || 0;
  const negative = numeric < 0;
  const absolute = Math.abs(numeric);
  const digits = Number.isInteger(absolute) ? 0 : 2;

  return `${negative ? "-" : ""}${currency} ${formatNumber(absolute, digits)}`;
};

const formatPercent = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "-";
  }

  return `${Number(value).toFixed(1)}%`;
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const raw = value instanceof Date ? value.toISOString() : String(value);
  const dateKey = raw.slice(0, 10);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
    ? new Date(`${dateKey}T00:00:00.000Z`)
    : new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const humanizeForecastMethod = (method) => {
  const known = {
    ANOMALY_ADJUSTED_NON_RECURRING_FORECAST_PLUS_EXACT_RECURRING:
      "Anomaly-adjusted forecast",
    NON_RECURRING_HISTORY_OR_PACE_PLUS_EXACT_RECURRING:
      "History/pace + recurring",
    ANOMALY_ADJUSTED_REMAINING_MONTH_FORECAST_WITH_RECURRING_FLOOR:
      "Anomaly-adjusted forecast",
    REMAINING_MONTH_HISTORY_OR_PACE_WITH_RECURRING_FLOOR:
      "History/pace forecast",
  };

  if (!method) {
    return "Directional forecast";
  }

  return (
    known[method] ||
    String(method)
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const normalizeText = (value) =>
  String(value ?? "")
    .replace(/₹/g, "INR ")
    .replace(/[–—]/g, "-")
    .replace(/•/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

class MonthlyReportPdf {
  constructor(data, stream) {
    this.data = data;
    this.currency = data.user.preferredCurrency || "INR";
    this.doc = new PDFDocument({
      size: "A4",
      margins: {
        top: PAGE.margin,
        bottom: PAGE.margin + PAGE.footerHeight,
        left: PAGE.margin,
        right: PAGE.margin,
      },
      bufferPages: true,
      autoFirstPage: false,
      info: {
        Title: `FinTrack Monthly Financial Report - ${data.report.monthLabel}`,
        Author: "FinTrack",
        Subject: "Monthly personal finance report",
        Keywords: "FinTrack, finance, monthly report, spending, savings",
        CreationDate: new Date(data.report.generatedAt),
      },
    });
    this.doc.pipe(stream);
    this.y = PAGE.margin;
  }

  contentWidth() {
    return this.doc.page.width - PAGE.margin * 2;
  }

  bottom() {
    return this.doc.page.height - PAGE.margin - PAGE.footerHeight;
  }

  addPage(title = null) {
    this.doc.addPage();
    this.y = PAGE.margin;
    this.drawPageBrand();

    if (title) {
      this.sectionTitle(title, { firstOnPage: true });
    }
  }

  ensureSpace(height, title = null) {
    if (this.y + height > this.bottom()) {
      this.addPage(title);
      return true;
    }

    return false;
  }

  prepareSection(minHeight = 120) {
    if (this.y + minHeight > this.bottom()) {
      this.addPage();
    }
  }

  drawPageBrand() {
    const { doc } = this;
    const x = PAGE.margin;
    const top = 22;

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(COLORS.emerald)
      .text("FINTRACK", x, top, { width: 120 });

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.subtle)
      .text(this.data.report.monthLabel, doc.page.width - PAGE.margin - 150, top, {
        width: 150,
        align: "right",
      });
  }

  renderCoverHeader() {
    const { doc, data } = this;
    const width = this.contentWidth();

    doc.roundedRect(PAGE.margin, this.y, width, 136, 18).fill(COLORS.ink);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLORS.emerald)
      .text("FINTRACK", PAGE.margin + 22, this.y + 20);

    doc
      .font("Helvetica-Bold")
      .fontSize(25)
      .fillColor("#ffffff")
      .text("Monthly Financial Report", PAGE.margin + 22, this.y + 42, {
        width: width - 44,
      });

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#cbd5e1")
      .text(
        `${data.report.monthLabel}${data.report.isCurrentMonth ? ` - through ${formatDate(data.report.period.endDate)}` : ""}`,
        PAGE.margin + 22,
        this.y + 78,
      );

    doc
      .fontSize(8.5)
      .fillColor("#94a3b8")
      .text(
        `${normalizeText(data.user.fullName)}  |  ${normalizeText(data.user.email)}`,
        PAGE.margin + 22,
        this.y + 103,
        { width: width - 44 },
      );

    this.y += 154;
  }

  sectionTitle(title, { firstOnPage = false, subtitle = null } = {}) {
    if (!firstOnPage) {
      this.ensureSpace(subtitle ? 54 : 38);
    }

    const { doc } = this;

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(COLORS.ink)
      .text(normalizeText(title), PAGE.margin, this.y, {
        width: this.contentWidth(),
      });

    this.y += 21;

    if (subtitle) {
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLORS.muted)
        .text(normalizeText(subtitle), PAGE.margin, this.y, {
          width: this.contentWidth(),
          lineGap: 2,
        });
      this.y += 25;
    }

    doc
      .moveTo(PAGE.margin, this.y)
      .lineTo(PAGE.margin + this.contentWidth(), this.y)
      .lineWidth(0.7)
      .strokeColor(COLORS.line)
      .stroke();

    this.y += 13;
  }

  statCards(items) {
    this.ensureSpace(90);
    const { doc } = this;
    const gap = 10;
    const width = (this.contentWidth() - gap * 3) / 4;
    const height = 76;

    items.forEach((item, index) => {
      const x = PAGE.margin + index * (width + gap);
      const tone = item.tone || "neutral";
      const bg =
        tone === "positive"
          ? COLORS.emeraldSoft
          : tone === "warning"
            ? COLORS.amberSoft
            : tone === "negative"
              ? COLORS.roseSoft
              : COLORS.surface;
      const border =
        tone === "positive"
          ? "#a7f3d0"
          : tone === "warning"
            ? "#fde68a"
            : tone === "negative"
              ? "#fecdd3"
              : COLORS.line;

      doc.roundedRect(x, this.y, width, height, 10).fillAndStroke(bg, border);
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(COLORS.muted)
        .text(normalizeText(item.label).toUpperCase(), x + 11, this.y + 11, {
          width: width - 22,
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(COLORS.ink)
        .text(normalizeText(item.value), x + 11, this.y + 30, {
          width: width - 22,
        });
      doc
        .font("Helvetica")
        .fontSize(6.8)
        .fillColor(COLORS.muted)
        .text(normalizeText(item.note || ""), x + 11, this.y + 52, {
          width: width - 22,
          height: 17,
        });
    });

    this.y += height + 17;
  }

  comparisonCallout() {
    const { data, doc } = this;
    const expense = data.comparison.overview.expense;
    let text;

    if (!expense.comparablePercent && expense.previous === 0) {
      text = `Previous comparable expenses were zero. Current expenses are ${formatMoney(expense.current, this.currency)}, so a percentage increase is intentionally not shown.`;
    } else {
      const direction = expense.absoluteChange >= 0 ? "higher" : "lower";
      text = `Expenses are ${formatPercent(Math.abs(expense.percentChange))} ${direction} than the comparable previous-month period (${formatMoney(Math.abs(expense.absoluteChange), this.currency)} absolute change).`;
    }

    this.ensureSpace(55);
    doc
      .roundedRect(PAGE.margin, this.y, this.contentWidth(), 43, 10)
      .fillAndStroke(COLORS.cyanSoft, "#a5f3fc");
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#0e7490")
      .text("MONTH-OVER-MONTH", PAGE.margin + 12, this.y + 9);
    doc
      .font("Helvetica")
      .fontSize(8.3)
      .fillColor(COLORS.ink)
      .text(normalizeText(text), PAGE.margin + 12, this.y + 22, {
        width: this.contentWidth() - 24,
      });
    this.y += 57;
  }

  cashFlowChart() {
    const data = this.data.trend || [];
    if (!data.length) return;

    this.prepareSection(215);
    this.sectionTitle("Six-month cash-flow trend", {
      subtitle: "Income and expenses recorded in FinTrack. Empty months remain visible instead of being omitted.",
    });

    this.ensureSpace(190);
    const { doc } = this;
    const x = PAGE.margin + 14;
    const chartY = this.y + 8;
    const width = this.contentWidth() - 28;
    const height = 145;
    const maxValue = Math.max(
      1,
      ...data.flatMap((item) => [Number(item.income) || 0, Number(item.expense) || 0]),
    );
    const baseY = chartY + height - 24;
    const plotHeight = height - 42;
    const groupWidth = width / data.length;
    const barWidth = Math.min(16, groupWidth * 0.27);

    doc
      .roundedRect(PAGE.margin, this.y, this.contentWidth(), height, 12)
      .fillAndStroke("#ffffff", COLORS.line);

    [0, 0.5, 1].forEach((ratio) => {
      const y = baseY - plotHeight * ratio;
      doc
        .moveTo(x, y)
        .lineTo(x + width, y)
        .lineWidth(0.4)
        .strokeColor("#e5e7eb")
        .stroke();
    });

    data.forEach((item, index) => {
      const center = x + index * groupWidth + groupWidth / 2;
      const incomeHeight = (Number(item.income || 0) / maxValue) * plotHeight;
      const expenseHeight = (Number(item.expense || 0) / maxValue) * plotHeight;

      doc
        .rect(center - barWidth - 2, baseY - incomeHeight, barWidth, incomeHeight)
        .fill(COLORS.emerald);
      doc
        .rect(center + 2, baseY - expenseHeight, barWidth, expenseHeight)
        .fill(COLORS.rose);

      doc
        .font("Helvetica")
        .fontSize(6.5)
        .fillColor(COLORS.muted)
        .text(normalizeText(item.label), center - groupWidth / 2, baseY + 7, {
          width: groupWidth,
          align: "center",
        });
    });

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text("Income", PAGE.margin + 16, this.y + height - 15);
    doc.rect(PAGE.margin + 4, this.y + height - 13, 7, 7).fill(COLORS.emerald);
    doc
      .fillColor(COLORS.muted)
      .text("Expenses", PAGE.margin + 78, this.y + height - 15);
    doc.rect(PAGE.margin + 64, this.y + height - 13, 7, 7).fill(COLORS.rose);

    this.y += height + 18;
  }

  categoryBreakdown() {
    const categories = this.data.categories || [];
    if (!categories.length) return;

    this.prepareSection(180);
    this.sectionTitle("Spending by category", {
      subtitle: "Top categories ranked by actual expense amount for the report period.",
    });

    const rows = categories.slice(0, 7);
    const max = Math.max(...rows.map((item) => Number(item.amount) || 0), 1);
    const rowHeight = 32;
    this.ensureSpace(rows.length * rowHeight + 10);

    rows.forEach((item) => {
      const amount = Number(item.amount) || 0;
      const barWidth = Math.max(2, (amount / max) * (this.contentWidth() - 175));

      this.doc
        .font("Helvetica-Bold")
        .fontSize(8.2)
        .fillColor(COLORS.ink)
        .text(normalizeText(item.name), PAGE.margin, this.y + 2, { width: 110 });
      this.doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(COLORS.muted)
        .text(formatPercent(item.percentage), PAGE.margin + 112, this.y + 2, {
          width: 45,
          align: "right",
        });

      this.doc
        .roundedRect(PAGE.margin + 166, this.y + 3, this.contentWidth() - 300, 8, 4)
        .fill("#e2e8f0");
      this.doc
        .roundedRect(PAGE.margin + 166, this.y + 3, Math.min(barWidth, this.contentWidth() - 300), 8, 4)
        .fill(COLORS.cyan);

      this.doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.ink)
        .text(formatMoney(amount, this.currency), PAGE.margin + this.contentWidth() - 125, this.y + 1, {
          width: 125,
          align: "right",
        });
      this.doc
        .font("Helvetica")
        .fontSize(6.5)
        .fillColor(COLORS.subtle)
        .text(`${item.transactionCount || 0} transaction${item.transactionCount === 1 ? "" : "s"}`, PAGE.margin, this.y + 16, {
          width: 155,
        });

      this.y += rowHeight;
    });

    this.y += 6;
  }

  budgetTable() {
    const data = this.data.budgets;
    const items = data?.items || [];

    this.prepareSection(150);
    this.sectionTitle("Budget performance", {
      subtitle: data?.projectionNote || "Actual monthly budget usage by category.",
    });

    if (!items.length) {
      this.noteBox("No budgets were configured for this report month.");
      return;
    }

    const columns = [
      { label: "Category", width: 135 },
      { label: "Budget", width: 92, align: "right" },
      { label: "Spent", width: 92, align: "right" },
      { label: "Used", width: 62, align: "right" },
      { label: data.isCurrentMonth ? "Projected" : "Status", width: 118, align: "right" },
    ];

    this.tableHeader(columns);

    items.slice(0, 10).forEach((item) => {
      let last;

      if (data.isCurrentMonth && item.projectedUsagePercent !== undefined) {
        last = `${formatPercent(item.projectedUsagePercent)} ${String(item.projectionConfidence || "").toLowerCase()}`.trim();
      } else {
        last = item.isOverBudget ? "Over budget" : "Within budget";
      }

      this.tableRow(columns, [
        item.category,
        formatMoney(item.budget, this.currency),
        formatMoney(item.spent, this.currency),
        formatPercent(item.percentageUsed),
        last,
      ], {
        tone: item.isOverBudget ? "negative" : Number(item.percentageUsed) >= 80 ? "warning" : null,
      });
    });

    if (data.unbudgetedSpending?.length) {
      const first = data.unbudgetedSpending[0];
      this.noteBox(
        `${first.category}: ${formatMoney(first.spent, this.currency)} of unbudgeted spending across ${first.transactionCount} transaction${first.transactionCount === 1 ? "" : "s"}.`,
        "warning",
      );
    }
  }

  topExpensesTable() {
    const items = this.data.topExpenses || [];

    this.prepareSection(150);
    this.sectionTitle("Largest expenses", {
      subtitle: "Top expense transactions recorded in the selected report period.",
    });

    if (!items.length) {
      this.noteBox("No expense transactions were recorded in this period.");
      return;
    }

    const columns = [
      { label: "Date", width: 75 },
      { label: "Transaction", width: 195 },
      { label: "Category", width: 105 },
      { label: "Amount", width: 136, align: "right" },
    ];
    this.tableHeader(columns);

    items.slice(0, 8).forEach((item) => {
      this.tableRow(columns, [
        formatDate(item.date),
        item.title,
        item.category,
        formatMoney(item.amount, item.currency || this.currency),
      ]);
    });
  }

  accountSnapshot() {
    const accounts = this.data.accounts;
    const items = accounts?.items || [];

    this.prepareSection(140);
    this.sectionTitle("Account snapshot", {
      subtitle: accounts?.note,
    });

    if (!items.length) {
      this.noteBox("No active accounts are available.");
      return;
    }

    this.statCards([
      {
        label: "Total balance",
        value: formatMoney(accounts.totalBalance, this.currency),
        note: `${items.length} active account${items.length === 1 ? "" : "s"}`,
        tone: Number(accounts.totalBalance) >= 0 ? "positive" : "negative",
      },
      ...items.slice(0, 3).map((item) => ({
        label: item.name,
        value: formatMoney(item.balance, item.currency || this.currency),
        note: item.type,
        tone: Number(item.balance) >= 0 ? "neutral" : "negative",
      })),
    ].slice(0, 4));
  }

  goalsSection() {
    const goalData = this.data.goals;
    const goals = goalData?.goals || [];

    this.prepareSection(150);
    this.sectionTitle("Savings goals", {
      subtitle: "Goal progress is a current snapshot at report generation time, not a reconstructed historical month-end snapshot.",
    });

    if (!goals.length) {
      this.noteBox("No savings goals are currently configured.");
      return;
    }

    const columns = [
      { label: "Goal", width: 160 },
      { label: "Progress", width: 82, align: "right" },
      { label: "Remaining", width: 118, align: "right" },
      { label: "Target", width: 151, align: "right" },
    ];
    this.tableHeader(columns);

    goals.slice(0, 6).forEach((goal) => {
      this.tableRow(columns, [
        goal.name,
        formatPercent(goal.percentageComplete),
        formatMoney(goal.remainingAmount, this.currency),
        goal.targetDate ? formatDate(goal.targetDate) : "-",
      ], {
        tone:
          goal.paceAssessment === "OVERDUE" ||
          goal.paceAssessment === "ABOVE_RECENT_SAVINGS_PACE"
            ? "warning"
            : null,
      });
    });

    const portfolio = goalData?.portfolio;

    if (portfolio?.activeGoalCount > 1) {
      this.noteBox(
        portfolio.collectivelyAffordable
          ? `Combined active-goal requirement: ${formatMoney(portfolio.totalRequiredMonthlyContribution, this.currency)} per month, within the recent savings baseline.`
          : `Combined active-goal requirement exceeds the recent savings baseline by ${formatMoney(portfolio.monthlyShortfall, this.currency)} per month.`,
        portfolio.collectivelyAffordable ? "positive" : "warning",
      );
    }
  }

  recurringSection() {
    const recurring = this.data.recurring;

    this.prepareSection(140);
    this.sectionTitle("Recurring activity recorded", {
      subtitle: "Actual transactions linked to recurring rules during the report period.",
    });

    if (!recurring?.count) {
      this.noteBox("No recurring-linked transaction occurrences were recorded in this period.");
      return;
    }

    this.statCards([
      {
        label: "Occurrences",
        value: String(recurring.count),
        note: "Recorded recurring transactions",
      },
      {
        label: "Recurring income",
        value: formatMoney(recurring.income, this.currency),
        note: "Actual recorded income",
        tone: "positive",
      },
      {
        label: "Recurring expenses",
        value: formatMoney(recurring.expense, this.currency),
        note: "Actual recorded expenses",
        tone: recurring.expense > 0 ? "warning" : "neutral",
      },
      {
        label: "Net recurring",
        value: formatMoney(recurring.income - recurring.expense, this.currency),
        note: "Income minus expenses",
        tone: recurring.income - recurring.expense >= 0 ? "positive" : "negative",
      },
    ]);
  }

  forecastSection() {
    const forecastData = this.data.forecast;
    if (!forecastData?.supported || !forecastData.forecast) return;

    const forecast = forecastData.forecast;
    this.prepareSection(150);
    this.sectionTitle("Current-month forecast", {
      subtitle: "Directional estimate using FinTrack's anomaly-aware and recurring-aware forecast engine.",
    });

    this.statCards([
      {
        label: "Projected income",
        value: formatMoney(forecast.income, this.currency),
        note: "Month-end estimate",
        tone: "positive",
      },
      {
        label: "Projected expenses",
        value: formatMoney(forecast.expense, this.currency),
        note: "Month-end estimate",
        tone: "warning",
      },
      {
        label: "Projected savings",
        value: formatMoney(forecast.netSavings, this.currency),
        note: `${String(forecast.confidence || "LOW").toLowerCase()} confidence`,
        tone: forecast.netSavings >= 0 ? "positive" : "negative",
      },
      {
        label: "Savings rate",
        value: formatPercent(forecast.savingsRate),
        note: humanizeForecastMethod(forecast.method),
        tone: forecast.savingsRate >= 0 ? "positive" : "negative",
      },
    ]);

    if (Number(forecastData.expensePaceAdjustment?.excludedFromPace) > 0) {
      this.noteBox(
        `${formatMoney(forecastData.expensePaceAdjustment.excludedFromPace, this.currency)} of already-recorded out-of-pattern spending is included once but excluded from automatic repeat pacing.`,
        "warning",
      );
    }

    const remaining = forecastData.remainingMonthEstimate;
    const recurringContext = forecastData.recurringCashFlowContext;

    if (remaining) {
      const remainingExpense = Number(remaining.expense) || 0;
      const nonRecurringExpense =
        Number(remaining.nonRecurringExpense) || 0;
      const scheduledRecurringExpense =
        Number(remaining.scheduledRecurringExpense) || 0;
      const currentRecordedRecurringExpense =
        Number(recurringContext?.currentRecordedExpense) || 0;

      let explanation =
        `Remaining-month expense estimate: ${formatMoney(remainingExpense, this.currency)} ` +
        `(${formatMoney(nonRecurringExpense, this.currency)} non-recurring + ` +
        `${formatMoney(scheduledRecurringExpense, this.currency)} scheduled recurring).`;

      if (
        remainingExpense === 0 &&
        currentRecordedRecurringExpense > 0
      ) {
        explanation +=
          ` ${formatMoney(currentRecordedRecurringExpense, this.currency)} of recurring-linked expense is already recorded this month and is not repeated unless another occurrence is actually due before month-end.`;
      }

      this.noteBox(explanation, "neutral");
    }

    if (forecastData.reportForecastContract?.sharedWithAssistant) {
      this.bullet(
        "Forecast source: the same hardened FinTrack get_financial_forecast engine used by the AI Assistant.",
        { tone: "muted" },
      );
    }
  }

  insightsSection() {
    const { insights, warnings } = this.data.insights;
    const patternSignals = this.data.patterns?.topSignals || [];

    this.prepareSection(150);
    this.sectionTitle("FinTrack insights", {
      subtitle: "Deterministic observations generated from the same authoritative data used throughout FinTrack.",
    });

    if (warnings.length) {
      this.ensureSpace(28);
      this.doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#b45309")
        .text("NEEDS ATTENTION", PAGE.margin, this.y + 4);
      this.y += 22;
      warnings.forEach((item) => this.bullet(item, { tone: "warning" }));
    }

    insights.forEach((item) => this.bullet(item));

    if (patternSignals.length) {
      this.ensureSpace(70);
      this.doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLORS.ink)
        .text("Pattern signals", PAGE.margin, this.y + 6);
      this.y += 22;

      patternSignals.slice(0, 4).forEach((signal) => {
        const detail =
          signal.type === "LARGE_TRANSACTION"
            ? `${signal.title || signal.category}: ${formatMoney(signal.amount, this.currency)} (${String(signal.severity || "").toLowerCase()} severity).`
            : signal.type === "NEW_CATEGORY_ACTIVITY"
              ? `${signal.category}: new comparable-period activity of ${formatMoney(signal.currentAmount, this.currency)}.`
              : signal.type === "CATEGORY_SPIKE"
                ? `${signal.category}: ${formatMoney(signal.currentAmount, this.currency)} versus ${formatMoney(signal.baselineAverage, this.currency)} comparable-window baseline.`
                : signal.explanation || `${signal.type || "Pattern"} signal detected.`;
        this.bullet(detail);
      });
    }

    const confidence = this.data.patterns?.quality?.evidenceConfidence;
    if (confidence) {
      this.bullet(
        `Pattern evidence confidence: ${String(confidence).toLowerCase()}. Signals describe unusual behavior relative to recorded history and are not fraud determinations.`,
        { tone: "muted" },
      );
    }
  }

  notesSection() {
    const notes = this.data.notes || [];
    if (!notes.length) return;

    this.prepareSection(100);
    this.sectionTitle("Report notes and limitations");
    notes.forEach((note) => this.bullet(note));
  }

  bullet(text, { tone = "normal" } = {}) {
    const clean = normalizeText(text);
    const dotColor =
      tone === "warning"
        ? COLORS.amber
        : tone === "muted"
          ? COLORS.subtle
          : COLORS.cyan;
    const textColor = tone === "muted" ? COLORS.muted : COLORS.ink;
    this.doc.font("Helvetica").fontSize(8.3);
    const height = Math.max(
      18,
      this.doc.heightOfString(clean, {
        width: this.contentWidth() - 20,
        lineGap: 2,
      }),
    );

    this.ensureSpace(height + 8);
    this.doc.circle(PAGE.margin + 4, this.y + 6, 2).fill(dotColor);
    this.doc
      .font("Helvetica")
      .fontSize(8.3)
      .fillColor(textColor)
      .text(clean, PAGE.margin + 14, this.y, {
        width: this.contentWidth() - 14,
        lineGap: 2,
      });
    this.y += height + 7;
  }

  noteBox(text, tone = "neutral") {
    const clean = normalizeText(text);
    const bg =
      tone === "warning"
        ? COLORS.amberSoft
        : tone === "positive"
          ? COLORS.emeraldSoft
          : COLORS.surface;
    const border =
      tone === "warning"
        ? "#fde68a"
        : tone === "positive"
          ? "#a7f3d0"
          : COLORS.line;
    this.doc.font("Helvetica").fontSize(8);
    const height = Math.max(
      38,
      this.doc.heightOfString(clean, {
        width: this.contentWidth() - 24,
        lineGap: 2,
      }) + 22,
    );

    this.ensureSpace(height + 8);
    this.doc
      .roundedRect(PAGE.margin, this.y, this.contentWidth(), height, 9)
      .fillAndStroke(bg, border);
    this.doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.ink)
      .text(clean, PAGE.margin + 12, this.y + 11, {
        width: this.contentWidth() - 24,
        lineGap: 2,
      });
    this.y += height + 10;
  }

  tableHeader(columns) {
    this.ensureSpace(28);
    let x = PAGE.margin;

    this.doc
      .rect(PAGE.margin, this.y, this.contentWidth(), 24)
      .fill(COLORS.surface);

    columns.forEach((column) => {
      this.doc
        .font("Helvetica-Bold")
        .fontSize(6.8)
        .fillColor(COLORS.muted)
        .text(normalizeText(column.label).toUpperCase(), x + 6, this.y + 8, {
          width: column.width - 12,
          align: column.align || "left",
        });
      x += column.width;
    });

    this.y += 26;
  }

  tableRow(columns, values, { tone = null } = {}) {
    const rowHeight = 28;
    this.ensureSpace(rowHeight + 2);
    let x = PAGE.margin;
    const fill =
      tone === "negative"
        ? COLORS.roseSoft
        : tone === "warning"
          ? COLORS.amberSoft
          : "#ffffff";

    this.doc.rect(PAGE.margin, this.y, this.contentWidth(), rowHeight).fill(fill);
    this.doc
      .moveTo(PAGE.margin, this.y + rowHeight)
      .lineTo(PAGE.margin + this.contentWidth(), this.y + rowHeight)
      .lineWidth(0.4)
      .strokeColor(COLORS.line)
      .stroke();

    columns.forEach((column, index) => {
      this.doc
        .font(index === 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(7.2)
        .fillColor(COLORS.ink)
        .text(normalizeText(values[index]), x + 6, this.y + 8, {
          width: column.width - 12,
          align: column.align || "left",
          ellipsis: true,
          height: 12,
        });
      x += column.width;
    });

    this.y += rowHeight;
  }

  addFooters() {
    const { doc } = this;
    const range = doc.bufferedPageRange();
    const expectedPageCount = range.count;

    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      const footerY = doc.page.height - 34;
      const originalBottomMargin = doc.page.margins.bottom;
      const originalX = doc.x;
      const originalY = doc.y;

      // PDFKit's flowing text engine can add a page when text is placed below
      // the normal content bottom margin. Footers are absolutely positioned,
      // so temporarily remove that flow boundary and disable line wrapping.
      doc.page.margins.bottom = 0;

      doc
        .moveTo(PAGE.margin, footerY - 7)
        .lineTo(doc.page.width - PAGE.margin, footerY - 7)
        .lineWidth(0.4)
        .strokeColor(COLORS.line)
        .stroke();
      doc
        .font("Helvetica")
        .fontSize(6.8)
        .fillColor(COLORS.subtle)
        .text(
          "FinTrack monthly report - private financial summary",
          PAGE.margin,
          footerY,
          { width: 280, lineBreak: false },
        );
      doc.text(
        `Page ${index - range.start + 1} of ${expectedPageCount}`,
        doc.page.width - PAGE.margin - 100,
        footerY,
        { width: 100, align: "right", lineBreak: false },
      );

      doc.page.margins.bottom = originalBottomMargin;
      doc.x = originalX;
      doc.y = originalY;
    }

    const after = doc.bufferedPageRange();

    if (after.count !== expectedPageCount) {
      throw new Error(
        `Monthly PDF footer rendering changed page count from ${expectedPageCount} to ${after.count}`,
      );
    }
  }

  render() {
    const { data } = this;
    this.addPage();
    this.renderCoverHeader();

    this.sectionTitle("Executive summary");
    this.statCards([
      {
        label: "Income",
        value: formatMoney(data.overview.totalIncome, this.currency),
        note: `${data.overview.incomeTransactionCount || 0} income transactions`,
        tone: "positive",
      },
      {
        label: "Expenses",
        value: formatMoney(data.overview.totalExpense, this.currency),
        note: `${data.overview.expenseTransactionCount || 0} expense transactions`,
        tone: data.overview.totalExpense > data.overview.totalIncome ? "negative" : "warning",
      },
      {
        label: "Net savings",
        value: formatMoney(data.overview.netSavings, this.currency),
        note: "Income minus expenses",
        tone: data.overview.netSavings >= 0 ? "positive" : "negative",
      },
      {
        label: "Savings rate",
        value: data.overview.totalIncome > 0 ? formatPercent(data.overview.savingsRate) : "-",
        note: "Income retained",
        tone: data.overview.savingsRate >= 0 ? "positive" : "negative",
      },
    ]);
    this.comparisonCallout();
    this.cashFlowChart();
    this.categoryBreakdown();

    this.prepareSection(220);
    this.sectionTitle("Budgets and transactions");
    this.budgetTable();
    this.topExpensesTable();

    this.addPage("Snapshots and recurring activity");
    this.accountSnapshot();
    this.goalsSection();
    this.recurringSection();

    if (data.forecast?.supported) {
      this.addPage("Forecast and insights");
      this.forecastSection();
      this.insightsSection();
      this.notesSection();
    } else {
      this.addPage("Insights and notes");
      this.insightsSection();
      this.notesSection();
    }

    this.addFooters();
    this.doc.end();
  }
}

const renderMonthlyReportPdf = ({ data, stream }) => {
  const renderer = new MonthlyReportPdf(data, stream);
  renderer.render();
};

export { renderMonthlyReportPdf };
