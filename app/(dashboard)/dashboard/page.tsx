import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

async function logoutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
          <p className="mt-2 text-sm text-slate-600">
            Anda masuk sebagai {session.user.name} ({session.user.role}).
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Logout
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Session aktif berhasil terbaca dari NextAuth. Fitur bisnis akan dibangun pada fase berikutnya.
      </div>
    </section>
  );
}
