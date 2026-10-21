import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AppShell user={{ name: user.name, role: user.role }}>{children}</AppShell>;
}
