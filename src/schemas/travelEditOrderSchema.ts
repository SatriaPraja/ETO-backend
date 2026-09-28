import { z } from "zod";

const nullableUuid = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? null : val),
  z.string().uuid("Invalid UUID").nullable().optional()
);

const cleanTimeFormat = z.preprocess((val) => {
  if (typeof val === "string" && val.trim() !== "") {
    return val.replace(/\s*(WIB|WITA|WIT)/gi, "").trim();
  }
  return val || null;
}, z.string().nullable().optional());

// ====================================================================
// A. EDIT TRAVELLER / TRANSPORT SCHEMA
// ====================================================================
export const editTransportItemSchema = z.object({
  id: z.string().uuid().optional(), // Nullable jika traveller baru ditambahkan saat revisi
  category: z.enum(["INTERNAL", "EKSTERNAL"]).default("INTERNAL"),
  userId: nullableUuid,
  guestName: z.string().min(1, "Nama traveller wajib diisi"),
  npkOrKtp: z.string().optional().nullable(),
  jabatan: z.string().optional().nullable(),
  instansi: z.string().optional().nullable(),
  phone: z.string().min(1, "Nomor HP wajib diisi"),

  departureDate: z.string().min(1, "Tanggal keberangkatan wajib diisi"),
  departureTime: cleanTimeFormat.default("08:00"),
  returnDate: z.string().optional().nullable(),
  returnTime: cleanTimeFormat,
  isRoundTrip: z.boolean().default(false),
  estimatedPrice: z.coerce.number().min(0).default(0),
});

// ====================================================================
// B. EDIT HOTEL GUEST SCHEMA
// ====================================================================
export const editHotelGuestSchema = z.object({
  id: z.string().uuid().optional(), // Nullable jika tamu baru
  roomNumber: z.string().default("Kamar 01"),
  bedSlot: z.string().default("Bed A"),
  category: z.enum(["INTERNAL", "EKSTERNAL"]).default("INTERNAL"),
  userId: nullableUuid,
  guestName: z.string().min(1, "Nama tamu wajib diisi"),
  npkOrKtp: z.string().optional().nullable(),
  jabatanOrInstansi: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

// ====================================================================
// C. EDIT HOTEL ITEM SCHEMA
// ====================================================================
export const editHotelItemSchema = z.object({
  id: z.string().uuid().optional(), // Nullable jika hotel baru ditambahkan saat revisi
  hotelId: z.number().int().optional().nullable(),
  hotelNameCustom: z.string().optional().nullable(),
  cityId: z.number().int().optional().nullable(),
  roomCount: z.coerce.number().min(1).default(1),
  checkInDate: z.string().min(1, "Tanggal Check-in wajib diisi"),
  checkOutDate: z.string().min(1, "Tanggal Check-out wajib diisi"),
  durationNights: z.coerce.number().min(1).default(1),
  pricePerNight: z.coerce.number().min(0).default(0),
  subtotalPrice: z.coerce.number().min(0).default(0),

  guests: z.array(editHotelGuestSchema).optional().default([]),
});

// ====================================================================
// D. MAIN UPDATE/KOREKSI PAYLOAD SCHEMA
// ====================================================================
export const updateTravelOrderCorrectionSchema = z.object({
  travelOrderId: z.string().uuid("ID Travel Order wajib berupa UUID yang valid"),
  sprinNumber: z.string().min(1, "Nomor Sprin/SPPD wajib diisi"),
  activityName: z.string().min(1, "Nama kegiatan wajib diisi"),
  budgetId: z.string().uuid("Mata Anggaran (MAK) wajib dipilih"),
  sprinDetail: z.string().min(1, "Detail kegiatan sesuai Sprin wajib diisi"),
  notes: z.string().min(1, "Catatan penjelasan perbaikan (Booker Notes) wajib diisi"),

  transports: z.array(editTransportItemSchema).optional().default([]),
  hotels: z.array(editHotelItemSchema).optional().default([]),
});

export type UpdateTravelOrderCorrectionInput = z.infer<typeof updateTravelOrderCorrectionSchema>;