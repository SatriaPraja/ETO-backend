import { Router } from 'express'
import { pool } from '../config/database.ts'
import { HistoryRepository } from '../repositories/historyRepository.ts'
import { HistoryService } from '../services/historyService.ts'
import { HistoryController } from '../controllers/historyController.ts'
import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.ts'

const router = Router()

// Inisialisasi Modul History
const historyRepo = new HistoryRepository(pool)
const historyService = new HistoryService(historyRepo)
const historyController = new HistoryController(historyService)

// 🟢 Endpoint GET /history
router.get(
  '/',
  [
    authenticateJWT,
    authorizeRoles('OFFICIAL_BOOKER', 'APPROVER_KAKANWIL', 'ADMIN_TRAVEL_KP', 'SUPER_ADMIN')
  ],
  historyController.getOrderHistory
)

// 🟢 Route Baru: Ambil Detail berdasarkan Nomor TO (misal: TO-2026-05-00187)
router.get(
  '/:toCode',
  [
    authenticateJWT,
    authorizeRoles('OFFICIAL_BOOKER', 'APPROVER_KAKANWIL', 'ADMIN_TRAVEL_KP', 'SUPER_ADMIN')
  ],
  historyController.getOrderDetailByToCode
);

export default router