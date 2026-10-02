import { Router } from "express";
import { pool } from "../config/database.ts";
import { TravelOrderRepository } from "../repositories/travelOrderRepository.ts";
import { TravelOrderService } from "../services/travelOrderService.ts";
import { TravelOrderController } from "../controllers/travelOrderController.ts";

import { ReferenceRepository } from "../repositories/referenceRepository.ts";
import { ReferenceService } from "../services/referenceService.ts";
import { ReferenceController } from "../controllers/referenceController.ts";

import {
  authenticateJWT,
  authorizeRoles,
} from "../middlewares/authMiddleware.ts";

const router = Router();

// 1. Inisialisasi Travel Order Modul
const toRepo = new TravelOrderRepository(pool);
const toService = new TravelOrderService(toRepo, pool);
const toController = new TravelOrderController(toService);

// 2. Inisialisasi Reference Modul (LOV)
const refRepo = new ReferenceRepository(pool);
const refService = new ReferenceService(refRepo);
const refController = new ReferenceController(refService);

const authMiddlewares = [
  authenticateJWT,
  authorizeRoles("OFFICIAL_BOOKER", "SUPER_ADMIN"),
];

// ==========================================
// 🚀 ENDPOINTS TRAVEL ORDER
// ==========================================

// 1. Buat Header Travel Order Mandiri
router.post("/", authMiddlewares, toController.createTravelOrder);

// 2. Tambah Pemesanan Transportasi ke Travel Order Existing
router.post("/transport", authMiddlewares, toController.addTransportOrder);

// 3. Tambah Pemesanan Akomodasi Hotel ke Travel Order Existing
router.post("/hotel", authMiddlewares, toController.addHotelOrder);

// 4. Ambil Daftar Travel Order Existing (Untuk Modal Pilihan di FE)
router.get(
  "/existing",
  [authenticateJWT, authorizeRoles("OFFICIAL_BOOKER", "SUPER_ADMIN")],
  toController.getExistingOrders,
);

// ==========================================
// 🚀 ENDPOINTS REFERENCE & LOV
// ==========================================

router.get("/users/approvers", authMiddlewares, refController.getApprovers);
router.get(
  "/users/official-bookers",
  authMiddlewares,
  refController.getOfficialBookers,
);
router.get("/budgets", authMiddlewares, refController.getBudgets);
router.get("/hotels", authMiddlewares, refController.getHotels);

export default router;
