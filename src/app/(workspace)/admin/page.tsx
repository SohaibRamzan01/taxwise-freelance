import { AdminPage } from "@/components/domain/admin";
import { requireAdmin } from "@/lib/auth/session";
export const metadata = { title: "Admin" };
export default async function Page() { const user = await requireAdmin(); return <AdminPage actorId={user.id} />; }
