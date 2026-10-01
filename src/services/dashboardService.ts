import { DashboardRepository } from "../repositories/dashboardRepository.ts";
import { GetRecentOrdersQuery } from "../schemas/dashboardSchema.ts";

export class DashboardService {
  constructor(private repo: DashboardRepository) {}

  async getDashboardOverview(
    userId: string,
    userRole: string | string[],
    unitKerjaKode?: string,
    queryFilters?: GetRecentOrdersQuery
  ) {
    const filters: GetRecentOrdersQuery = queryFilters || {
      status: "ALL",
      limit: 5,
      page: 1,
    };

    // Jalankan query secara paralel untuk kecepatan respon
    const [kpiStats, ongoingTravellers, budgetSummary, recentOrders] =
      await Promise.all([
        this.repo.getKpiStats(userId, userRole, unitKerjaKode),
        this.repo.getOngoingTravellers(userId, userRole, unitKerjaKode),
        this.repo.getBudgetSummary(unitKerjaKode),
        this.repo.getRecentOrders(userId, userRole, filters, unitKerjaKode),
      ]);

    return {
      kpiStats,
      ongoingTravellers,
      budgetSummary,
      recentOrders: recentOrders.items,
      meta: recentOrders.meta,
    };
  }
}