import { getCustomers } from "@/lib/actions/customer.actions";
import { auth } from "@/lib/auth";
import { redirect, unauthorized } from "next/navigation";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";
import { CustomerManagementClient } from "./customer-management-client";

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    unauthorized();
  }

  const customersResult = await getCustomers({
    page: PAGINATION_CONSTANTS.DEFAULT_PAGE,
    limit: PAGINATION_CONSTANTS.DEFAULT_LIMIT,
    search: "",
    showInactive: false,
  });

  const customers = customersResult.success ? customersResult.data.customers : [];
  const total = customersResult.success ? customersResult.data.total : 0;

  return (
    <CustomerManagementClient
      initialCustomers={customers}
      initialTotal={total}
      initialPage={PAGINATION_CONSTANTS.DEFAULT_PAGE}
      initialLimit={PAGINATION_CONSTANTS.DEFAULT_LIMIT}
    />
  );
}
