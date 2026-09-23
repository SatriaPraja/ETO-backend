import { Router } from 'express'
import { pool } from '../config/database.ts'
import { AuthRepository } from '../repositories/authRepository.ts'
import { AuthService } from '../services/authService.ts'
import { AuthController } from '../controllers/authController.ts'
import { validateRequest } from '../middlewares/validateMiddleware.ts'
import { authenticateJWT } from '../middlewares/authMiddleware.ts'
import { loginSchema, switchRoleSchema } from '../schemas/authSchema.ts'

const router = Router()

// Gunakan AuthRepository khusus untuk Autentikasi & Brute Force Protection
const authRepo = new AuthRepository(pool)
const authService = new AuthService(authRepo)
const authController = new AuthController(authService)

// 🔓 Public Endpoints
router.post('/login', validateRequest(loginSchema), authController.login)

// 🔒 Authenticated Endpoints
router.post('/logout', authenticateJWT, authController.logout)
router.post('/switch-role', authenticateJWT, validateRequest(switchRoleSchema), authController.switchRole)
router.get('/me', authenticateJWT, authController.me)

export default router