import { getUsers } from "@/lib/actions/user.actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserManagementClient } from "./user-management-client";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const usersResult = await getUsers();
  const users = usersResult.success ? usersResult.data : [];

  return <UserManagementClient initialUsers={users} currentUserId={session.user.id} />;
}
