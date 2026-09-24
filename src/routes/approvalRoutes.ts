import { Router } from "express";
import { pool } from "../config/database.ts";
import { ApprovalRepository } from "../repositories/approvalRepository.ts";
import { ApprovalService } from "../services/approvalService.ts";
import { ApprovalController } from "../controllers/approvalController.ts";
import {
  authenticateJWT,
  authorizeRoles,
} from "../middlewares/authMiddleware.ts";

const router = Router();

// Inisialisasi Modul Approval
const approvalRepo = new ApprovalRepository(pool);
const approvalService = new ApprovalService(approvalRepo);
const approvalController = new ApprovalController(approvalService);

// 🟢 Endpoint GET /api/approval/inbox (Daftar Antrean & Riwayat Persetujuan)
router.get(
  "/inbox",
  [
    authenticateJWT,
    authorizeRoles(
      "OFFICIAL_BOOKER",
      "APPROVER_KAKANWIL",
      "ADMIN_TRAVEL_KP",
      "SUPER_ADMIN",
    ),
  ],
  approvalController.getInbox,
);

// 🟢 Endpoint POST /api/approval/status (Ubah Status Otorisasi)
router.post(
  "/status",
  [
    authenticateJWT,
    authorizeRoles(
      "OFFICIAL_BOOKER",
      "APPROVER_KAKANWIL",
      "ADMIN_TRAVEL_KP",
      "SUPER_ADMIN",
    ),
  ],
  approvalController.updateStatus,
);

export default router;
