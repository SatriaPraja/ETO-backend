import { Router } from "express";
import { Pool } from "pg";
import { BudgetRepository } from "../repositories/budgetRepository.ts";
import { BudgetService } from "../services/budgetService.ts";
import { BudgetController } from "../controllers/budgetController.ts";
import { authenticateJWT, authorizeRoles } from "../middlewares/authMiddleware.ts";

export function createBudgetRouter(pool: Pool): Router {
  const router = Router();

  // Dependency Injection
  const repository = new BudgetRepository(pool);
  const service = new BudgetService(repository);
  const controller = new BudgetController(service);

  // 🔒 Middleware Proteksi: Hanya ASDEP_KEUANGAN dan SUPER_ADMIN yang diizinkan
  const budgetAuth = [
    authenticateJWT,
    authorizeRoles("ASDEP_KEUANGAN", "SUPER_ADMIN"),
  ];    

  // Stats KPI Anggaran
  router.get("/stats", budgetAuth, controller.getKpiStats);

  // CRUD Operations Mata Anggaran (MAK)
  router.get("/", budgetAuth, controller.getBudgets);
  router.get("/:id", budgetAuth, controller.getBudgetById);
  router.post("/", budgetAuth, controller.createBudget);
  router.put("/:id", budgetAuth, controller.updateBudget);
  router.delete("/:id", budgetAuth, controller.deleteBudget);

  return router;
}