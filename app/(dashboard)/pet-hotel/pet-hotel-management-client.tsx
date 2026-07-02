"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { getHotelRooms, createHotelRoom, updateHotelRoom, disableHotelRoom, getPetHotels, createPetHotelBooking, checkInBooking, checkOutBooking, cancelBooking, type HotelRoomListItem, type PetHotelListItem } from "@/lib/actions/pet-hotel.actions";
import { type PetListItem } from "@/lib/actions/pet.actions";
import { hotelRoomSchema, petHotelSchema } from "@/lib/validations/pet-hotel";

export function PetHotelManagementClient({ initialRooms, initialBookings, initialPets }: { initialRooms: HotelRoomListItem[]; initialBookings: PetHotelListItem[]; initialPets: PetListItem[] }) {
  const [rooms, setRooms] = useState<HotelRoomListItem[]>(initialRooms);
  const [bookings, setBookings] = useState<PetHotelListItem[]>(initialBookings);
  const [pets] = useState<PetListItem[]>(initialPets);
  const [isPending, startTransition] = useTransition();

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [roomDraft, setRoomDraft] = useState({ roomNumber: "", roomType: "" });

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDraft, setBookingDraft] = useState({ petId: "", roomId: "", checkInDate: "", checkOutDate: "", food: "" });


  const refresh = async () => {
    const r = await getHotelRooms({ page: 1, limit: 20 });
    if (r.success) setRooms(r.data.rooms);
    const b = await getPetHotels({ page: 1, limit: 20 });
    if (b.success) setBookings(b.data.bookings);
  };

  const submitCreateRoom = () => {
    startTransition(async () => {
      try {
        const parsed = hotelRoomSchema.parse({ roomNumber: roomDraft.roomNumber, roomType: roomDraft.roomType });
        const res = await createHotelRoom(parsed);
        if (!res.success) return alert(res.error);
        setIsCreateRoomOpen(false);
        await refresh();
      } catch (err: unknown) {
        if (err instanceof Error) alert(err.message);
      }
    });
  };

  const submitCreateBooking = () => {
    startTransition(async () => {
      try {
        const parsed = petHotelSchema.parse({ petId: bookingDraft.petId, roomId: bookingDraft.roomId, checkInDate: bookingDraft.checkInDate ? new Date(bookingDraft.checkInDate) : new Date(), checkOutDate: bookingDraft.checkOutDate ? new Date(bookingDraft.checkOutDate) : undefined, food: bookingDraft.food });
        const res = await createPetHotelBooking(parsed);
        if (!res.success) return alert(res.error);
        setIsBookingOpen(false);
        await refresh();
      } catch (err: unknown) {
        if (err instanceof Error) alert(err.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pet Hotel</CardTitle>
              <CardDescription>Kelola kamar dan booking pet hotel.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refresh()} disabled={isPending}>Refresh</Button>
              <Dialog open={isCreateRoomOpen} onOpenChange={(v) => setIsCreateRoomOpen(v)}>
                <DialogTrigger asChild>
                  <Button>Tambah Kandang</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Kandang</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <input value={roomDraft.roomNumber} onChange={(e) => setRoomDraft((p) => ({ ...p, roomNumber: e.target.value }))} placeholder="Nomor Kandang" className="w-full rounded-md border px-3 py-2" />
                    <input value={roomDraft.roomType} onChange={(e) => setRoomDraft((p) => ({ ...p, roomType: e.target.value }))} placeholder="Tipe Kandang" className="w-full rounded-md border px-3 py-2" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateRoomOpen(false)}>Batal</Button>
                    <Button onClick={submitCreateRoom}>Simpan</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isBookingOpen} onOpenChange={(v) => setIsBookingOpen(v)}>
                <DialogTrigger asChild>
                  <Button>Booking</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Booking Pet Hotel</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <select value={bookingDraft.petId} onChange={(e) => setBookingDraft((p) => ({ ...p, petId: e.target.value }))} className="w-full rounded-md border px-3 py-2">
                      <option value="">Pilih Pet</option>
                      {pets.map((p) => (<option key={p.id} value={p.id}>{p.name} — {p.customer.user.name}</option>))}
                    </select>
                    <select value={bookingDraft.roomId} onChange={(e) => setBookingDraft((p) => ({ ...p, roomId: e.target.value }))} className="w-full rounded-md border px-3 py-2">
                      <option value="">Pilih Kandang</option>
                      {rooms.filter((r) => r.isActive && r.status === 'AVAILABLE').map((r) => (<option key={r.id} value={r.id}>{r.roomNumber} — {r.roomType}</option>))}
                    </select>
                    <input type="date" value={bookingDraft.checkInDate} onChange={(e) => setBookingDraft((p) => ({ ...p, checkInDate: e.target.value }))} className="w-full rounded-md border px-3 py-2" />
                    <input type="date" value={bookingDraft.checkOutDate} onChange={(e) => setBookingDraft((p) => ({ ...p, checkOutDate: e.target.value }))} className="w-full rounded-md border px-3 py-2" />
                    <textarea value={bookingDraft.food} onChange={(e) => setBookingDraft((p) => ({ ...p, food: e.target.value }))} placeholder="Catatan makanan" className="w-full rounded-md border px-3 py-2" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Batal</Button>
                    <Button onClick={submitCreateBooking}>Simpan</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <h4 className="font-semibold">Kamar</h4>
            <ul className="list-disc pl-5">
              {rooms.map((r) => (<li key={r.id}>{r.roomNumber} — {r.roomType} — {r.status} {r.isActive ? '' : '(nonaktif)'} <Button size="sm" variant="outline" onClick={async () => { const nm = prompt('Nomor kandang', r.roomNumber); if (!nm) return; await updateHotelRoom({ id: r.id, roomNumber: nm }); await refresh(); }}>Edit</Button> <Button size="sm" variant="outline" onClick={async () => { if (!confirm('Nonaktifkan kandang ini?')) return; await disableHotelRoom(r.id); await refresh(); }}>Nonaktifkan</Button></li>))}
            </ul>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">Bookings</h4>
            <ul className="list-disc pl-5">
              {bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between">
                  <div>{b.petName} ({b.customerName}) — Kandang {b.roomNumber} — {b.status}</div>
                  <div className="flex gap-2">
                    {b.status === 'BOOKED' ? (<><Button size="sm" onClick={async () => { if (!confirm('Check-in booking?')) return; await checkInBooking(b.id); await refresh(); }}>Check-in</Button><Button size="sm" variant="outline" onClick={async () => { if (!confirm('Batalkan booking?')) return; await cancelBooking(b.id); await refresh(); }}>Batal</Button></>) : null}
                    {['CHECKED_IN','STAYING'].includes(b.status) ? (<Button size="sm" onClick={async () => { if (!confirm('Check-out booking?')) return; await checkOutBooking(b.id); await refresh(); }}>Check-out</Button>) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
