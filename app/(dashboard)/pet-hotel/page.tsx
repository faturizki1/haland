import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHotelRooms, getPetHotels } from "@/lib/actions/pet-hotel.actions";
import { PetHotelManagementClient } from "./pet-hotel-management-client";
import { PAGINATION_CONSTANTS } from "@/lib/constants/pagination";
import { getPets } from "@/lib/actions/pet.actions";

export default async function PetHotelPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roomsResult = await getHotelRooms({ page: PAGINATION_CONSTANTS.DEFAULT_PAGE, limit: PAGINATION_CONSTANTS.DEFAULT_LIMIT });
  const bookingsResult = await getPetHotels({ page: PAGINATION_CONSTANTS.DEFAULT_PAGE, limit: PAGINATION_CONSTANTS.DEFAULT_LIMIT });
  const petsResult = await getPets({ page: 1, limit: 100 });

  const rooms = roomsResult.success ? roomsResult.data.rooms : [];
  const bookings = bookingsResult.success ? bookingsResult.data.bookings : [];
  const pets = petsResult.success ? petsResult.data.pets : [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <PetHotelManagementClient initialRooms={rooms} initialBookings={bookings} initialPets={pets} />
    </section>
  );
}
