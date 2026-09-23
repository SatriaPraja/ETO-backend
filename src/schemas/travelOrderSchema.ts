import { z } from "zod";

// 🟢 1. Preprocessor untuk mengubah string kosong/whitespace menjadi null (untuk validasi UUID)
const nullableUuid = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? null : val),
  z.string().uuid("Invalid UUID").nullable().optional(),
);

// 🟢 2. Preprocessor untuk membersihkan akhiran " WIB", " WITA", " WIT" agar kompatibel dengan PostgreSQL TIME
const cleanTimeFormat = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      return val.replace(/\s*(WIB|WITA|WIT)/gi, "").trim();
    }
    return val;
  },
  z.string().min(1, "Jam wajib diisi"),
);

const cleanTimeFormatNullable = z.preprocess((val) => {
  if (typeof val === "string" && val.trim() !== "") {
    return val.replace(/\s*(WIB|WITA|WIT)/gi, "").trim();
  }
  return val || null;
}, z.string().nullable().optional());

// ====================================================================
// A. SCHEMA ITEM TRANSPORTASI (Multiple Travellers)
// ====================================================================
export const TransportItemSchema = z.object({
  category: z.enum(["INTERNAL", "EKSTERNAL"]).default("INTERNAL"),
  userId: nullableUuid,
  name: z.string().min(1, "Nama traveller wajib diisi"),
  npkOrKtp: z.string().optional().nullable(),
  jabatanOrInstansi: z.string().optional().nullable(),
  phone: z.string().min(1, "No HP wajib diisi"),

  // Rute & Teks Informasi
  route: z.string().optional().nullable(),
  originCity: z.string().optional().nullable(),
  destCity: z.string().optional().nullable(),
  originCityId: z.number().optional().nullable(),
  destinationCityId: z.number().optional().nullable(),

  // Departure Leg (Pergi)
  departureDate: z.string().min(1, "Tanggal berangkat wajib diisi"),
  departureTime: cleanTimeFormat, // 👈 Otomatis mengubah "08:30 WIB" -> "08:30"
  departureInfo: z.string().optional().nullable(),
  maskapai: z.string().optional().nullable(),
  kelas: z.string().optional().nullable(),
  transportId: z.number().optional().nullable(),
  transportClassId: z.number().optional().nullable(),

  // Return Leg (Pulang)
  isRoundTrip: z.boolean().default(true),
  returnDate: z.string().optional().nullable(),
  returnTime: cleanTimeFormatNullable, // 👈 Otomatis membersihkan jam pulang
  returnInfo: z.string().optional().nullable(),
  returnMaskapai: z.string().optional().nullable(),
  returnKelas: z.string().optional().nullable(),
  returnTransportId: z.number().optional().nullable(),
  returnTransportClassId: z.number().optional().nullable(),

  price: z.number().default(0),
});

// ====================================================================
// B. SCHEMA AKOMODASI HOTEL
// ====================================================================
export const HotelGuestItemSchema = z.object({
  roomNumber: z.string().default("Kamar 01"),
  bedSlot: z.string().default("Bed A"),
  category: z.enum(["INTERNAL", "EKSTERNAL"]).default("INTERNAL"),
  userId: nullableUuid,
  guestName: z.string().min(1, "Nama tamu wajib diisi"),
  npkOrKtp: z.string().optional().nullable(),
  jabatanOrInstansi: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export const HotelItemSchema = z.object({
  hotelId: z.number().optional().nullable(),
  hotelNameCustom: z.string().optional().nullable(),
  cityId: z.number().optional().nullable(),
  cityName: z.string().optional().nullable(),
  roomCount: z.number().min(1).default(1),
  checkInDate: z.string().min(1, "Tanggal Check-In wajib diisi"),
  checkOutDate: z.string().min(1, "Tanggal Check-Out wajib diisi"),
  durationNights: z.number().min(1).default(1),
  pricePerNight: z.number().min(0).default(0),
  subtotalPrice: z.number().min(0).default(0),

  guests: z.array(HotelGuestItemSchema).optional().default([]),
});

// ====================================================================
// C. SCHEMA PAYLOAD UTAMA
// ====================================================================
export const CreateTravelOrderDTOSchema = z.object({
  existingToOption: z.string().optional().nullable(),
  toCode: z.string().optional().nullable(),
  activityName: z.string().min(1, "Nama kegiatan wajib diisi"),
  unitKerjaKode: z.string().optional().nullable(),
  unitKerjaNama: z.string().optional().nullable(),
  programKerja: z.string().optional().nullable(),
  approverNama: z.string().optional().nullable(),

  approverId: nullableUuid,
  budgetAccount: z.string().optional().nullable(),
  budgetId: nullableUuid,

  sprinNumber: z.string().min(1, "No. Sprin wajib diisi"),
  sprinDetail: z.string().min(1, "Detail kegiatan wajib diisi"),
  notes: z.string().optional().nullable(),

  travellers: z
    .array(TransportItemSchema)
    .min(1, "Minimal tambahkan 1 traveller"),
});

export const CreateHotelOrderDTOSchema = z.object({
  travelOrderId: z.string().min(1, "Travel Order ID / Code wajib diisi"),
  hotels: z
    .array(HotelItemSchema)
    .min(1, "Minimal tambahkan 1 pemesanan hotel"),
});

// ====================================================================
// D. EXPORT INFERRED TYPES
// ====================================================================
export type TransportItemDTO = z.infer<typeof TransportItemSchema>;
export type HotelGuestItemDTO = z.infer<typeof HotelGuestItemSchema>;
export type HotelItemDTO = z.infer<typeof HotelItemSchema>;
export type CreateTravelOrderDTO = z.infer<typeof CreateTravelOrderDTOSchema>;
export type CreateHotelOrderDTO = z.infer<typeof CreateHotelOrderDTOSchema>;
