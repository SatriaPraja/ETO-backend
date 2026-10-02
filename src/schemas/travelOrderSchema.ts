import { z } from "zod";

// Helper Preprocessor untuk UUID null/empty
const nullableUuid = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? null : val),
  z.string().uuid("Invalid UUID").nullable().optional(),
);

// Helper Preprocessor untuk membersihkan akhiran timezone pada waktu (misal: "08:30 WIB" -> "08:30")
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
// A. SCHEMA TAHAP 0: PEMBUATAN HEADER TRAVEL ORDER MANDIRI
// ====================================================================
export const CreateStandaloneTravelOrderSchema = z.object({
  toCode: z.string().optional().nullable(),
  activityName: z.string().min(1, "Nama kegiatan/dinas wajib diisi"),
  unitKerjaKode: z.string().optional().nullable(),
  unitKerjaNama: z.string().optional().nullable(),
  programKerja: z.string().optional().nullable(),
  approverId: z.string().uuid("Approver ID wajib diisi & berbentuk UUID valid"),
  budgetId: z.string().uuid("Budget ID wajib diisi & berbentuk UUID valid"),
  sprinNumber: z.string().min(1, "No. Surat Perintah (Sprin) wajib diisi"),
  sprinDetail: z.string().min(1, "Detail uraian tugas wajib diisi"),
  notes: z.string().optional().nullable(),
});

// ====================================================================
// B. SCHEMA ITEM TRANSPORTASI (Pesawat/Kereta/Bus/Mobil)
// ====================================================================
export const TransportItemSchema = z.object({
  transportType: z.enum(["flight", "train", "bus", "car"]).default("flight"),
  category: z.enum(["INTERNAL", "EKSTERNAL"]).default("INTERNAL"),
  userId: nullableUuid,
  name: z.string().min(1, "Nama traveller wajib diisi"),
  npkOrKtp: z.string().optional().nullable(),
  jabatanOrInstansi: z.string().optional().nullable(),
  phone: z.string().min(1, "No HP wajib diisi"),

  route: z.string().optional().nullable(),
  originCity: z.string().optional().nullable(),
  destCity: z.string().optional().nullable(),
  originCityId: z.number().optional().nullable(),
  destinationCityId: z.number().optional().nullable(),

  // Departure Leg (Pergi)
  departureDate: z.string().min(1, "Tanggal berangkat wajib diisi"),
  departureTime: cleanTimeFormat,
  departureInfo: z.string().optional().nullable(),
  maskapai: z.string().optional().nullable(),
  kelas: z.string().optional().nullable(),
  transportId: z.number().optional().nullable(),
  transportClassId: z.number().optional().nullable(),

  // Return Leg (Pulang)
  isRoundTrip: z.boolean().default(true),
  returnDate: z.string().optional().nullable(),
  returnTime: cleanTimeFormatNullable,
  returnInfo: z.string().optional().nullable(),
  returnMaskapai: z.string().optional().nullable(),
  returnKelas: z.string().optional().nullable(),
  returnTransportId: z.number().optional().nullable(),
  returnTransportClassId: z.number().optional().nullable(),

  price: z.number().min(0).default(0),
});

export const AddTransportToExistingTOSchema = z.object({
  travelOrderId: z.string().min(1, "Travel Order ID / Code wajib diisi"),
  travellers: z
    .array(TransportItemSchema)
    .min(1, "Minimal tambahkan 1 item transportasi"),
});

// ====================================================================
// C. SCHEMA AKOMODASI HOTEL
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

export const AddHotelToExistingTOSchema = z.object({
  travelOrderId: z.string().min(1, "Travel Order ID / Code wajib diisi"),
  hotels: z
    .array(HotelItemSchema)
    .min(1, "Minimal tambahkan 1 pemesanan hotel"),
});

// ====================================================================
// D. EXPORT INFERRED TYPES
// ====================================================================
export type CreateStandaloneTravelOrderDTO = z.infer<
  typeof CreateStandaloneTravelOrderSchema
>;
export type TransportItemDTO = z.infer<typeof TransportItemSchema>;
export type AddTransportToExistingTODTO = z.infer<
  typeof AddTransportToExistingTOSchema
>;
export type HotelGuestItemDTO = z.infer<typeof HotelGuestItemSchema>;
export type HotelItemDTO = z.infer<typeof HotelItemSchema>;
export type AddHotelToExistingTODTO = z.infer<
  typeof AddHotelToExistingTOSchema
>;
