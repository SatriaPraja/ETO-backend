import { z } from "zod";

// Filter & Pagination Query Schema
export const cityAirportQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "all"]).optional().default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// City Schemas
export const createCitySchema = z.object({
  code: z
    .string()
    .min(2, "Kode kota minimal 2 karakter")
    .max(50, "Kode kota maksimal 50 karakter")
    .transform((val) => val.toUpperCase()),
  name: z.string().min(2, "Nama kota wajib diisi").max(255),
  province: z.string().min(2, "Nama provinsi wajib diisi").max(255),
  isActive: z.boolean().default(true),
});

export const updateCitySchema = createCitySchema.partial();

// Airport Schemas (IATA Code)
export const createAirportSchema = z.object({
  code: z
    .string()
    .min(3, "Kode IATA harus 3-10 karakter")
    .max(10, "Kode IATA maksimal 10 karakter")
    .transform((val) => val.toUpperCase()),
  name: z.string().min(3, "Nama bandara wajib diisi").max(255),
  cityId: z.number().int({ message: "City ID harus berupa angka/ID valid" }),
  isActive: z.boolean().default(true),
});

export const updateAirportSchema = createAirportSchema.partial();

export type CityAirportQueryParams = z.infer<typeof cityAirportQuerySchema>;
export type CreateCityDTO = z.infer<typeof createCitySchema>;
export type UpdateCityDTO = z.infer<typeof updateCitySchema>;
export type CreateAirportDTO = z.infer<typeof createAirportSchema>;
export type UpdateAirportDTO = z.infer<typeof updateAirportSchema>;