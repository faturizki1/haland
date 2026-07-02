import { auth } from "@/lib/auth";
import { getServices } from "@/lib/actions/service.actions";
import { redirect, unauthorized } from "next/navigation";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";
import { ServiceManagementClient } from "./service-management-client";

export default async function ServicesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    unauthorized();
  }

  const servicesResult = await getServices({ page: PAGINATION_CONSTANTS.DEFAULT_PAGE, limit: PAGINATION_CONSTANTS.DEFAULT_LIMIT, search: "", showInactive: false });

  const services = servicesResult.success ? servicesResult.data.services : [];
  const total = servicesResult.success ? servicesResult.data.total : 0;

  return (
    <ServiceManagementClient
      initialServices={services}
      initialTotal={total}
      initialPage={PAGINATION_CONSTANTS.DEFAULT_PAGE}
      initialLimit={PAGINATION_CONSTANTS.DEFAULT_LIMIT}
    />
  );
}
