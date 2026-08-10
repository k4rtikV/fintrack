const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const emailLayout = ({ preheader = "FinTrack notification", title, bodyHtml, action }) => {
  const safeTitle = escapeHtml(title);
  const actionHtml = action?.url
    ? `<div style="margin-top:26px"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#10b981;color:#052e2b;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">${escapeHtml(action.label || "Open FinTrack")}</a></div>`
    : "";

  return `<!doctype html>
  <html>
    <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
      <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>
      <div style="max-width:600px;margin:36px auto;padding:20px">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:32px">
          <div style="font-size:13px;font-weight:800;letter-spacing:1.4px;color:#059669">FINTRACK</div>
          <h1 style="font-size:25px;line-height:1.25;margin:14px 0 18px">${safeTitle}</h1>
          <div style="font-size:15px;line-height:1.7;color:#475569">${bodyHtml}</div>
          ${actionHtml}
          <div style="border-top:1px solid #e2e8f0;margin-top:30px;padding-top:18px;font-size:12px;line-height:1.6;color:#94a3b8">
            This message was sent by FinTrack because of activity in your finance workspace.
          </div>
        </div>
      </div>
    </body>
  </html>`;
};

export { emailLayout, escapeHtml };
