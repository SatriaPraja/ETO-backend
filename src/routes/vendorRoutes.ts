import { Router } from "express";
import { Pool } from "pg";
import { VendorRepository } from "../repositories/vendorRepository";
import { VendorService } from "../services/VendorService";
import { VendorController } from "../controllers/vendorController";

import { authenticateJWT, authorizeRoles } from "../middlewares/authMiddleware";

export function createVendorRouter(pool: Pool): Router {
  const router = Router();

  const vendorRepo = new VendorRepository(pool);
  const vendorService = new VendorService(vendorRepo);
  const vendorController = new VendorController(vendorService);

  const adminAuth = [
    authenticateJWT,
    authorizeRoles("ADMIN_TRAVEL_KP", "SUPER_ADMIN"),
  ];

  // GET /api/v1/master/vendors (Stats KPI + List Data)
  router.get("/", adminAuth, vendorController.getVendors);

  // GET /api/v1/master/vendors/:id
  router.get("/:id", adminAuth, vendorController.getVendorById);

  // POST /api/v1/master/vendors
  router.post("/", adminAuth, vendorController.createVendor);

  // PUT /api/v1/master/vendors/:id
  router.put("/:id", adminAuth, vendorController.updateVendor);

  // DELETE /api/v1/master/vendors/:id
  router.delete("/:id", adminAuth, vendorController.deleteVendor);

  return router;
}