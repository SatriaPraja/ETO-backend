import { Router } from "express";
import { Pool } from "pg";
import { DashboardRepository } from "../repositories/dashboardRepository.ts";
import { DashboardService } from "../services/dashboardService.ts";
import { DashboardController } from "../controllers/dashboardController.ts";
import {
  authenticateJWT,
  authorizeRoles,
} from "../middlewares/authMiddleware.ts";

export function createDashboardRouter(pool: Pool): Router {
  const router = Router();

  const repo = new DashboardRepository(pool);
  const service = new DashboardService(repo);
  const controller = new DashboardController(service);

  // 🔒 GET Dashboard Overview
  router.get(
    "/overview",
    [
      authenticateJWT,
      authorizeRoles(
        "SUPER_ADMIN",
        "ADMIN_TRAVEL_KP",
        "ASDEP_KEUANGAN",
        "APPROVER_KAKANWIL",
        "OFFICIAL_BOOKER",
      ),
    ],
    controller.getOverview,
  );

  return router;
}
