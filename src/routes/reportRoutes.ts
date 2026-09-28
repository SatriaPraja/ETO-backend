import { Router } from "express";
import { Pool } from "pg";
import { ReportRepository } from "../repositories/reportRepository.ts";
import { ReportService } from "../services/reportService.ts";
import { ReportController } from "../controllers/ReportController.ts";
import {
  authenticateJWT,
  authorizeRoles,
} from "../middlewares/authMiddleware.ts";

export function createReportRouter(pool: Pool): Router {
  const router = Router();

  const reportRepo = new ReportRepository(pool);
  const reportService = new ReportService(reportRepo);
  const reportController = new ReportController(reportService);

  const authMiddlewares = [
    authenticateJWT,
    authorizeRoles("ADMIN_TRAVEL_KP", "APPROVER_KAKANWIL", "SUPER_ADMIN"),
  ];

  // GET /api/v1/reports/hotels
  router.get("/hotels", reportController.getHotelReport);

  // GET /api/v1/reports/transports
  router.get("/transports", reportController.getTransportReport);

  return router;
}
