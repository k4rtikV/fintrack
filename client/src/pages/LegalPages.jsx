import { Link } from "react-router-dom";

// This contact address is the user support email configured for FinTrack in Google Auth Platform.
// The operator should confirm the address and policy text before making the app public.
const SUPPORT_EMAIL = "kartikvarma8979@gmail.com";
const EFFECTIVE_DATE = "11 October 2026";

const LegalPage = ({ eyebrow, title, intro, children }) => (
  <article className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
    <Link to="/" className="text-sm font-semibold text-copper-300 transition hover:text-copper-200">← Back to FinTrack</Link>
    <header className="mt-8 border-b border-white/10 pb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-copper-300">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">{intro}</p>
      <p className="mt-3 text-xs text-slate-400">Last updated: {EFFECTIVE_DATE}</p>
    </header>
    <div className="space-y-8 py-9 leading-8 text-slate-300 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-100 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_p+p]:mt-3 [&_ul]:space-y-2">
      {children}
    </div>
    <div className="mt-10 rounded-2xl border border-steel-500/30 bg-slate-900/70 p-5 text-sm leading-7 text-slate-300">
      Questions about this policy? Contact <a className="font-semibold text-copper-300 underline underline-offset-4 hover:text-copper-200" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
    </div>
  </article>
);

const PrivacyPage = () => (
  <LegalPage
    eyebrow="Your information"
    title="Privacy Policy"
    intro="This policy explains what FinTrack collects, how its personal finance features use that information, and when third-party services are involved. It applies to the FinTrack web application."
  >
    <section>
      <h2>1. Information we collect</h2>
      <p>When you sign in with Google, FinTrack receives identity information needed to authenticate you, such as your Google account identifier, name, email address and, when provided, a profile image. FinTrack does not receive your Google password or permission to read your Gmail messages.</p>
      <p>FinTrack stores the information you enter or import, which may include accounts, balances, transactions, budgets, goals, scheduled payments, investment records, statement-import history and preferences. When you use the AI Assistant, conversations and relevant financial context may be processed to provide responses.</p>
      <p>For login security and operation, FinTrack also processes session identifiers, timestamps, device/browser information, IP-related request details, security events and trusted-device settings. Where you enable a six-digit PIN, the server stores a salted, memory-hard verifier, not your PIN in plain text.</p>
    </section>
    <section>
      <h2>2. How we use information</h2>
      <ul>
        <li>Authenticate users, manage trusted sessions and help prevent unauthorized access.</li>
        <li>Show your accounts, transaction history, budgets, goals, reports and investment research.</li>
        <li>Process scheduled activity and produce financial summaries or AI responses when requested.</li>
        <li>Send security messages and, according to your preferences, financial notifications.</li>
        <li>Investigate errors, abuse and reliability or security issues.</li>
      </ul>
    </section>
    <section>
      <h2>3. External services</h2>
      <p>FinTrack uses Google Identity Services to verify your Google identity; Render to host the application; MongoDB Atlas to store application data; and Brevo to send transactional and notification emails. Those services process data needed for their respective functions.</p>
      <p>The optional AI Assistant uses the Google Gemini API. If you use it, your message and relevant selected financial context may be sent to that service to generate a response. Avoid submitting information you do not want processed by an external AI provider.</p>
      <p>Investment market and research features request read-only securities data from Upstox. FinTrack does not connect to or trade through your Upstox brokerage account. External research links, such as TradingView or Moneycontrol, are governed by those sites' own privacy practices when opened.</p>
    </section>
    <section>
      <h2>4. Cookies and local data</h2>
      <p>FinTrack uses security and authentication cookies to maintain sessions and optional trusted-device PIN access. The browser may also temporarily hold interface and session-related state needed to operate the app. Clearing cookies or revoking devices can end trusted access.</p>
    </section>
    <section>
      <h2>5. Storage, security and retention</h2>
      <p>Application records are stored on backend infrastructure and are protected through authentication, access checks and security controls. No online service can guarantee absolute security. Financial information is not made public through FinTrack's intended account features.</p>
      <p>Information is retained as needed to operate your account, keep financial history and meet applicable operational or legal requirements. Copies and operational logs may have different retention periods. You can contact the support address below to request information about access, correction or deletion of your account data, subject to applicable requirements.</p>
    </section>
    <section>
      <h2>6. Your choices</h2>
      <p>You control what financial records you enter, can manage supported notification preferences, and can revoke trusted sessions. Security-related notifications may still be sent even when other financial emails are disabled. You can also stop using the optional AI Assistant.</p>
    </section>
    <section>
      <h2>7. Updates</h2>
      <p>We may update this policy as FinTrack's features or third-party integrations change. The latest text and update date will be available on this public page.</p>
    </section>
  </LegalPage>
);

const TermsPage = () => (
  <LegalPage
    eyebrow="Using the app"
    title="Terms of Service"
    intro="These terms describe the intended use of FinTrack, an independent personal finance tracking and research application."
  >
    <section>
      <h2>1. What FinTrack provides</h2>
      <p>FinTrack helps users organize financial records, review budgets and goals, track manually recorded investments, explore market information and create reports. Some features rely on third-party services and can be unavailable or delayed.</p>
    </section>
    <section>
      <h2>2. Accounts and access</h2>
      <p>Use a Google account you are authorized to access. You are responsible for activity under your account and for protecting access to your Google account and FinTrack sessions. Optional PIN unlocking is a convenience on trusted devices and does not replace Google as your primary identity provider.</p>
    </section>
    <section>
      <h2>3. Financial information and accuracy</h2>
      <p>FinTrack is not a bank, broker, investment adviser or payment service. It does not execute trades or move money through linked bank or brokerage accounts. User-entered records and third-party market data can be incomplete, stale or inaccurate. Verify important figures with your financial institutions before acting on them.</p>
      <p>AI-generated summaries, projections and research are informational only and are not personalized professional financial, tax or investment advice. You remain responsible for your financial decisions.</p>
    </section>
    <section>
      <h2>4. Acceptable use</h2>
      <p>Use FinTrack lawfully and only with information you are authorized to provide. Do not attempt to access another user's data, interfere with the service, bypass access controls or exploit the application's integrations.</p>
    </section>
    <section>
      <h2>5. Third-party services</h2>
      <p>Google Sign-In, hosted infrastructure, emails, optional AI features, and market information depend on providers outside FinTrack's control. External websites linked from FinTrack have their own terms and policies.</p>
    </section>
    <section>
      <h2>6. Availability and changes</h2>
      <p>FinTrack is provided on an as-available basis. Features may change, be interrupted, or be discontinued, including because of free-hosting limits or upstream provider restrictions. Avoid using FinTrack as your only copy of important financial records; keep independent backups where appropriate.</p>
    </section>
    <section>
      <h2>7. Privacy and contact</h2>
      <p>The <Link to="/privacy" className="font-semibold text-copper-300 underline underline-offset-4 hover:text-copper-200">Privacy Policy</Link> explains how FinTrack handles data. Contact the support address below for questions or concerns about the service.</p>
    </section>
  </LegalPage>
);

export { PrivacyPage, TermsPage };
