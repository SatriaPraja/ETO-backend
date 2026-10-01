import { Request, Response } from "express";
import { DashboardService } from "../services/dashboardService.ts";
import { getRecentOrdersQuerySchema } from "../schemas/dashboardSchema.ts";

export class DashboardController {
  constructor(private service: DashboardService) {}

  getOverview = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const filters = getRecentOrdersQuerySchema.parse(req.query);

      // 🟢 PERBAIKAN: Ambil activeRole terlebih dahulu, baru fallback ke role/roles
      const targetRole = user.activeRole || user.role || user.roles;

      const data = await this.service.getDashboardOverview(
        user.id,
        targetRole,
        user.unitKerjaKode,
        filters,
      );

      return res.status(200).json({
        success: true,
        message: "Data dashboard berhasil dimuat",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memuat data dashboard",
      });
    }
  };
}
