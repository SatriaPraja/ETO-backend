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

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;