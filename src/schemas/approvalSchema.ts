import { z } from 'zod';

export const updateStatusSchema = z.object({
  travelOrderId: z.string().uuid('ID Travel Order harus berformat UUID valid'),
  status: z.enum(
    [
      'WAITING_PEJABAT',
      'WAITING_ADMINTRAVEL',
      'APPROVED',
      'REJECTED',
      'RETURNED',
      'CANCELLED'
    ],
    {
      message: 'Status baru wajib diisi dan harus bernilai valid'
    }
  ),
  notes: z.string().optional()
});
export const getInboxQuerySchema = z.object({
  tab: z.enum(['pending', 'history']).default('pending'),
  search: z.string().optional().default(''),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10)
});

export type GetInboxQueryInput = z.infer<typeof getInboxQuerySchema>;

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;