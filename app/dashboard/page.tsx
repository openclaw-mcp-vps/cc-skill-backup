import { cookies } from "next/headers";
import { Dashboard } from "@/components/Dashboard";
import { authCookieNames, verifySession } from "@/lib/auth";
import { getUserById } from "@/lib/storage";

export const metadata = {
  title: "Dashboard | CC Skill Backup",
  description: "Manage encrypted Claude Code backups and restore access."
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieNames.session)?.value;

  if (!token) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-3xl font-semibold text-zinc-50">Dashboard</h1>
        <Dashboard initialUser={null} />
      </main>
    );
  }

  const session = verifySession(token);
  const user = session ? await getUserById(session.userId) : null;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold text-zinc-50">Dashboard</h1>
      <Dashboard
        initialUser={
          user
            ? {
                id: user.id,
                email: user.email,
                paid: user.paid,
                paidAt: user.paidAt
              }
            : null
        }
      />
    </main>
  );
}
