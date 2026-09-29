import { z } from "zod";

// Enum Jenis Moda Transportasi
export const transportTypeEnum = z.enum(["flight", "train", "sea", "bus", "car"]);

// Query Parameters untuk List & Search
export const vendorQuerySchema = z.object({
  search: z.string().optional(),
  type: transportTypeEnum.optional(),
  status: z.enum(["active", "inactive", "all"]).optional().default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Schema Konfigurasi Kelas Kursi & SBU
export const transportClassSchema = z.object({
  id: z.number().optional(),
  className: z.string().min(1, "Nama kelas wajib diisi"),
  description: z.string().optional().nullable(),
  sbuLevelInfo: z.string().default("Semua Pegawai & Staf Operasional"),
  priceLimitType: z.string().default("Plafon Standar SBU"),
  isActive: z.boolean().default(true),
});

// Schema Penugasan Hak Akses User/PIC ke Vendor
export const userTransportMappingSchema = z.object({
  userId: z.string().uuid("ID User harus berupa UUID valid"),
  systemRole: z.string().default("Official Booker (Pemesanan Mandiri)"),
  unitKerjaNama: z.string().min(1, "Unit kerja wajib diisi"),
  canIssueEticket: z.boolean().default(true),
  canValidateSbu: z.boolean().default(true),
  canAccessBilling: z.boolean().default(true),
});

// Schema Create Maskapai / Vendor Utama
export const createVendorSchema = z.object({
  code: z.string().min(2, "Kode minimal 2 karakter").max(10, "Kode maksimal 10 karakter"),
  name: z.string().min(2, "Nama brand wajib diisi").max(255),
  vendorFullName: z.string().min(2, "Nama legal PT wajib diisi").max(255),
  type: transportTypeEnum,
  partnershipCategory: z.string().default("BUMN / Mitra Korporasi Resmi (Contract)"),
  integrationType: z.string().default("API B2B Aktif"),
  isActive: z.boolean().default(true),
  notes: z.string().optional().nullable(),
  
  // Array Kelas SBU
  classes: z.array(transportClassSchema).optional().default([]),
  
  // Array Mapping User/PIC Operasional
  assignedUsers: z.array(userTransportMappingSchema).optional().default([]),
});

// Schema Update Vendor
export const updateVendorSchema = createVendorSchema.partial();

export type VendorQueryParams = z.infer<typeof vendorQuerySchema>;
export type CreateVendorDTO = z.infer<typeof createVendorSchema>;
export type UpdateVendorDTO = z.infer<typeof updateVendorSchema>;
export type TransportClassDTO = z.infer<typeof transportClassSchema>;
export type UserTransportMappingDTO = z.infer<typeof userTransportMappingSchema>;