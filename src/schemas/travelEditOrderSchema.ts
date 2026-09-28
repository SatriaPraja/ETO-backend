import { z } from "zod";

const nullableUuid = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? null : val),
  z.string().uuid("Invalid UUID").nullable().optional()
);

// Helper regex untuk memverifikasi UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Mengubah ID non-UUID (seperti "R1-BA", "", atau ID sementara UI) menjadi undefined
const optionalUuid = z.preprocess(
  (val) => {
    if (typeof val === "string" && UUID_REGEX.test(val.trim())) {
      return val.trim();
    }
    return undefined; // Jika string kosong atau ID buatan UI, set ke undefined
  },
  z.string().uuid().optional()
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
  id: optionalUuid,
  transportType: z.enum(["flight", "train", "sea", "bus", "car"]).default("flight"),
  category: z.enum(["INTERNAL", "EKSTERNAL"]).default("INTERNAL"),
  userId: nullableUuid,
  user_id: nullableUuid,
  
  // Identitas Traveller
  guestName: z.string().min(1, "Nama traveller wajib diisi").optional(),
  guest_name: z.string().optional(),
  npkOrKtp: z.string().optional().nullable(),
  npk_or_ktp: z.string().optional().nullable(),
  jabatan: z.string().optional().nullable(),
  instansi: z.string().optional().nullable(),
  phone: z.string().min(1, "Nomor HP wajib diisi"),

  // Detail Rute & Kota
  routeInfo: z.string().optional().nullable(),
  route_info: z.string().optional().nullable(),
  originCityId: z.coerce.number().int().optional().nullable(),
  origin_city_id: z.coerce.number().int().optional().nullable(),
  destinationCityId: z.coerce.number().int().optional().nullable(),
  destination_city_id: z.coerce.number().int().optional().nullable(),

  // Detail Penerbangan/Keberangkatan
  departureDate: z.string().optional(),
  departure_date: z.string().optional(),
  departureTime: cleanTimeFormat.default("08:00:00"),
  departure_time: cleanTimeFormat.optional(),
  maskapai: z.string().optional().nullable(),

  // Detail Kepulangan (Round Trip / PP)
  isRoundTrip: z.boolean().default(false),
  is_round_trip: z.boolean().optional(),
  returnDate: z.string().optional().nullable(),
  return_date: z.string().optional().nullable(),
  returnTime: cleanTimeFormat,
  return_time: cleanTimeFormat,

  estimatedPrice: z.coerce.number().min(0).default(0),
  estimated_price: z.coerce.number().optional(),
}).refine(
  (data) => Boolean(data.guestName || data.guest_name),
  { message: "Nama traveller wajib diisi", path: ["guestName"] }
).refine(
  (data) => Boolean(data.departureDate || data.departure_date),
  { message: "Tanggal keberangkatan wajib diisi", path: ["departureDate"] }
);

// ====================================================================
// B. EDIT HOTEL GUEST SCHEMA
// ====================================================================
export const editHotelGuestSchema = z.object({
id: optionalUuid,
  roomNumber: z.string().default("Kamar 01"),
  room_number: z.string().optional(),
  bedSlot: z.string().default("Bed A"),
  bed_slot: z.string().optional(),
  category: z.enum(["INTERNAL", "EKSTERNAL"]).default("INTERNAL"),
  userId: nullableUuid,
  user_id: nullableUuid,
  guestName: z.string().optional(),
  guest_name: z.string().optional(),
  npkOrKtp: z.string().optional().nullable(),
  npk_or_ktp: z.string().optional().nullable(),
  jabatanOrInstansi: z.string().optional().nullable(),
  jabatan_or_instansi: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  isFilled: z.boolean().optional().default(true),
  is_filled: z.boolean().optional(),
});

// ====================================================================
// C. EDIT HOTEL ITEM SCHEMA
// ====================================================================
export const editHotelItemSchema = z.object({
  id: optionalUuid,
  hotelId: z.coerce.number().int().optional().nullable(),
  hotel_id: z.coerce.number().int().optional().nullable(),
  hotelNameCustom: z.string().optional().nullable(),
  hotel_name_custom: z.string().optional().nullable(),
  cityId: z.coerce.number().int().optional().nullable(),
  city_id: z.coerce.number().int().optional().nullable(),
  roomCount: z.coerce.number().min(1).default(1),
  room_count: z.coerce.number().optional(),
  checkInDate: z.string().optional(),
  check_in_date: z.string().optional(),
  checkOutDate: z.string().optional(),
  check_out_date: z.string().optional(),
  durationNights: z.coerce.number().min(1).default(1),
  duration_nights: z.coerce.number().optional(),
  pricePerNight: z.coerce.number().min(0).default(0),
  price_per_night: z.coerce.number().optional(),
  subtotalPrice: z.coerce.number().min(0).default(0),
  subtotal_price: z.coerce.number().optional(),

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