import { z } from "zod";

// Schema untuk validasi query parameter (Search, Filter, Pagination)
export const budgetQuerySchema = z.object({
  search: z.string().optional(),
  officeName: z.string().optional(),
  status: z.enum(["aman", "warning", "critical", "all"]).optional().default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Schema untuk membuat Mata Anggaran Baru
export const createBudgetSchema = z.object({
  officeName: z.string().min(2, "Nama kantor/unit kerja wajib diisi").max(255),
  accountNumber: z.string().min(3, "Nomor akun (COA) wajib diisi").max(100),
  accountName: z.string().min(3, "Nama uraian anggaran wajib diisi").max(255),
  programName: z.string().min(2, "Program kerja resmi wajib diisi").max(255),
  activityName: z.string().min(2, "Nama kegiatan operasional wajib diisi").max(255),
  paguBudget: z.number().positive("Pagu DIPA anggaran harus lebih dari 0"),
  usedBudget: z.number().min(0, "Anggaran terpakai tidak boleh negatif").default(0),
});

// Schema untuk update Mata Anggaran
export const updateBudgetSchema = createBudgetSchema.partial();

export type BudgetQueryParams = z.infer<typeof budgetQuerySchema>;
export type CreateBudgetDTO = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetDTO = z.infer<typeof updateBudgetSchema>;