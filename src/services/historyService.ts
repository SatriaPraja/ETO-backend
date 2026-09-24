import { HistoryRepository } from "../repositories/historyRepository.ts";
import { GetHistoryOrdersQuery } from "../schemas/historySchema.ts";

export class HistoryService {
  constructor(private historyRepo: HistoryRepository) {}

  async getOrderHistory(
    userId: string,
    userRole: string,
    query: GetHistoryOrdersQuery,
  ) {
    return await this.historyRepo.findOrderHistory(userId, userRole, query);
  }
  async getOrderDetailByToCode(toCode: string) {
    // 🟢 Ganti this.HistoryRepository menjadi this.historyRepo
    const orderDetail = await this.historyRepo.findOrderDetailByToCode(toCode);

    if (!orderDetail) {
      throw new Error(
        `Dokumen Travel Order dengan nomor ${toCode} tidak ditemukan.`,
      );
    }

    // Kalkulasi rasio penggunaan pagu anggaran untuk tampilan di UI
    const pagu = parseFloat(orderDetail.paguBudget || "0");
    const totalCost = parseFloat(orderDetail.totalEstimatedCost || "0");
    const remainingBudget = pagu - totalCost;
    const usagePercentage =
      pagu > 0 ? ((totalCost / pagu) * 100).toFixed(1) : "0";

    return {
      ...orderDetail,
      budgetSummary: {
        paguBudget: pagu,
        totalEstimatedCost: totalCost,
        remainingBudget: remainingBudget > 0 ? remainingBudget : 0,
        usagePercentage: `${usagePercentage}%`,
      },
    };
  }
}
