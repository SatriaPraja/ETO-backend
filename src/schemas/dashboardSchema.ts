import { z } from "zod";

export const getRecentOrdersQuerySchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(["ALL", "WAITING_PEJABAT", "APPROVED", "RETURNED", "REJECTED", "CANCELLED"])
    .optional()
    .default("ALL"),
  limit: z.coerce.number().int().min(1).max(50).default(5),
  page: z.coerce.number().int().min(1).default(1),
  monthYear: z.string().optional(), // Format YYYY-MM
});

export type GetRecentOrdersQuery = z.infer<typeof getRecentOrdersQuerySchema>;