import { z } from 'zod'

export const GetHistoryOrdersQuerySchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(['ALL', 'WAITING_PEJABAT', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED'])
    .optional()
    .default('ALL'),
  unitKerjaKode: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
})

export type GetHistoryOrdersQuery = z.infer<typeof GetHistoryOrdersQuerySchema>