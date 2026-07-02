import { auth } from "@/lib/auth";
import { getPetOwners, getPets, type PetListItem } from "@/lib/actions/pet.actions";
import { redirect, unauthorized } from "next/navigation";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";
import { PetManagementClient } from "./pet-management-client";

export default async function PetsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "CUSTOMER") {
    unauthorized();
  }

  const petsResult = await getPets({
    page: PAGINATION_CONSTANTS.DEFAULT_PAGE,
    limit: PAGINATION_CONSTANTS.DEFAULT_LIMIT,
    search: "",
    species: "",
    showInactive: false,
  });

  const initialCustomers = [];
  if (session.user.role !== "DOKTER") {
    const petOwnersResult = await getPetOwners();
    if (petOwnersResult.success) {
      initialCustomers.push(...petOwnersResult.data.customers);
    }
  }

  const pets: PetListItem[] = petsResult.success ? petsResult.data.pets : [];
  const total = petsResult.success ? petsResult.data.total : 0;

  return (
    <PetManagementClient
      initialPets={pets}
      initialTotal={total}
      initialPage={PAGINATION_CONSTANTS.DEFAULT_PAGE}
      initialLimit={PAGINATION_CONSTANTS.DEFAULT_LIMIT}
      initialCustomers={initialCustomers}
      currentUserRole={session.user.role}
    />
  );
}
