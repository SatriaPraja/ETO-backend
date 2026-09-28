import { z } from "zod";

export const reportHotelQuerySchema = z.object({
  unitKerjaKode: z.string().optional(),
  cityId: z.coerce.number().int().optional(),
  searchCategory: z.enum(["hotelName", "guestName", "toCode"]).optional().default("hotelName"),
  keyword: z.string().optional(),
  period: z.string().optional(), // Format YYYY-MM (e.g. 2026-05)
  status: z.enum(["WAITING_PEJABAT", "APPROVED", "REJECTED", "RETURNED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const reportTransportQuerySchema = z.object({
  unitKerjaKode: z.string().optional(),
  budgetId: z.string().uuid().optional(),
  searchCategory: z.enum(["guestName", "npk", "toCode"]).optional().default("guestName"),
  keyword: z.string().optional(),
  startDate: z.string().optional(), // YYYY-MM-DD
  endDate: z.string().optional(),   // YYYY-MM-DD
  status: z.enum(["WAITING_PEJABAT", "APPROVED", "REJECTED", "RETURNED", "CANCELLED"]).optional(),
  category: z.enum(["INTERNAL", "EKSTERNAL"]).optional(),
  transportType: z.enum(["flight", "train", "sea", "bus", "car"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ReportHotelQueryParams = z.infer<typeof reportHotelQuerySchema>;
export type ReportTransportQueryParams = z.infer<typeof reportTransportQuerySchema>;