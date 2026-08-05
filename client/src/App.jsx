function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
          FinTrack
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Personal finance, clearly organized.
        </h1>

        <p className="mt-3 text-slate-600">
          The frontend is working and Tailwind CSS is configured.
        </p>

        <button
          type="button"
          className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
        >
          Foundation complete
        </button>
      </section>
    </main>
  );
}

export default App;