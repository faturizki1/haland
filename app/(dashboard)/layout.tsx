import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
        <header className="rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            Haland Petcare
          </p>
          <h1 className="text-xl font-semibold">Dashboard placeholder</h1>
        </header>
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">Menu awal</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>Dashboard</li>
              <li>Customers</li>
              <li>Appointments</li>
              <li>Settings</li>
            </ul>
          </aside>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
