import { Router } from 'express'
import { pool } from '../config/database.ts'
import { UserRepository } from '../repositories/userRepository.ts'
import { UserService } from '../services/userService.ts'
import { UserController } from '../controllers/userController.ts'
import { validateRequest } from '../middlewares/validateMiddleware.ts'
import { authenticateJWT, authorizeRoles } from '../middlewares/authMiddleware.ts'
import { getUsersQuerySchema, updateUserSchema, toggleUserStatusSchema } from '../schemas/userSchema.ts'
import { registerSchema } from '../schemas/authSchema.ts'

const router = Router()

const userRepo = new UserRepository(pool)
const userService = new UserService(userRepo)
const userController = new UserController(userService)

router.use(authenticateJWT)
router.use(authorizeRoles('SUPER_ADMIN', 'ADMIN_TRAVEL_KP'))

// 🟢 GET /api/users
router.get('/', validateRequest(getUsersQuerySchema, 'query'), userController.getAll)

// 🟢 POST /api/users (Pindahan dari auth/register)
router.post('/', validateRequest(registerSchema), userController.create)

// 🟢 PUT /api/users/:id
router.put('/:id', validateRequest(updateUserSchema), userController.update)

// 🟢 PATCH /api/users/:id/status
router.patch('/:id/status', validateRequest(toggleUserStatusSchema), userController.toggleStatus)

export default router