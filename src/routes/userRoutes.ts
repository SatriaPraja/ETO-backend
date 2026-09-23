import { Router } from "express";
import { pool } from "../config/database.ts";
import { UserRepository } from "../repositories/userRepository.ts";
import { UserService } from "../services/userService.ts";
import { UserController } from "../controllers/userController.ts";
import { validateRequest } from "../middlewares/validateMiddleware.ts";
import {
  authenticateJWT,
  authorizeRoles,
} from "../middlewares/authMiddleware.ts";
import {
  getUsersQuerySchema,
  updateUserSchema,
  toggleUserStatusSchema,
  createUserSchema,
} from "../schemas/userSchema.ts";

const router = Router();

const userRepo = new UserRepository(pool);
const userService = new UserService(userRepo);
const userController = new UserController(userService);

// 🔒 1. Proteksi Autentikasi JWT untuk semua endpoint di router ini
router.use(authenticateJWT);

// 🟢 2. Endpoint LOV Personel HCIS (Bisa diakses oleh OFFICIAL_BOOKER, SUPER_ADMIN, dll.)
router.get("/employees", userController.getEmployees);

// ----------------------------------------------------------------------
// 🔒 3. Middleware Khusus Manajemen Admin (Hanya SUPER_ADMIN & ADMIN_TRAVEL_KP)
// ----------------------------------------------------------------------
router.use(authorizeRoles("SUPER_ADMIN", "ADMIN_TRAVEL_KP"));

// GET /api/users (Daftar User Manajemen Admin)
router.get(
  "/",
  validateRequest(getUsersQuerySchema, "query"),
  userController.getAll,
);

// POST /api/users (Tambah User Baru)
router.post("/", validateRequest(createUserSchema), userController.create);

// PUT /api/users/:id (Update Profile & Role User)
router.put("/:id", validateRequest(updateUserSchema), userController.update);

// PATCH /api/users/:id/status (Toggle Status Active / Inactive)
router.patch(
  "/:id/status",
  validateRequest(toggleUserStatusSchema),
  userController.toggleStatus,
);

export default router;
