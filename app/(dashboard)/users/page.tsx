import { getUsers } from "@/lib/actions/user.actions";
import { auth } from "@/lib/auth";
import { redirect, unauthorized } from "next/navigation";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";
import { UserManagementClient } from "./user-management-client";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "OWNER") {
    unauthorized();
  }

  const usersResult = await getUsers({
    page: PAGINATION_CONSTANTS.DEFAULT_PAGE,
    limit: PAGINATION_CONSTANTS.DEFAULT_LIMIT,
    search: "",
  });

  const users = usersResult.success ? usersResult.data.users : [];
  const total = usersResult.success ? usersResult.data.total : 0;

  return (
    <UserManagementClient
      initialUsers={users}
      initialTotal={total}
      initialPage={PAGINATION_CONSTANTS.DEFAULT_PAGE}
      initialLimit={PAGINATION_CONSTANTS.DEFAULT_LIMIT}
      currentUserId={session.user.id}
    />
  );
}
