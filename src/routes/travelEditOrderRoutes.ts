import { Router } from "express";
import { pool } from "../config/database.ts";
import { TravelEditOrderRepository } from "../repositories/travelEditOrderRepository.ts";
import { TravelEditOrderService } from "../services/travelEditOrderService.ts";
import { authenticateJWT, authorizeRoles } from "../middlewares/authMiddleware.ts";
import { TravelEditOrderController } from "../controllers/travelEditOrderEditController.ts";

const router = Router();

// Inisialisasi Modul Koreksi
const editRepo = new TravelEditOrderRepository(pool);
const editService = new TravelEditOrderService(editRepo, pool);
const editController = new TravelEditOrderController(editService);

const authMiddlewares = [
  authenticateJWT,
  authorizeRoles("OFFICIAL_BOOKER", "SUPER_ADMIN"),
];

// ====================================================================
// 🚀 ENDPOINTS MODUL KOREKSI TRAVEL ORDER
// ====================================================================

// 1. GET Data Detail Khusus Form Koreksi (Param: UUID atau Code e-TO)
router.get("/:identifier", authMiddlewares, editController.getCorrectionData);

// 2. PUT Kirim Ulang Perbaikan / Resubmit (Param: UUID)
router.put("/:id", authMiddlewares, editController.submitCorrection);

export default router;