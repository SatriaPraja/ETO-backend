import { Router } from 'express'
import { pool } from '../config/database.ts'
import { TravelOrderRepository } from '../repositories/travelOrderRepository.ts'
import { TravelOrderService } from '../services/travelOrderService.ts'
import { TravelOrderController } from '../controllers/travelOrderController.ts'

// 🟢 Import Arsitektur Reference (LOV Approver & Budgets)
import { ReferenceRepository } from '../repositories/referenceRepository.ts'
import { ReferenceService } from '../services/referenceService.ts'
import { ReferenceController } from '../controllers/referenceController.ts'

import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.ts'

const router = Router()

// 1. Inisialisasi Travel Order Modul
const toRepo = new TravelOrderRepository(pool)
const toService = new TravelOrderService(toRepo, pool)
const toController = new TravelOrderController(toService)

// 2. Inisialisasi Reference Modul (LOV)
const refRepo = new ReferenceRepository(pool)
const refService = new ReferenceService(refRepo)
const refController = new ReferenceController(refService)

const authMiddlewares = [
  authenticateJWT,
  authorizeRoles('OFFICIAL_BOOKER', 'SUPER_ADMIN'),
]

// ==========================================
// 🚀 ENDPOINTS TRAVEL ORDER
// ==========================================

// 1. Endpoint Tahap 1: Pengajuan Transportasi Pesawat (TO Baru)
router.post('/flight', authMiddlewares, toController.createFlightOrder)

// 2. Endpoint Tahap 2: Pengajuan Akomodasi Hotel (Gabung ke TO Existing)
router.post('/hotel', authMiddlewares, toController.createHotelOrder)

// 3. Endpoint Get Existing Travel Orders
router.get(
  '/existing',
  [authenticateJWT, authorizeRoles('OFFICIAL_BOOKER', 'SUPER_ADMIN')],
  toController.getExistingOrders
)

// ==========================================
// 🚀 ENDPOINTS REFERENCE & LOV
// ==========================================

// 4. LOV Pejabat Penyetuju (Filter Role: APPROVER_KAKANWIL)
router.get(
  '/users/approvers',
  authMiddlewares,
  refController.getApprovers
)

// 🟢 5. LOV Official Booker (Filter Role: OFFICIAL_BOOKER)
router.get(
  '/users/official-bookers',
  authMiddlewares,
  refController.getOfficialBookers
)

// 6. LOV Mata Anggaran (MAK)
router.get(
  '/budgets',
  authMiddlewares,
  refController.getBudgets
)

router.get('/hotels', authMiddlewares, refController.getHotels)

export default router